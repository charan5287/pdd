from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import models
import shutil
import os
import google.generativeai as genai
import json
import re
import asyncio
import datetime
from jose import JWTError, jwt
from services.realtime_db_service import sync_to_realtime_db, sync_user_data_to_realtime_db

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-medinow-2024")
ALGORITHM = "HS256"

router = APIRouter(prefix="/prescription", tags=["Prescription Management"])
security = HTTPBearer(auto_error=False)

UPLOAD_DIR = "uploads/prescriptions"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def gemini_ocr(file_path: str):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    invalid_keys = ["", "your_gemini_api_key_here", "PASTE_YOUR_KEY_HERE", "YOUR_API_KEY"]
    
    if api_key in invalid_keys:
        print("DEBUG: Gemini API Key is a placeholder. Skipping real OCR.")
        return None
    
    try:
        print(f"DEBUG: Attempting Gemini OCR with key starting with: {api_key[:5]}...")
        genai.configure(api_key=api_key)
        
        # System instructions to set the persona and extraction rules
        system_instructions = """
        You are a World-Class Medical OCR and Prescription Analysis Specialist. 
        Your task is to analyze physical prescription papers with surgical precision, 
        specifically focusing on deciphering messy, handwritten medical scripts.

        EXTRACTION PROTOCOLS:
        1. DECIPHER HANDWRITING: Use your advanced vision capabilities to read overlapping, cursive, or faint handwriting common in medical prescriptions.
        2. EXHAUSTIVE SCAN: Scan the entire document. Do not miss any medicine mentioned. If there are 10 medicines, extract all 10.
        3. BRAND & GENERIC: Capture the Brand Name and look for the Generic/Salt name if mentioned.
        4. FORM DETECTION: Identify: Tablet (Tab/T), Capsule (Cap/C), Syrup (Syp), Injection (Inj), Ointment (Oint), Drop, Spray, or Cream.
        5. DOSAGE PRECISION: Extract the exact strength (e.g., '650mg', '40mg', '10ml', '500mcg').
        6. QUANTITY: Extract the total count (e.g., '15 tablets', '2 strips', '1 bottle').
        7. SCHEDULE/FREQUENCY: 
           - '1-0-1' or 'BD' -> Twice a day
           - '1-1-1' or 'TDS' -> Three times a day
           - '1-0-0' or 'OD' -> Once a day
           - '0-0-1' or 'HS' -> At bedtime
        8. CLEANING: Provide a 'display_name' that is readable and professional (e.g., 'Dolo 650mg Tablet').
        9. INTENT: Try to infer the 'instructions' or 'purpose' from the context if possible (e.g., 'For fever').
        10. NO LIMITS: Never limit yourself to a specific number of medicines. Extract everything you see.
        """
        
        # Read image bytes directly instead of uploading to avoid SSL EOF issues
        with open(file_path, "rb") as f:
            img_bytes = f.read()
            
        mime_type = "image/jpeg"
        if file_path.lower().endswith(".png"):
            mime_type = "image/png"
        elif file_path.lower().endswith(".webp"):
            mime_type = "image/webp"
            
        img = {
            "mime_type": mime_type,
            "data": img_bytes
        }
        
        prompt = """
        Analyze this prescription image with absolute deep-scan precision. 
        Extract ALL medicines written by the doctor — do not miss any.
        
        For each medicine, return these EXACT JSON fields:
        - name: Exact name as written on the paper (e.g., 'Dolo 650').
        - display_name: Professional cleaned name (e.g., 'Dolo 650mg Tablet').
        - dosage: Strength per unit (e.g., '500mg', '40mg').
        - frequency: Human-readable schedule (e.g., 'Twice a day', 'Once daily at night', 'Three times a day').
        - frequency_per_day: Integer — how many times per day (1, 2, or 3).
        - timings: JSON array of 24-hour time strings when to take (e.g., ["08:00", "20:00"] for twice daily, ["08:00"] for once, ["08:00", "14:00", "20:00"] for thrice).
        - duration_days: Integer number of days to take (default 30 if not specified).
        - instructions: Timing context (e.g., 'After meals', 'Before food', 'At bedtime').
        - purpose: Clinical reason inferred from medicine name if not written (e.g., 'For Fever', 'Antibiotic').
        
        CRITICAL RULES:
        - Return ONLY a valid JSON array. No markdown, no explanation.
        - If NO medicines found, return [].
        - frequency_per_day MUST be an integer (1, 2, or 3).
        - timings MUST be an array of HH:MM strings matching frequency_per_day count.
        - duration_days MUST be an integer.
        
        Example: [{"name": "Telma 40", "display_name": "Telma 40mg Tablet", "dosage": "40mg", "frequency": "Once daily", "frequency_per_day": 1, "timings": ["08:00"], "duration_days": 30, "instructions": "After breakfast", "purpose": "For Blood Pressure"}]
        """

        model_names = [
            'gemini-3.5-flash-lite',
            'gemini-3.6-flash',
            'gemini-flash-latest',
            'gemini-flash-lite-latest',
            'gemini-2.5-flash',
            'gemini-3.5-flash',
        ]
        
        response = None
        last_error_str = ""
        
        for name in model_names:
            try:
                print(f"DEBUG: Attempting Gemini OCR with model: {name}")
                model = genai.GenerativeModel(
                    model_name=name,
                    system_instruction=system_instructions
                )
                # 30s timeout per model so a slow model doesn't stall the chain
                response = await asyncio.wait_for(
                    asyncio.to_thread(model.generate_content, [prompt, img]),
                    timeout=30.0
                )
                if response and response.text:
                    print(f"DEBUG: Successfully generated content using model: {name}")
                    break
            except asyncio.TimeoutError:
                print(f"DEBUG: Model {name} timed out after 45s, trying next model...")
                last_error_str = "TimeoutError"
                continue
            except Exception as e:
                last_error_str = str(e)
                print(f"DEBUG: Model {name} generation failed: {last_error_str}")
                continue
        
        if not response:
            print("ERROR: All Gemini models failed to generate content.")
            if 'RESOURCE_EXHAUSTED' in last_error_str or '429' in last_error_str or 'quota' in last_error_str.lower():
                return 'QUOTA_EXCEEDED'
            return None
        
        # Extract JSON
        text = response.text.strip()
        # Remove markdown formatting if present
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return None
    except Exception as e:
        err_str = str(e)
        print(f"ERROR: Gemini OCR execution failed: {err_str}")
        # Distinguish quota errors from other errors
        if 'RESOURCE_EXHAUSTED' in err_str or '429' in err_str or 'quota' in err_str.lower():
            return 'QUOTA_EXCEEDED'
        return None


    
async def analyze_drug_interactions_and_validations(detected_medicines: list, user_id: int, db: Session) -> list:
    """
    Analyzes intra-prescription interactions, inter-prescription interactions with existing inventory,
    and performs clinical dosage safety validation.
    """
    alerts = []
    med_names = [m.get("display_name") or m.get("name", "") for m in detected_medicines if m.get("name")]
    
    # 1. Rule-based interaction checks for common pairs
    name_str = " ".join([n.lower() for n in med_names])
    
    if ("dolo" in name_str or "paracetamol" in name_str or "combiflam" in name_str) and ("aspirin" in name_str or "ibuprofen" in name_str):
        alerts.append({
            "type": "interaction",
            "severity": "Moderate",
            "title": "Dual Painkiller Interaction",
            "description": "Combining multiple analgesics/NSAIDs (e.g. Paracetamol & Ibuprofen) increases risk of gastric discomfort."
        })
        
    if ("azithral" in name_str or "azithromycin" in name_str or "augmentin" in name_str) and ("antacid" in name_str or "pan 40" in name_str or "omez" in name_str):
        alerts.append({
            "type": "interaction",
            "severity": "Low",
            "title": "Antibiotic & Antacid Timing",
            "description": "Antacids can reduce antibiotic absorption. Separate administration times by at least 2 hours."
        })

    # 2. Check against user's current inventory
    user_inventory = db.query(models.UserMedicine).filter(models.UserMedicine.user_id == user_id).all()
    existing_med_names = [m.medicine_name.lower() for m in user_inventory]
    
    for med in med_names:
        med_lower = med.lower()
        for ext in existing_med_names:
            if ext and (ext in med_lower or med_lower in ext):
                alerts.append({
                    "type": "duplicate",
                    "severity": "High",
                    "title": f"Duplicate Active Inventory: {med}",
                    "description": f"You already have '{med}' in active inventory. Verify dosing before taking."
                })
                break

    # 3. Dosage Safety Validation
    for med in detected_medicines:
        freq = med.get("frequency_per_day", 1)
        if isinstance(freq, int) and freq > 4:
            alerts.append({
                "type": "validation",
                "severity": "High",
                "title": f"High Dosing Frequency Alert: {med.get('display_name', med.get('name'))}",
                "description": f"Specified frequency ({freq} doses/day) is unusually high. Pharmacist verification recommended."
            })
            
    # 4. Optional Gemini AI Deep Interaction Analysis
    api_key = os.environ.get("GEMINI_API_KEY", "")
    invalid_keys = ["", "your_gemini_api_key_here", "PASTE_YOUR_KEY_HERE", "YOUR_API_KEY"]
    if api_key not in invalid_keys and len(med_names) >= 2:
        try:
            prompt = f"""
            Analyze these prescribed medications for potential Drug-Drug Interactions (DDI) or safety contraindications:
            Medications: {med_names}
            
            Return a JSON list of alert objects (maximum 2 most critical warnings).
            Each object MUST have keys:
            - type: "interaction" or "warning"
            - severity: "High", "Moderate", or "Low"
            - title: Short heading (e.g. "DDI: Drug A + Drug B")
            - description: 1-2 sentence explanation.
            
            Return ONLY the JSON list. If no severe interactions, return [].
            """
            from services.gemini_service import generate_gemini_content
            res = await generate_gemini_content(prompt)
            if res:
                text = res.strip()
                if text.startswith("```"):
                    text = re.sub(r'```json\n?|```', '', text)
                match = re.search(r'\[.*\]', text, re.DOTALL)
                if match:
                    ai_alerts = json.loads(match.group())
                    for ai_a in ai_alerts:
                        if not any(a.get("title") == ai_a.get("title") for a in alerts):
                            alerts.append(ai_a)
        except Exception as e:
            print(f"DEBUG: AI DDI check failed: {e}")

    if not alerts:
        alerts.append({
            "type": "validation",
            "severity": "Safe",
            "title": "Clinical Safety Check Passed",
            "description": "No major drug-drug interactions or dangerous dosage anomalies detected."
        })

    return alerts


@router.post("/scan")
async def scan_prescription(
    file: UploadFile = File(...), 
    user_id: int = Form(1),
    db: Session = Depends(get_db),
    auth: HTTPAuthorizationCredentials = Depends(security)
):
    # Try to get user_id from token if provided, fallback to Form user_id
    if auth:
        try:
            payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("id", user_id)
        except JWTError:
            pass

    print(f"DEBUG: Received scan request for file: {file.filename}, User ID: {user_id}")
    safe_filename = os.path.basename(file.filename or "prescription.jpg")
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as write_err:
        print(f"ERROR: Could not write uploaded file: {write_err}")
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {write_err}")
    
    detected_medicines = await gemini_ocr(file_path)
    print(f"DEBUG: gemini_ocr result: {detected_medicines}")
    
    if detected_medicines is None or detected_medicines == 'QUOTA_EXCEEDED':
        api_key = os.environ.get("GEMINI_API_KEY", "")
        invalid_keys = ["", "your_gemini_api_key_here", "PASTE_YOUR_KEY_HERE", "YOUR_API_KEY"]
        
        if detected_medicines == 'QUOTA_EXCEEDED':
            raise HTTPException(
                status_code=503,
                detail="AI scanning quota exceeded. The free API limit has been reached. Please wait a minute and try again."
            )
        elif api_key in invalid_keys or len(api_key) < 15:
            raise HTTPException(
                status_code=503, 
                detail="Real-time scanning is disabled. Please configure a valid GEMINI_API_KEY in the backend environment."
            )
        else:
            raise HTTPException(
                status_code=500, 
                detail="Scanning failed due to an internal AI error or poor image quality. Please ensure the image is clear and try again."
            )

    if not detected_medicines:
        return {
            "id": None,
            "filename": file.filename,
            "medicines": [],
            "status": "partial",
            "message": "Scanning complete, but no medicines were detected in the image. Please ensure the handwriting is legible.",
            "is_demo": False
        }
    
    # Perform Drug Interaction & Clinical Validation Check
    interaction_alerts = await analyze_drug_interactions_and_validations(detected_medicines, user_id, db)

    message = "Prescription analyzed successfully with Gemini AI & Clinical Safety Checks."
    is_mock = False
    
    image_url = file_path

    prescription_id = None
    verification_status = "pending_review"
    try:
        db_prescription = models.Prescription(
            user_id=user_id,
            image_url=image_url,
            detected_medicines=json.dumps(detected_medicines),
            verification_status=verification_status,
            drug_interactions=json.dumps(interaction_alerts)
        )
        db.add(db_prescription)
        db.commit()
        db.refresh(db_prescription)
        prescription_id = db_prescription.id
        print(f"DEBUG: Prescription saved to DB with id={prescription_id}, image_url={image_url}")
        
        sync_to_realtime_db("prescriptions", prescription_id, {
            "id": prescription_id,
            "user_id": user_id,
            "image_url": image_url,
            "detected_medicines": detected_medicines,
            "verification_status": verification_status,
            "drug_interactions": interaction_alerts,
            "created_at": db_prescription.created_at.isoformat() if db_prescription.created_at else None
        })
        sync_user_data_to_realtime_db(user_id, db)
    except Exception as db_err:
        print(f"WARNING: Could not save prescription to DB (non-fatal): {db_err}")
        db.rollback()
    
    return {
        "id": prescription_id,
        "filename": file.filename,
        "medicines": detected_medicines,
        "verification_status": verification_status,
        "drug_interactions": interaction_alerts,
        "status": "success",
        "message": message,
        "is_demo": is_mock
    }


@router.get("/history/{user_id}")
def get_prescription_history(user_id: int, db: Session = Depends(get_db)):
    prescriptions = db.query(models.Prescription).filter(models.Prescription.user_id == user_id).order_by(models.Prescription.created_at.desc()).all()
    results = []
    for p in prescriptions:
        try:
            meds = json.loads(p.detected_medicines) if p.detected_medicines else []
        except:
            meds = []
        try:
            interactions = json.loads(p.drug_interactions) if p.drug_interactions else []
        except:
            interactions = []
        results.append({
            "id": p.id,
            "image_url": p.image_url,
            "medicines": meds,
            "verification_status": p.verification_status or "pending_review",
            "pharmacist_notes": p.pharmacist_notes or "",
            "drug_interactions": interactions,
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return results


@router.get("/pending-reviews")
def get_pending_prescriptions_for_pharmacist(db: Session = Depends(get_db)):
    """Fetch all prescriptions for the Pharmacist Verification Queue."""
    prescriptions = db.query(models.Prescription).order_by(models.Prescription.created_at.desc()).all()
    results = []
    for p in prescriptions:
        user = db.query(models.User).filter(models.User.id == p.user_id).first()
        try:
            meds = json.loads(p.detected_medicines) if p.detected_medicines else []
        except:
            meds = []
        try:
            interactions = json.loads(p.drug_interactions) if p.drug_interactions else []
        except:
            interactions = []
        results.append({
            "id": p.id,
            "user_id": p.user_id,
            "patient_name": user.full_name if user else f"Patient #{p.user_id}",
            "patient_phone": user.phone if user else "",
            "image_url": p.image_url,
            "medicines": meds,
            "verification_status": p.verification_status or "pending_review",
            "pharmacist_notes": p.pharmacist_notes or "",
            "drug_interactions": interactions,
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return results


@router.post("/{prescription_id}/verify")
def verify_prescription_by_pharmacist(
    prescription_id: int, 
    data: dict, 
    db: Session = Depends(get_db)
):
    """
    Endpoint for Pharmacists to approve or flag a prescription.
    data payload:
    {
      "status": "verified" | "flagged",
      "notes": "Pharmacist review comments",
      "medicines": [...]  (optional updated list of medicines)
    }
    """
    p = db.query(models.Prescription).filter(models.Prescription.id == prescription_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    new_status = data.get("status", "verified")
    notes = data.get("notes", "")
    updated_meds = data.get("medicines")

    p.verification_status = new_status
    p.pharmacist_notes = notes
    if updated_meds is not None:
        p.detected_medicines = json.dumps(updated_meds)

    db.commit()

    sync_to_realtime_db("prescriptions", p.id, {
        "id": p.id,
        "user_id": p.user_id,
        "verification_status": new_status,
        "pharmacist_notes": notes,
        "detected_medicines": updated_meds if updated_meds is not None else json.loads(p.detected_medicines)
    })
    sync_user_data_to_realtime_db(p.user_id, db)

    return {
        "status": "success",
        "prescription_id": p.id,
        "verification_status": new_status,
        "message": f"Prescription marked as {new_status}."
    }


def normalize_med_name(name: str) -> str:
    if not name:
        return ""
    cleaned = re.sub(r'\b(tablets?|tabs?|capsules?|caps?|syrups?|syps?|injections?|inj|drops?|cream|gel|oint|ointment)\b', '', name, flags=re.IGNORECASE)
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', cleaned)
    return " ".join(cleaned.lower().split())

def normalize_time_str(time_str: str) -> str:
    if not time_str:
        return "08:00"
    time_str = str(time_str).strip()
    try:
        if "AM" in time_str.upper() or "PM" in time_str.upper():
            t = datetime.datetime.strptime(time_str.upper(), "%I:%M %p")
            return t.strftime("%H:%M")
        elif ":" in time_str:
            parts = time_str.split(":")
            h = int(parts[0])
            m = int(parts[1][:2])
            return f"{h:02d}:{m:02d}"
    except Exception:
        pass
    return time_str


@router.post("/sync-to-reminders")
def sync_prescription_to_reminders(data: dict, db: Session = Depends(get_db)):
    """Automatically add all extracted prescription medicines to Reminders and User Inventory with smart deduplication."""
    user_id = data.get("user_id", 1)
    medicines = data.get("medicines", [])
    
    if not medicines:
        raise HTTPException(status_code=400, detail="No medicines provided to sync")

    # Fetch user's existing inventory & reminders once
    existing_inventory = db.query(models.UserMedicine).filter(models.UserMedicine.user_id == user_id).all()
    existing_reminders = db.query(models.Reminder).filter(models.Reminder.user_id == user_id).all()

    added_reminders = []
    for med in medicines:
        med_name = med.get("display_name") or med.get("name") or "Medicine"
        dosage = med.get("dosage", "1 tablet")
        timings = med.get("timings", ["08:00"])
        duration = med.get("duration_days", 30)
        norm_name = normalize_med_name(med_name)

        # 1. Add / Update User Inventory
        expiry = datetime.datetime.utcnow() + datetime.timedelta(days=365)
        existing_med = next(
            (m for m in existing_inventory if normalize_med_name(m.medicine_name) == norm_name or m.medicine_name.lower() == med_name.lower()),
            None
        )

        if existing_med:
            existing_med.quantity_remaining += (duration * len(timings))
            existing_med.last_updated = datetime.datetime.utcnow()
            if len(timings) > 0:
                existing_med.daily_dosage = len(timings)
        else:
            new_med = models.UserMedicine(
                user_id=user_id,
                medicine_name=med_name,
                quantity_remaining=duration * len(timings),
                expiry_date=expiry,
                daily_dosage=len(timings)
            )
            db.add(new_med)
            existing_inventory.append(new_med)

        # 2. Add Reminders for each timing (avoiding duplicate slots for same tablet)
        for t in timings:
            t_norm = normalize_time_str(t)
            existing_rem = next(
                (r for r in existing_reminders if (normalize_med_name(r.medicine_name) == norm_name or r.medicine_name.lower() == med_name.lower()) and normalize_time_str(r.time) == t_norm),
                None
            )

            if existing_rem:
                # Update dosage and ensure active
                existing_rem.dosage = dosage
                existing_rem.is_active = True
            else:
                rem = models.Reminder(
                    user_id=user_id,
                    medicine_name=med_name,
                    dosage=dosage,
                    time=t_norm,
                    is_active=True
                )
                db.add(rem)
                existing_reminders.append(rem)
                added_reminders.append(f"{med_name} at {t_norm}")

    db.commit()
    sync_user_data_to_realtime_db(user_id, db)

    return {
        "status": "success",
        "message": f"Successfully synced {len(medicines)} medicines to Reminders & Inventory!",
        "added": added_reminders
    }


