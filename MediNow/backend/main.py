from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import models
from routers import auth, ai, prescription, pharmacy, smart
from services import firebase_config
import uvicorn
import logging
from dotenv import load_dotenv

# Load environment variables from .env
import os
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"Loading .env from {env_path}")
logger.info(f"GEMINI_API_KEY loaded: {'Yes' if os.getenv('GEMINI_API_KEY') else 'No'}")
if os.getenv('GEMINI_API_KEY') and len(os.getenv('GEMINI_API_KEY', '')) < 10:
    logger.warning("⚠️ GEMINI_API_KEY seems too short to be valid!")

# Initialize Database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MediNow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ai.router)
app.include_router(prescription.router)
app.include_router(pharmacy.router)
app.include_router(smart.router)

@app.get("/")
async def root():
    return {"message": "MediNow API is running", "version": "2.0.0"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
