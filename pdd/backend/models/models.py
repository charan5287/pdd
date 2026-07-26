from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    phone = Column(String)
    role = Column(String)  # 'user' or 'pharmacy'
    google_id = Column(String, unique=True, index=True, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Pharmacy(Base):
    __tablename__ = "pharmacies"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    rating = Column(Float, default=4.5)
    is_open = Column(Boolean, default=True)

class Medicine(Base):
    __tablename__ = "medicines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    category = Column(String)
    image_url = Column(String)

class PharmacyStock(Base):
    __tablename__ = "pharmacy_stock"
    id = Column(Integer, primary_key=True, index=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"))
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    quantity = Column(Integer)
    price = Column(Float)
    expiry_date = Column(DateTime, nullable=True)  # [EXPIRY PREDICTION]

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"))
    status = Column(String, default="pending")  # 'pending', 'confirmed', 'out_for_delivery', 'delivered'
    total_amount = Column(Float)
    delivery_address = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    items_json = Column(Text, nullable=True)  # Store JSON list of medicines ordered
    delivery_partner_name = Column(String, nullable=True)
    delivery_partner_phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserMedicine(Base):
    __tablename__ = "user_medicines"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    medicine_name = Column(String)
    quantity_remaining = Column(Integer)  # [SMART REFILL]
    expiry_date = Column(DateTime)        # [EXPIRY PREDICTION]
    daily_dosage = Column(Integer, default=1)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    image_url = Column(String)
    detected_medicines = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    medicine_name = Column(String)
    dosage = Column(String)
    time = Column(String)  # HH:MM
    is_active = Column(Boolean, default=True)
    last_taken = Column(DateTime, nullable=True)

class DoseLog(Base):
    __tablename__ = "dose_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    medicine_name = Column(String, index=True)
    taken_at = Column(DateTime, default=datetime.datetime.utcnow)
    was_skipped = Column(Boolean, default=False)  # True = skipped/missed
    scheduled_time = Column(String, nullable=True)  # e.g. "08:00"

class HealthLog(Base):
    __tablename__ = "health_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    symptom = Column(String, nullable=False)
    severity = Column(String, default="Low")  # 'Low', 'Medium', 'High'
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

