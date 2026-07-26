import os
from dotenv import load_dotenv

# Try to load from the current directory
load_dotenv()
print(f"DEBUG: GEMINI_API_KEY from current dir: {os.environ.get('GEMINI_API_KEY', 'NOT FOUND')}")

# Try to load from medinow_backend
load_dotenv('medinow_backend/.env')
print(f"DEBUG: GEMINI_API_KEY from medinow_backend/.env: {os.environ.get('GEMINI_API_KEY', 'NOT FOUND')}")
