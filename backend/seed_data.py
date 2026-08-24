import os
import logging
from datetime import datetime, timedelta
import sys

# Ensure backend folder is in path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models.models import Pharmacy, Medicine, PharmacyStock, UserMedicine, Reminder, DoseLog

logger = logging.getLogger(__name__)

def seed_database():
    logger.info("Initializing database seeding using SQLAlchemy...")
    db = SessionLocal()
    try:
        # Check if database is already seeded (e.g. if pharmacies are present)
        pharmacy_count = db.query(Pharmacy).count()
        if pharmacy_count > 0:
            logger.info(f"Database already has {pharmacy_count} pharmacies. Skipping seeding.")
            return

        logger.info("Database is empty. Seeding default data...")

        # 1. Seed Pharmacies
        pharmacies = [
            Pharmacy(id=1, owner_id=1, name="MedPlus Pharmacy", address="Hitech City, Hyderabad", latitude=17.4486, longitude=78.3908, rating=4.8, is_open=True),
            Pharmacy(id=2, owner_id=1, name="Apollo Pharmacy 24/7", address="Jubilee Hills, Hyderabad", latitude=17.4399, longitude=78.3989, rating=4.9, is_open=True),
            Pharmacy(id=3, owner_id=1, name="Wellness Forever", address="Madhapur, Hyderabad", latitude=17.4422, longitude=78.3811, rating=4.7, is_open=True),
            Pharmacy(id=4, owner_id=1, name="Care & Cure Pharmacy", address="Gachibowli, Hyderabad", latitude=17.4510, longitude=78.3750, rating=4.6, is_open=True),
            Pharmacy(id=5, owner_id=1, name="Netmeds Local Store", address="Banjara Hills, Hyderabad", latitude=17.4350, longitude=78.4050, rating=4.5, is_open=True)
        ]
        for p in pharmacies:
            db.merge(p)
        logger.info("[OK] Seeded Pharmacies (5 stores)")

        # 2. Seed Medicines Catalog
        medicines = [
            Medicine(id=1, name="Dolo 650mg", description="Paracetamol 650mg for fever and mild to moderate pain relief", category="Analgesic / Antipyretic", image_url="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300"),
            Medicine(id=2, name="Metformin 500mg", description="First-line medication for type 2 diabetes management", category="Antidiabetic", image_url="https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300"),
            Medicine(id=3, name="Atorvastatin 10mg", description="Statins medication to lower LDL cholesterol and blood lipids", category="Cardiovascular", image_url="https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=300"),
            Medicine(id=4, name="Amoxicillin 500mg", description="Broad-spectrum penicillin antibiotic for bacterial infections", category="Antibiotic", image_url="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300"),
            Medicine(id=5, name="Azithromycin 500mg", description="Macrolide antibiotic for respiratory tract infections", category="Antibiotic", image_url="https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300"),
            Medicine(id=6, name="Pantoprazole 40mg", description="Proton pump inhibitor for acid reflux and GERD", category="Gastrointestinal", image_url="https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=300"),
            Medicine(id=7, name="Cetirizine 10mg", description="Antihistamine for allergic rhinitis, sneezing, and hives", category="Antihistamine", image_url="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300"),
            Medicine(id=8, name="Vitamin C 500mg & Zinc", description="Immunity booster chewable tablets for daily health", category="Vitamins & Supplements", image_url="https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300"),
            Medicine(id=9, name="Telmisartan 40mg", description="Angiotensin II receptor blocker for hypertension", category="Cardiovascular", image_url="https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=300"),
            Medicine(id=10, name="Montelukast 10mg", description="Leukotriene receptor antagonist for asthma and allergic bronchitis", category="Respiratory", image_url="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300")
        ]
        for m in medicines:
            db.merge(m)
        logger.info("[OK] Seeded Medicines Catalog (10 products)")

        # 3. Seed Pharmacy Stock
        pharmacy_stocks = [
            PharmacyStock(id=1, pharmacy_id=1, medicine_id=1, quantity=120, price=30.50, expiry_date=datetime.strptime("2027-06-30 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=2, pharmacy_id=1, medicine_id=2, quantity=85, price=45.00, expiry_date=datetime.strptime("2027-04-15 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=3, pharmacy_id=1, medicine_id=3, quantity=60, price=110.00, expiry_date=datetime.strptime("2027-08-20 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=4, pharmacy_id=1, medicine_id=6, quantity=95, price=68.00, expiry_date=datetime.strptime("2027-03-10 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=5, pharmacy_id=2, medicine_id=1, quantity=200, price=28.00, expiry_date=datetime.strptime("2027-07-01 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=6, pharmacy_id=2, medicine_id=4, quantity=50, price=85.00, expiry_date=datetime.strptime("2026-11-30 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=7, pharmacy_id=2, medicine_id=5, quantity=40, price=120.00, expiry_date=datetime.strptime("2026-12-15 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=8, pharmacy_id=2, medicine_id=8, quantity=150, price=40.00, expiry_date=datetime.strptime("2027-10-10 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=9, pharmacy_id=3, medicine_id=2, quantity=100, price=42.00, expiry_date=datetime.strptime("2027-05-01 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=10, pharmacy_id=3, medicine_id=7, quantity=180, price=25.00, expiry_date=datetime.strptime("2027-09-15 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=11, pharmacy_id=3, medicine_id=9, quantity=70, price=95.00, expiry_date=datetime.strptime("2027-01-20 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=12, pharmacy_id=4, medicine_id=1, quantity=90, price=32.00, expiry_date=datetime.strptime("2027-06-01 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=13, pharmacy_id=4, medicine_id=10, quantity=65, price=140.00, expiry_date=datetime.strptime("2027-02-28 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=14, pharmacy_id=5, medicine_id=3, quantity=110, price=105.00, expiry_date=datetime.strptime("2027-08-01 00:00:00", "%Y-%m-%d %H:%M:%S")),
            PharmacyStock(id=15, pharmacy_id=5, medicine_id=8, quantity=220, price=38.00, expiry_date=datetime.strptime("2027-12-31 00:00:00", "%Y-%m-%d %H:%M:%S"))
        ]
        for ps in pharmacy_stocks:
            db.merge(ps)
        logger.info("[OK] Seeded Pharmacy Stock (15 listings)")

        # 4. Seed User Medicines (Patient Inventory)
        now_val = datetime.utcnow()
        user_meds = [
            UserMedicine(id=1, user_id=1, medicine_name="Dolo 650mg", quantity_remaining=14, expiry_date=datetime.strptime("2026-12-31 00:00:00", "%Y-%m-%d %H:%M:%S"), daily_dosage=2, last_updated=now_val),
            UserMedicine(id=2, user_id=1, medicine_name="Metformin 500mg", quantity_remaining=28, expiry_date=datetime.strptime("2026-10-15 00:00:00", "%Y-%m-%d %H:%M:%S"), daily_dosage=1, last_updated=now_val),
            UserMedicine(id=3, user_id=1, medicine_name="Pantoprazole 40mg", quantity_remaining=6, expiry_date=datetime.strptime("2026-09-30 00:00:00", "%Y-%m-%d %H:%M:%S"), daily_dosage=1, last_updated=now_val),
            UserMedicine(id=4, user_id=1, medicine_name="Atorvastatin 10mg", quantity_remaining=22, expiry_date=datetime.strptime("2027-01-20 00:00:00", "%Y-%m-%d %H:%M:%S"), daily_dosage=1, last_updated=now_val),
            UserMedicine(id=5, user_id=1, medicine_name="Vitamin C 500mg", quantity_remaining=35, expiry_date=datetime.strptime("2027-05-10 00:00:00", "%Y-%m-%d %H:%M:%S"), daily_dosage=1, last_updated=now_val)
        ]
        for um in user_meds:
            db.merge(um)
        logger.info("[OK] Seeded Patient Inventory (5 medications)")

        # 5. Seed Reminders
        reminders = [
            Reminder(id=1, user_id=1, medicine_name="Dolo 650mg", dosage="650mg", time="08:00 AM", is_active=True, last_taken=now_val),
            Reminder(id=2, user_id=1, medicine_name="Metformin 500mg", dosage="500mg", time="08:00 AM", is_active=True, last_taken=now_val),
            Reminder(id=3, user_id=1, medicine_name="Pantoprazole 40mg", dosage="40mg", time="07:30 AM", is_active=True, last_taken=now_val),
            Reminder(id=4, user_id=1, medicine_name="Dolo 650mg", dosage="650mg", time="08:00 PM", is_active=True, last_taken=now_val),
            Reminder(id=5, user_id=1, medicine_name="Atorvastatin 10mg", dosage="10mg", time="10:00 PM", is_active=True, last_taken=now_val)
        ]
        for r in reminders:
            db.merge(r)
        logger.info("[OK] Seeded Pill Alarms (5 schedules)")

        # 6. Seed Dose Logs
        db.query(DoseLog).delete()
        med_names = ["Dolo 650mg", "Metformin 500mg", "Pantoprazole 40mg", "Atorvastatin 10mg", "Vitamin C 500mg"]
        count = 0
        for day_offset in range(14, -1, -1):
            log_date = now_val - timedelta(days=day_offset)
            for idx, mname in enumerate(med_names):
                was_skipped = (day_offset + idx) % 7 == 0
                taken_at = None if was_skipped else log_date
                db.add(DoseLog(
                    user_id=1,
                    medicine_name=mname,
                    taken_at=taken_at,
                    was_skipped=was_skipped,
                    scheduled_time=log_date.strftime("%Y-%m-%d %H:%M:%S")
                ))
                count += 1
        logger.info(f"[OK] Seeded Dose Logs ({count} logs across 14 days)")

        db.commit()
        logger.info("[DONE] Database seeding complete!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_database()
