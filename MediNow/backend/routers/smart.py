from fastapi import APIRouter, Depends, HTTPException
import asyncio
from sqlalchemy.orm import Session
from database import get_db
from models import models
import datetime
import math
import os
import google.generativeai as genai

router = APIRouter(prefix="/smart", tags=["Smart Health Features"])

# ─── Refill & Expiry ─────────────────────────────────────────────────────────

@router.get("/refills/{user_id}")
def check_refills(user_id: int, db: Session = Depends(get_db)):
    """Find medicines with less than 5 days of supply and suggest an order."""
    user_meds = db.query(models.UserMedicine).filter(models.UserMedicine.user_id == user_id).all()
    to_refill = []
    for med in user_meds:
        dosage = max(med.daily_dosage, 1)
        days_left = med.quantity_remaining / dosage
        if days_left < 5:
            # Suggest a standard pack size of 10 or 30
            suggested_qty = 10 if med.daily_dosage <= 1 else 30
            to_refill.append({
                "medicine_name": med.medicine_name,
                "quantity_remaining": med.quantity_remaining,
                "days_left": round(days_left, 1),
                "suggested_quantity": suggested_qty,
                "message": f"Running low! ~{round(days_left, 1)} days supply left.",
                "action": "Order Refill"
            })
    return {"to_refill": to_refill}


@router.get("/expiries/{user_id}")
def check_expiries(user_id: int, db: Session = Depends(get_db)):
    """Find medicines expiring within the next 30 days."""
    today = datetime.datetime.utcnow()
    next_month = today + datetime.timedelta(days=30)
    expiring_meds = db.query(models.UserMedicine).filter(
        models.UserMedicine.user_id == user_id,
        models.UserMedicine.expiry_date <= next_month,
        models.UserMedicine.expiry_date >= today
    ).all()
    return [{
        "medicine_name": m.medicine_name,
        "expiry_date": m.expiry_date,
        "days_until_expiry": (m.expiry_date - today).days
    } for m in expiring_meds]


@router.get("/inventory/{user_id}")
def get_inventory(user_id: int, db: Session = Depends(get_db)):
    """Fetch user's current medicine inventory."""
    meds = db.query(models.UserMedicine).filter(models.UserMedicine.user_id == user_id).all()
    return [{
        "id": m.id,
        "medicine_name": m.medicine_name,
        "quantity_remaining": m.quantity_remaining,
        "daily_dosage": m.daily_dosage,
        "expiry_date": m.expiry_date,
        "last_updated": m.last_updated,
    } for m in meds]


@router.post("/add")
def add_to_inventory(data: dict, db: Session = Depends(get_db)):
    """Add a medicine to user's inventory."""
    user_id = data.get('user_id')
    medicine_name = data.get('medicine_name')
    quantity = data.get('quantity', 0)
    if not user_id or not medicine_name:
        raise HTTPException(status_code=400, detail="Missing user_id or medicine_name")

    expiry = datetime.datetime.utcnow() + datetime.timedelta(days=365)
    if data.get('expiry_date'):
        try:
            expiry = datetime.datetime.fromisoformat(data['expiry_date'].replace('Z', '+00:00'))
        except:
            pass

    existing = db.query(models.UserMedicine).filter(
        models.UserMedicine.user_id == user_id,
        models.UserMedicine.medicine_name == medicine_name
    ).first()

    if existing:
        existing.quantity_remaining += quantity
        existing.last_updated = datetime.datetime.utcnow()
        if data.get('daily_dosage'):
            existing.daily_dosage = data['daily_dosage']
    else:
        new_med = models.UserMedicine(
            user_id=user_id,
            medicine_name=medicine_name,
            quantity_remaining=quantity,
            expiry_date=expiry,
            daily_dosage=data.get('daily_dosage', 1)
        )
        db.add(new_med)
    db.commit()
    return {"status": "success", "medicine": medicine_name}


@router.post("/take/{user_id}/{medicine_name}")
def take_medicine(user_id: int, medicine_name: str, db: Session = Depends(get_db)):
    """Record taking a dose, decrement inventory, and log it."""
    med = db.query(models.UserMedicine).filter(
        models.UserMedicine.user_id == user_id,
        models.UserMedicine.medicine_name == medicine_name
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found in your inventory")

    if med.quantity_remaining > 0:
        med.quantity_remaining -= 1
        med.last_updated = datetime.datetime.utcnow()

    # Log the dose event
    log = models.DoseLog(
        user_id=user_id,
        medicine_name=medicine_name,
        taken_at=datetime.datetime.utcnow(),
        was_skipped=False
    )
    db.add(log)
    db.commit()
    return {"message": "Dose recorded", "remaining": med.quantity_remaining}


# ─── Dose Logging ────────────────────────────────────────────────────────────

@router.post("/log-dose")
def log_dose(data: dict, db: Session = Depends(get_db)):
    """Log a dose event (taken or skipped)."""
    user_id = data.get("user_id")
    medicine_name = data.get("medicine_name")
    was_skipped = data.get("was_skipped", False)

    if not user_id or not medicine_name:
        raise HTTPException(status_code=400, detail="Missing user_id or medicine_name")

    # If taken (not skipped), decrement inventory too
    if not was_skipped:
        med = db.query(models.UserMedicine).filter(
            models.UserMedicine.user_id == user_id,
            models.UserMedicine.medicine_name == medicine_name
        ).first()
        if med and med.quantity_remaining > 0:
            med.quantity_remaining -= 1
            med.last_updated = datetime.datetime.utcnow()

    log = models.DoseLog(
        user_id=user_id,
        medicine_name=medicine_name,
        taken_at=datetime.datetime.utcnow(),
        was_skipped=was_skipped,
        scheduled_time=data.get("scheduled_time")
    )
    db.add(log)
    db.commit()
    return {"status": "logged", "skipped": was_skipped}


@router.post("/health-log")
def save_health_log(data: dict, db: Session = Depends(get_db)):
    """Save a symptom or side effect health log."""
    user_id = data.get("user_id")
    symptom = data.get("symptom")
    severity = data.get("severity", "Low")
    notes = data.get("notes")
    
    if not user_id or not symptom:
        raise HTTPException(status_code=400, detail="Missing user_id or symptom")
        
    log = models.HealthLog(
        user_id=user_id,
        symptom=symptom,
        severity=severity,
        notes=notes
    )
    db.add(log)
    db.commit()
    return {"status": "success", "id": log.id}


@router.get("/health-logs/{user_id}")
def get_health_logs(user_id: int, db: Session = Depends(get_db)):
    """Fetch health logs (symptoms) for a user."""
    logs = db.query(models.HealthLog).filter(
        models.HealthLog.user_id == user_id
    ).order_by(models.HealthLog.timestamp.desc()).limit(20).all()
    
    return [{
        "id": l.id,
        "symptom": l.symptom,
        "severity": l.severity,
        "notes": l.notes,
        "timestamp": l.timestamp
    } for l in logs]


# ─── Adherence Analytics ─────────────────────────────────────────────────────

async def _generate_insights(logs: list, score: float, db: Session, user_id: int) -> list:
    """Generate behavioral AI insight strings using Gemini."""
    if not logs:
        return ["Start tracking your doses to receive personalized AI insights."]

    api_key = os.environ.get("GEMINI_API_KEY", "")
    invalid_keys = ["", "your_gemini_api_key_here", "PASTE_YOUR_KEY_HERE", "YOUR_API_KEY"]
    
    if api_key in invalid_keys:
        return ["AI Insights currently unavailable. Please add a valid API key."]

    try:
        # Prepare data for AI
        log_data = []
        for l in logs:
            log_data.append({
                "medicine": l.medicine_name,
                "time": l.taken_at.strftime("%Y-%m-%d %H:%M"),
                "status": "Skipped" if l.was_skipped else "Taken"
            })
        
        genai.configure(api_key=api_key)
        
        # Use valid Gemini models (verified available)
        model_names = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-2.5-flash',
            'gemini-1.5-flash',
        ]
        
        prompt = f"""
        Analyze these medication adherence logs for a patient:
        - Current Adherence Score: {score}%
        - Recent Logs (last 30 days): {log_data[:20]}
        
        TASK: Provide 3-4 concise, professional, and empathetic 'AI Insights' (one sentence each).
        Focus on:
        1. Identifying patterns (e.g., "You tend to miss doses on weekends").
        2. Encouragement (e.g., "Great streak on your morning meds!").
        3. Practical tips (e.g., "Try placing your evening meds near your bedside").
        
        Return ONLY a JSON list of strings. No markdown.
        """
        
        response = None
        for name in model_names:
            try:
                print(f"DEBUG: Attempting AI Insights with model: {name}")
                model = genai.GenerativeModel(model_name=name)
                response = await asyncio.to_thread(model.generate_content, prompt)
                if response and response.text:
                    print(f"DEBUG: Successfully generated insights using model: {name}")
                    break
            except Exception as e:
                print(f"DEBUG: Model {name} insights generation failed: {e}")
                continue
                
        if not response:
            return ["AI Insights currently unavailable. Please check your AI configuration."]
        
        import json
        import re
        text = response.text.strip()
        # Clean JSON
        if text.startswith("```"):
            text = re.sub(r'```json\n?|```', '', text)
        
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group())[:4]
        return ["Your adherence is being monitored. Keep up the consistency!"]
    except Exception as e:
        print(f"Insight generation error: {e}")
        return ["AI analysis in progress. Check back soon for deeper insights."]

async def _compute_adherence(user_id: int, db: Session) -> dict:
    """
    Core adherence algorithm.
    Score = (taken_doses / total_logged_doses) * 100 over last 30 days.
    If no logs, simulate based on inventory age.
    """
    today = datetime.datetime.utcnow()
    thirty_days_ago = today - datetime.timedelta(days=30)

    logs = db.query(models.DoseLog).filter(
        models.DoseLog.user_id == user_id,
        models.DoseLog.taken_at >= thirty_days_ago
    ).all()

    # If no logs, compute rough estimate from inventory
    if not logs:
        meds = db.query(models.UserMedicine).filter(
            models.UserMedicine.user_id == user_id
        ).all()
        total_expected = sum(m.daily_dosage * 30 for m in meds)
        total_taken = sum(max(0, m.daily_dosage * 30 - m.quantity_remaining) for m in meds)
        if total_expected > 0:
            score = min(100, round((total_taken / total_expected) * 100, 1))
        else:
            score = 0.0
        # Build empty weekly data
        weekly = _build_weekly_from_logs([])
    else:
        taken = [l for l in logs if not l.was_skipped]
        score = round((len(taken) / len(logs)) * 100, 1)
        weekly = _build_weekly_from_logs(logs)

    # Risk classification
    if score >= 80:
        risk_level = "Low"
        risk_color = "green"
    elif score >= 60:
        risk_level = "Medium"
        risk_color = "orange"
    else:
        risk_level = "High"
        risk_color = "red"

    # AI behavioral insights (ASYNCHRONOUS)
    insights = await _generate_insights(logs, score, db, user_id)

    # Medicine-level breakdown
    meds = db.query(models.UserMedicine).filter(
        models.UserMedicine.user_id == user_id
    ).all()

    medicine_scores = []
    for med in meds:
        med_logs = [l for l in logs if l.medicine_name == med.medicine_name]
        if med_logs:
            taken_count = len([l for l in med_logs if not l.was_skipped])
            med_score = round((taken_count / len(med_logs)) * 100, 1)
        else:
            med_score = 0.0
        medicine_scores.append({
            "name": med.medicine_name,
            "score": med_score,
            "quantity_remaining": med.quantity_remaining,
            "days_left": round(med.quantity_remaining / max(med.daily_dosage, 1), 1)
        })

    return {
        "adherence_score": score,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "insights": insights,
        "weekly_data": weekly,
        "total_doses_logged": len(logs),
        "doses_taken": len([l for l in logs if not l.was_skipped]),
        "doses_skipped": len([l for l in logs if l.was_skipped]),
        "medicine_scores": medicine_scores,
    }


def _build_weekly_from_logs(logs: list) -> list:
    """Build 7-day adherence percentage array (Mon–Sun)."""
    today = datetime.datetime.utcnow()
    weekly = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + datetime.timedelta(days=1)
        day_logs = [l for l in logs if day_start <= l.taken_at < day_end]
        if day_logs:
            taken = len([l for l in day_logs if not l.was_skipped])
            pct = round((taken / len(day_logs)) * 100, 1)
        else:
            pct = 0.0
        weekly.append({
            "day": day.strftime("%a"),
            "date": day.strftime("%Y-%m-%d"),
            "percentage": pct,
            "taken": len([l for l in day_logs if not l.was_skipped]) if day_logs else 0,
            "total": len(day_logs)
        })
    return weekly


@router.get("/adherence/{user_id}")
async def get_adherence(user_id: int, db: Session = Depends(get_db)):
    """Full adherence analytics: score, risk, insights, weekly chart data."""
    return await _compute_adherence(user_id, db)


# ─── Reminders ───────────────────────────────────────────────────────────────

@router.get("/reminders/{user_id}")
def get_reminders(user_id: int, db: Session = Depends(get_db)):
    """Fetch all active reminders for a user."""
    reminders = db.query(models.Reminder).filter(
        models.Reminder.user_id == user_id
    ).all()
    return [{
        "id": r.id,
        "medicine_name": r.medicine_name,
        "dosage": r.dosage,
        "time": r.time,
        "is_active": r.is_active,
        "last_taken": r.last_taken
    } for r in reminders]


@router.post("/reminders")
def save_reminder(data: dict, db: Session = Depends(get_db)):
    """Create or update a reminder."""
    user_id = data.get("user_id")
    medicine_name = data.get("medicine_name")
    if not user_id or not medicine_name:
        raise HTTPException(status_code=400, detail="Missing user_id or medicine_name")

    existing = db.query(models.Reminder).filter(
        models.Reminder.user_id == user_id,
        models.Reminder.medicine_name == medicine_name,
        models.Reminder.time == data.get("time", "08:00")
    ).first()

    if existing:
        existing.dosage = data.get("dosage", existing.dosage)
        existing.is_active = data.get("is_active", existing.is_active)
    else:
        reminder = models.Reminder(
            user_id=user_id,
            medicine_name=medicine_name,
            dosage=data.get("dosage", "1 dose"),
            time=data.get("time", "08:00"),
            is_active=True
        )
        db.add(reminder)

    db.commit()
    return {"status": "saved"}


@router.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Delete a reminder."""
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return {"status": "deleted"}


@router.patch("/reminders/{reminder_id}/toggle")
def toggle_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Toggle a reminder active/inactive."""
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.is_active = not reminder.is_active
    db.commit()
    return {"id": reminder_id, "is_active": reminder.is_active}
