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
        storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
        database_url = os.getenv("FIREBASE_DATABASE_URL")
        options = {}
        if storage_bucket:
            options['storageBucket'] = storage_bucket
        if database_url:
            options['databaseURL'] = database_url

        app = firebase_admin.initialize_app(cred, options)
        print(f"INFO: Firebase Admin SDK initialized successfully (Database: {database_url or 'None'}).")
        return app
    except Exception as e:
        print(f"ERROR: Error initializing Firebase: {e}")
        return None

# Initialize on module load
firebase_app = initialize_firebase()
