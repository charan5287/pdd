import firebase_admin
from firebase_admin import credentials, auth, messaging
import os
from dotenv import load_dotenv

load_dotenv()

def initialize_firebase():
    """Initializes Firebase Admin SDK."""
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    
    if not cred_path or not os.path.exists(cred_path):
        print("WARNING: Firebase Service Account JSON not found. Firebase features will be disabled.")
        return None

    try:
        cred = credentials.Certificate(cred_path)
        app = firebase_admin.initialize_app(cred)
        print("INFO: Firebase Admin SDK initialized successfully.")
        return app
    except Exception as e:
        print(f"ERROR: Error initializing Firebase: {e}")
        return None

# Initialize on module load
firebase_app = initialize_firebase()
