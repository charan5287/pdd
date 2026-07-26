import os
import asyncio
import math
import re
import datetime
from sqlalchemy.orm import Session
from database import get_db
from models import models
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["AI Health Assistant"])

class HistoryMessage(BaseModel):
    role: str
    content: str

class ChatMessage(BaseModel):
    message: str
    history: list[HistoryMessage] = []
    user_id: int | None = None

# ─── Connectivity Fallback (only if API fails) ──────────────────────────────
def connectivity_fallback(text: str) -> str:
    """Minimal fallback for when AI service is unavailable."""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["hi", "hello", "hey", "hii"]):
        return "Hello! I'm your MediNow AI assistant. I'm currently having a bit of trouble connecting to my full medical database, but I'm here to help. How can I assist you today?"
    
    if "emergency" in text_lower or "urgent" in text_lower or "chest pain" in text_lower:
        return "⚠️ **URGENT**: I'm having trouble connecting to my medical systems. If you're having a medical emergency, please call **108** (India) or your local emergency services immediately."
    
    return "I'm currently in a limited mode because I can't reach my medical cloud. I can still chat, but for detailed medical analysis, please check your connection and try again.\n\n*AI only. Consult a doctor.*"

async def get_gemini_response(message: str, history: list[HistoryMessage] = [], user_medicines: list = [], reminders: list = [], prescriptions: list = []) -> str | None:
    """Call Gemini API for intelligent AI response with history and full user medical context."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    invalid_keys = ["", "your_gemini_api_key_here", "PASTE_YOUR_KEY_HERE", "YOUR_API_KEY"]
    
    if api_key in invalid_keys:
        return None
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Build comprehensive medical context
        now = datetime.datetime.now()
        context_str = f"CURRENT SERVER TIME: {now.strftime('%Y-%m-%d %H:%M:%S (%A)')}\n\n"
        
        if user_medicines:
            context_str += "USER'S CURRENT MEDICATIONS (Inventory):\n"
            for m in user_medicines:
                context_str += f"- {m.medicine_name}: {m.quantity_remaining} doses left, {m.daily_dosage} doses/day\n"
            context_str += "\n"

        if reminders:
            context_str += "USER'S ACTIVE REMINDERS (Schedule):\n"
            for r in reminders:
                context_str += f"- {r.medicine_name}: {r.dosage} at {r.time} (Daily)\n"
            context_str += "\n"

        if prescriptions:
            context_str += "RECENT PRESCRIPTION HISTORY:\n"
            import json
            for p in prescriptions[:3]: # Last 3
                meds = json.loads(p.detected_medicines)
                context_str += f"- From {p.created_at.strftime('%Y-%m-%d')}: {', '.join([m.get('display_name', '') for m in meds])}\n"
            context_str += "\n"

        system_prompt = f"""You are MediNow Pro, a professional and empathetic medical AI assistant.
{context_str}

STRICT INSTRUCTIONS:
1. GREETINGS: If the user says "hi", "hello", or greets you, respond with a friendly greeting and ask how you can help with their health today.
2. CHATTING: Be a helpful companion. You can discuss general health topics, symptoms, and medical information naturally.
3. CONTEXT USAGE: Only refer to the user's medication inventory or reminders if it is relevant to their question. Don't force it into the conversation.
4. MEDICAL ISSUES: Provide clear, structured information about medical conditions, common treatments, and health advice.
5. BREVITY: Keep responses informative but concise. Avoid unnecessary filler.
6. DISCLAIMER: Every response must end with: *AI only. Consult a doctor for medical decisions.*
"""

        # Convert our history format to Gemini format ensuring alternating roles starting with 'user'
        gemini_history = []
        expected_role = "user"
        for h in history:
            role = "user" if h.role == "user" else "model"
            if role == expected_role:
                gemini_history.append({"role": role, "parts": [h.content]})
                expected_role = "model" if expected_role == "user" else "user"
        
        # If the history ended with 'user' and we are about to send a new message, 
        # it might cause an issue if we append a new 'user' message via `send_message`. 
        # But `chat.send_message` handles appending the new user message. We just need to make sure 
        # the history we initialize the chat with ends with a 'model' message or is empty!
        if len(gemini_history) > 0 and gemini_history[-1]["role"] == "user":
            gemini_history.pop() # Remove the trailing user message to keep it balanced

        # Use valid Gemini models ordered by reliability
        model_names = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-2.5-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
        ]
        
        model = None
        last_error = None
        for name in model_names:
            try:
                print(f"DEBUG: Attempting AI Chat with model: {name}")
                model = genai.GenerativeModel(
                    model_name=name,
                    system_instruction=system_prompt
                )
                
                # Use a small timeout for the first response to avoid hanging
                chat = model.start_chat(history=gemini_history)
                response = await asyncio.to_thread(chat.send_message, message)
                
                if response and response.text:
                    return response.text
                else:
                    print(f"DEBUG: Model {name} returned empty response")
                    continue
            except Exception as e:
                last_error = str(e)
                print(f"DEBUG: Model {name} failed: {e}")
                continue

        print(f"ERROR: All Gemini models failed. Last error: {last_error}")
        return None
    except Exception as e:
        import traceback
        print(f"Gemini API error: {e}")
        traceback.print_exc()
        return None

@router.post("/chat")
async def chat(msg: ChatMessage, db: Session = Depends(get_db)):
    if not msg.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Fetch user context for real-time assistant
    user_medicines = []
    reminders = []
    prescriptions = []
    
    if msg.user_id:
        user_medicines = db.query(models.UserMedicine).filter(models.UserMedicine.user_id == msg.user_id).all()
        reminders = db.query(models.Reminder).filter(models.Reminder.user_id == msg.user_id, models.Reminder.is_active == True).all()
        prescriptions = db.query(models.Prescription).filter(models.Prescription.user_id == msg.user_id).order_by(models.Prescription.created_at.desc()).all()

    # Try Gemini first for intelligent responses
    gemini_response = await get_gemini_response(msg.message, msg.history, user_medicines, reminders, prescriptions)
    if gemini_response:
        return {"response": gemini_response, "source": "gemini"}
    
    # Fall back to minimal connectivity message
    fallback = connectivity_fallback(msg.message)
    return {"response": fallback, "source": "local"}


@router.get("/doctor-report/{user_id}")
async def generate_doctor_report(user_id: int, db: Session = Depends(get_db)):
    """Generate doctor report using Gemini based on user's medicine adherence and health logs."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    invalid_keys = ["", "your_gemini_api_key_here", "PASTE_YOUR_KEY_HERE", "YOUR_API_KEY"]
    
    if api_key in invalid_keys:
        raise HTTPException(status_code=500, detail="AI Service is currently unconfigured. Please configure a valid API key.")
        
    try:
        # 1. Fetch adherence info
        from routers.smart import _compute_adherence
        adherence_data = await _compute_adherence(user_id, db)
        
        # 2. Fetch recent health logs
        health_logs = db.query(models.HealthLog).filter(
            models.HealthLog.user_id == user_id
        ).order_by(models.HealthLog.timestamp.desc()).limit(20).all()
        
        health_summary = ""
        for l in health_logs:
            date_str = l.timestamp.strftime('%m-%d')
            notes_str = f" - Notes: {l.notes}" if l.notes else ""
            health_summary += f"- {date_str}: {l.symptom} (Severity: {l.severity}){notes_str}\n"
            
        if not health_summary:
            health_summary = "No recent symptoms logged by user."

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        prompt = f"""
        You are a world-class Medical Data Analyst. Generate a professional "Patient Health & Adherence Summary" for a doctor's review.
        
        PATIENT DATA:
        - 30-Day Adherence Score: {adherence_data['adherence_score']}%
        - Risk Level: {adherence_data['risk_level']}
        - Missed Doses in last 30 days: {adherence_data['doses_skipped']}
        - Recent Symptoms & Side Effects logged:
        {health_summary}
        
        REPORT REQUIREMENTS:
        1. Adherence Summary: Be clinical and identify any dangerous trends.
        2. Symptom Analysis: Correlate symptoms with reported side effects and dose logging if possible.
        3. Key Risk Factors: Highlight if adherence is below 80%.
        4. Recommendations: Suggest 3 specific questions the patient should ask their doctor.
        
        FORMAT: Use professional Markdown with bold headings. Keep it concise enough for a 2-minute read. Do not include markdown code block quotes (like ```markdown), just raw markdown text.
        """
        
        model_names = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-2.5-flash',
            'gemini-1.5-flash',
        ]
        
        response_text = None
        for name in model_names:
            try:
                print(f"DEBUG: Attempting Doctor Report with model: {name}")
                model = genai.GenerativeModel(model_name=name)
                response = await asyncio.to_thread(model.generate_content, prompt)
                if response and response.text:
                    response_text = response.text
                    break
            except Exception as e:
                print(f"DEBUG: Model {name} report generation failed: {e}")
                continue
                
        if not response_text:
            raise HTTPException(status_code=502, detail="Failed to generate doctor report from AI service.")
            
        return {"report": response_text}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error generating doctor report: {str(e)}")

