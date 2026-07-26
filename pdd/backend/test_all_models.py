import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

try:
    genai.configure(api_key=api_key)
    # Check specific standard models
    models_to_test = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.0-pro',
        'gemini-1.5-pro'
    ]
    
    for m_name in models_to_test:
        try:
            print(f"Testing {m_name}...")
            model = genai.GenerativeModel(m_name)
            response = model.generate_content("hi")
            print(f"  SUCCESS: {m_name} is working!")
        except Exception as e:
            print(f"  FAILED: {m_name} - {e}")
            
except Exception as e:
    print(f"Major Error: {e}")
