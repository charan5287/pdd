import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

try:
    print("Listing models with details:")
    for m in genai.list_models():
        print(f"Name: {m.name}, DisplayName: {m.display_name}")
except Exception as e:
    print(f"Error: {e}")
