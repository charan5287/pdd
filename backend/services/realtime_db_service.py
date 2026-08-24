import logging
from firebase_admin import db
from services.firebase_config import firebase_app

logger = logging.getLogger(__name__)

def sync_to_realtime_db(node_name: str, key: str | int, data: dict) -> bool:
    """
    Syncs a record to Firebase Realtime Database at path /{node_name}/{key}.
    Returns True on success, False on error or if Firebase is uninitialized.
    """
    if not firebase_app:
        logger.warning("Firebase Admin SDK is not initialized. Skipping Realtime DB sync.")
        return False

    try:
        ref = db.reference(node_name)
        ref.child(str(key)).set(data)
        logger.info(f"Successfully synced record to Firebase Realtime DB at /{node_name}/{key}")
        return True
    except Exception as e:
        logger.error(f"Failed to sync to Firebase Realtime DB at /{node_name}/{key}: {e}")
        return False

def get_from_realtime_db(node_name: str, key: str | int = None):
    """
    Retrieves data from Firebase Realtime Database at path /{node_name} or /{node_name}/{key}.
    """
    if not firebase_app:
        return None

    try:
        ref = db.reference(node_name)
        if key is not None:
            return ref.child(str(key)).get()
        return ref.get()
    except Exception as e:
        logger.error(f"Failed to fetch from Firebase Realtime DB at /{node_name}: {e}")
        return None

def delete_from_realtime_db(node_name: str, key: str | int) -> bool:
    """
    Deletes a record from Firebase Realtime Database at path /{node_name}/{key}.
    """
    if not firebase_app:
        return False
    try:
        ref = db.reference(node_name)
        ref.child(str(key)).delete()
        logger.info(f"Successfully deleted record from Firebase Realtime DB at /{node_name}/{key}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete from Firebase Realtime DB at /{node_name}/{key}: {e}")
        return False

def sync_user_data_to_realtime_db(user_id: int, db_session) -> bool:
    """
    Syncs user profile, inventory, prescriptions, and reminders to Firebase Realtime DB at /users/{user_id}.
    """
    if not firebase_app or not db_session:
        return False

    try:
        from models import models
        import json
        import datetime

        user = db_session.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return False

        meds = db_session.query(models.UserMedicine).filter(models.UserMedicine.user_id == user_id).all()
        inventory_dict = {}
        for m in meds:
            inventory_dict[str(m.id)] = {
                "id": m.id,
                "medicine_name": m.medicine_name,
                "quantity_remaining": m.quantity_remaining,
                "daily_dosage": m.daily_dosage,
                "expiry_date": m.expiry_date.isoformat() if m.expiry_date else None,
                "last_updated": m.last_updated.isoformat() if m.last_updated else None,
            }

        prescriptions = db_session.query(models.Prescription).filter(models.Prescription.user_id == user_id).all()
        prescriptions_dict = {}
        for p in prescriptions:
            try:
                meds_list = json.loads(p.detected_medicines) if p.detected_medicines else []
            except Exception:
                meds_list = []
            prescriptions_dict[str(p.id)] = {
                "id": p.id,
                "image_url": p.image_url,
                "medicines": meds_list,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }

        reminders = db_session.query(models.Reminder).filter(models.Reminder.user_id == user_id).all()
        reminders_dict = {}
        for r in reminders:
            reminders_dict[str(r.id)] = {
                "id": r.id,
                "medicine_name": r.medicine_name,
                "dosage": r.dosage,
                "time": r.time,
                "is_active": r.is_active,
                "last_taken": r.last_taken.isoformat() if r.last_taken else None,
            }

        user_data = {
            "id": user.id,
            "email": user.email,
            "fullName": user.full_name,
            "phone": user.phone or "",
            "role": user.role,
            "avatarUrl": user.avatar_url or "",
            "inventory": inventory_dict,
            "prescriptions": prescriptions_dict,
            "reminders": reminders_dict,
            "last_synced": datetime.datetime.utcnow().isoformat(),
        }

        ref = db.reference("users")
        ref.child(str(user_id)).update(user_data)
        logger.info(f"Successfully synced full user data to Firebase Realtime DB for user_id={user_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to sync full user data to Firebase Realtime DB for user_id={user_id}: {e}")
        return False

