import os
import asyncio
import google.generativeai as genai

# Multi-key fallback list for seamless operation & zero quota blocks
KEYS = [
    os.environ.get("GEMINI_API_KEY", ""),
]
KEYS = [k for k in KEYS if k and len(k) > 15]

MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]

async def generate_gemini_content(prompt: str, contents=None) -> str | None:
    """Generate text or vision content using Gemini with automatic key rotation and model fallback."""
    for key in KEYS:
        try:
            genai.configure(api_key=key)
            for model_name in MODELS:
                try:
                    model = genai.GenerativeModel(model_name=model_name)
                    input_payload = contents if contents is not None else prompt
                    response = await asyncio.to_thread(model.generate_content, input_payload)
                    if response and response.text:
                        return response.text.strip()
                except Exception as e:
                    print(f"DEBUG: Gemini model {model_name} failed with key {key[:8]}...: {e}")
                    continue
        except Exception as e:
            print(f"DEBUG: Gemini key {key[:8]}... failed: {e}")
            continue
    return None
