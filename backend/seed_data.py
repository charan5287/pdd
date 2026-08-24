import sqlite3
import os
from datetime import datetime, timedelta

db_path = r"e:\Medicine\backend\medinow.db"
print(f"Seeding database at: {db_path}")

if not os.path.exists(db_path):
    print("Database file not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Seed Pharmacies
pharmacies = [
    (1, 1, "MedPlus Pharmacy", "Hitech City, Hyderabad", 17.4486, 78.3908, 4.8, True),
    (2, 1, "Apollo Pharmacy 24/7", "Jubilee Hills, Hyderabad", 17.4399, 78.3989, 4.9, True),
    (3, 1, "Wellness Forever", "Madhapur, Hyderabad", 17.4422, 78.3811, 4.7, True),
    (4, 1, "Care & Cure Pharmacy", "Gachibowli, Hyderabad", 17.4510, 78.3750, 4.6, True),
    (5, 1, "Netmeds Local Store", "Banjara Hills, Hyderabad", 17.4350, 78.4050, 4.5, True)
]

for p in pharmacies:
    cur.execute("""
        INSERT OR REPLACE INTO pharmacies (id, owner_id, name, address, latitude, longitude, rating, is_open)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, p)

print("[OK] Seeded Pharmacies (5 stores)")

# 2. Seed Medicines Catalog
medicines = [
    (1, "Dolo 650mg", "Paracetamol 650mg for fever and mild to moderate pain relief", "Analgesic / Antipyretic", "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300"),
    (2, "Metformin 500mg", "First-line medication for type 2 diabetes management", "Antidiabetic", "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300"),
    (3, "Atorvastatin 10mg", "Statins medication to lower LDL cholesterol and blood lipids", "Cardiovascular", "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=300"),
    (4, "Amoxicillin 500mg", "Broad-spectrum penicillin antibiotic for bacterial infections", "Antibiotic", "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300"),
    (5, "Azithromycin 500mg", "Macrolide antibiotic for respiratory tract infections", "Antibiotic", "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300"),
    (6, "Pantoprazole 40mg", "Proton pump inhibitor for acid reflux and GERD", "Gastrointestinal", "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=300"),
    (7, "Cetirizine 10mg", "Antihistamine for allergic rhinitis, sneezing, and hives", "Antihistamine", "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300"),
    (8, "Vitamin C 500mg & Zinc", "Immunity booster chewable tablets for daily health", "Vitamins & Supplements", "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300"),
    (9, "Telmisartan 40mg", "Angiotensin II receptor blocker for hypertension", "Cardiovascular", "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=300"),
    (10, "Montelukast 10mg", "Leukotriene receptor antagonist for asthma and allergic bronchitis", "Respiratory", "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300")
]

for m in medicines:
    cur.execute("""
        INSERT OR REPLACE INTO medicines (id, name, description, category, image_url)
        VALUES (?, ?, ?, ?, ?)
    """, m)

print("[OK] Seeded Medicines Catalog (10 products)")

# 3. Seed Pharmacy Stock
pharmacy_stocks = [
    (1, 1, 1, 120, 30.50, "2027-06-30 00:00:00"),
    (2, 1, 2, 85, 45.00, "2027-04-15 00:00:00"),
    (3, 1, 3, 60, 110.00, "2027-08-20 00:00:00"),
    (4, 1, 6, 95, 68.00, "2027-03-10 00:00:00"),
    (5, 2, 1, 200, 28.00, "2027-07-01 00:00:00"),
    (6, 2, 4, 50, 85.00, "2026-11-30 00:00:00"),
    (7, 2, 5, 40, 120.00, "2026-12-15 00:00:00"),
    (8, 2, 8, 150, 40.00, "2027-10-10 00:00:00"),
    (9, 3, 2, 100, 42.00, "2027-05-01 00:00:00"),
    (10, 3, 7, 180, 25.00, "2027-09-15 00:00:00"),
    (11, 3, 9, 70, 95.00, "2027-01-20 00:00:00"),
    (12, 4, 1, 90, 32.00, "2027-06-01 00:00:00"),
    (13, 4, 10, 65, 140.00, "2027-02-28 00:00:00"),
    (14, 5, 3, 110, 105.00, "2027-08-01 00:00:00"),
    (15, 5, 8, 220, 38.00, "2027-12-31 00:00:00")
]

for ps in pharmacy_stocks:
    cur.execute("""
        INSERT OR REPLACE INTO pharmacy_stock (id, pharmacy_id, medicine_id, quantity, price, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ps)

print("[OK] Seeded Pharmacy Stock (15 listings across pharmacies)")

# 4. Seed User Medicines (Patient Inventory) for user_id = 1
now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
user_meds = [
    (1, 1, "Dolo 650mg", 14, "2026-12-31 00:00:00", 2, now_str),
    (2, 1, "Metformin 500mg", 28, "2026-10-15 00:00:00", 1, now_str),
    (3, 1, "Pantoprazole 40mg", 6, "2026-09-30 00:00:00", 1, now_str),
    (4, 1, "Atorvastatin 10mg", 22, "2027-01-20 00:00:00", 1, now_str),
    (5, 1, "Vitamin C 500mg", 35, "2027-05-10 00:00:00", 1, now_str)
]

for um in user_meds:
    cur.execute("""
        INSERT OR REPLACE INTO user_medicines (id, user_id, medicine_name, quantity_remaining, expiry_date, daily_dosage, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, um)

print("[OK] Seeded Patient Inventory (5 medications)")

# 5. Seed Reminders for user_id = 1
reminders = [
    (1, 1, "Dolo 650mg", "650mg", "08:00 AM", True, now_str),
    (2, 1, "Metformin 500mg", "500mg", "08:00 AM", True, now_str),
    (3, 1, "Pantoprazole 40mg", "40mg", "07:30 AM", True, now_str),
    (4, 1, "Dolo 650mg", "650mg", "08:00 PM", True, now_str),
    (5, 1, "Atorvastatin 10mg", "10mg", "10:00 PM", True, now_str)
]

for r in reminders:
    cur.execute("""
        INSERT OR REPLACE INTO reminders (id, user_id, medicine_name, dosage, time, is_active, last_taken)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, r)

print("[OK] Seeded Pill Alarms & Reminders (5 active schedules)")

# 6. Seed Dose Logs for past 14 days
cur.execute("DELETE FROM dose_logs;")
now = datetime.now()
count = 0
med_names = ["Dolo 650mg", "Metformin 500mg", "Pantoprazole 40mg", "Atorvastatin 10mg", "Vitamin C 500mg"]

for day_offset in range(14, -1, -1):
    log_date = now - timedelta(days=day_offset)
    date_str = log_date.strftime("%Y-%m-%d %H:%M:%S")
    for idx, mname in enumerate(med_names):
        was_skipped = 1 if (day_offset + idx) % 7 == 0 else 0
        taken_at = None if was_skipped else date_str
        cur.execute("""
            INSERT INTO dose_logs (user_id, medicine_name, taken_at, was_skipped, scheduled_time)
            VALUES (?, ?, ?, ?, ?)
        """, (1, mname, taken_at, was_skipped, date_str))
        count += 1

print(f"[OK] Seeded Dose Logs ({count} logs across 14 days for adherence charting)")

conn.commit()
conn.close()
print("[DONE] Database seeding complete!")
