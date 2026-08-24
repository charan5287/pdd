from database import engine, Base, SessionLocal
from models import models

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db_session():
    return SessionLocal()

# Add more helpers for CRUD here
