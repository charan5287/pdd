from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
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
from jose import JWTError, jwt

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

        # Models ordered by reliability — valid Gemini vision-capable models only
        model_names = [
            'gemini-2.0-flash',        # Most stable, always available
            'gemini-2.0-flash-lite',   # Lightweight fallback
            'gemini-2.5-flash',        # Latest stable generation (may not be in all regions)
            'gemini-1.5-flash',        # Reliable older generation
            'gemini-1.5-pro',          # High quality, slower
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

@router.post("/scan")
async def scan_prescription(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    auth: HTTPAuthorizationCredentials = Depends(security)
):
    # Try to get user_id from token if provided
    user_id = 1 # Default
    if auth:
        try:
            payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("id", 1)
        except JWTError:
            pass

    print(f"DEBUG: Received scan request for file: {file.filename}, User ID: {user_id}")
    # Sanitize filename to avoid path traversal or invalid characters
    safe_filename = os.path.basename(file.filename or "prescription.jpg")
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as write_err:
        print(f"ERROR: Could not write uploaded file: {write_err}")
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {write_err}")
    
    # Try Real Gemini OCR
    detected_medicines = await gemini_ocr(file_path)
    print(f"DEBUG: gemini_ocr result: {detected_medicines}")
    
    # Check if scanning failed
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
    
    message = "Prescription analyzed successfully with Gemini AI."
    is_mock = False
    
    # Save to database (best-effort — don't fail the scan if DB write fails)
    prescription_id = None
    try:
        db_prescription = models.Prescription(
            user_id=user_id,
            image_url=file_path,
            detected_medicines=json.dumps(detected_medicines)
        )
        db.add(db_prescription)
        db.commit()
        db.refresh(db_prescription)
        prescription_id = db_prescription.id
        print(f"DEBUG: Prescription saved to DB with id={prescription_id}")
    except Exception as db_err:
        print(f"WARNING: Could not save prescription to DB (non-fatal): {db_err}")
        db.rollback()
    
    return {
        "id": prescription_id,
        "filename": file.filename,
        "medicines": detected_medicines,
        "status": "success",
        "message": message,
        "is_demo": is_mock
    }


@router.get("/history/{user_id}")
def get_prescription_history(user_id: int, db: Session = Depends(get_db)):
    prescriptions = db.query(models.Prescription).filter(models.Prescription.user_id == user_id).all()
    return [{
        "id": p.id,
        "image_url": p.image_url,
        "medicines": json.loads(p.detected_medicines),
        "created_at": p.created_at
    } for p in prescriptions]
