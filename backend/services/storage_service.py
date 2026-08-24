import os
import logging
from urllib.parse import quote
from firebase_admin import storage
from services.firebase_config import firebase_app

logger = logging.getLogger(__name__)

def upload_to_firebase_storage(local_file_path: str, destination_blob_name: str) -> str | None:
    """
    Uploads a local file to Firebase Cloud Storage.
    Returns the public download URL if successful, or None if Firebase storage fails or is unconfigured.
    """
    if not firebase_app:
        logger.warning("Firebase Admin SDK is not initialized. Skipping Firebase Storage upload.")
        return None

    try:
        bucket = storage.bucket()
        blob = bucket.blob(destination_blob_name)
        
        # Upload file from disk to Firebase Storage
        blob.upload_from_filename(local_file_path)
        
        # Attempt to make the file public and return public_url
        try:
            blob.make_public()
            return blob.public_url
        except Exception as perm_err:
            logger.info(f"Could not set public permission on blob: {perm_err}. Using Firebase Storage media download URL.")
            bucket_name = bucket.name
            encoded_name = quote(destination_blob_name, safe='')
            return f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{encoded_name}?alt=media"

    except Exception as e:
        logger.error(f"Failed to upload file to Firebase Cloud Storage: {e}")
        return None
