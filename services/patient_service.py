# services/patient_service.py
import random
from datetime import datetime, timedelta
from db.db import patient_collection

# 🔹 Priority config
PRIORITY_LEVELS = ["emergency", "urgent", "routine"]

# 🔹 CREATE
def create_patient_service(data: dict):
    result = patient_collection.insert_one(data)
    return str(result.inserted_id)

# 🔹 GET
def get_patients_service():
    patients = []

    for p in patient_collection.find():
        patients.append({
            "id": str(p["_id"]),
            "assigned_nurse_id": p.get("assigned_nurse_id"),
            "full_name": p["full_name"],
            "care_minutes": p["care_minutes"],
            "earliest_start": p["earliest_start"],
            "latest_end": p["latest_end"],
            "visit_time": p.get("visit_time", p["earliest_start"]),
            "required_skills": p["required_skills"],
            "priority": p.get("priority", "routine"),
            "location": p.get("location", "hospital")
        })

    return patients

# 🔹 GENERATE FAKE DATA
def generate_patients_service(n: int = 10):
    """
    Tạo n bệnh nhân test nhanh.
    visit_time = earliest_start để scheduler không lỗi.
    """
    patients = []

    today = datetime.now()
    base_time = datetime(today.year, today.month, today.day, 7, 0, 0)
    skills_pool = [
        "ICU", "Injection", "ElderCare", "Rehab",
        "MedicationManagement", "WoundCare", "VitalSignsMonitoring",
        "PostSurgeryCare", "PalliativeCare", "PhysicalTherapyAssist",
        "DiabetesCare", "RespiratoryCare"
    ]

    for i in range(n):
        # random start window
        start_offset = random.randint(0, 8)
        earliest_start = base_time + timedelta(hours=start_offset)

        # duration window
        window_hours = random.randint(1, 3)
        latest_end = earliest_start + timedelta(hours=window_hours)

        # random priority
        priority = random.choices(
            PRIORITY_LEVELS,
            weights=[1, 3, 6]  # emergency ít, routine nhiều
        )[0]

        patient = {
            "full_name": f"Patient {i}",
            "care_minutes": random.choice([30, 60, 90]),
            "earliest_start": earliest_start,
            "latest_end": latest_end,
            "visit_time": earliest_start,  # fix để scheduler dùng
            "required_skills": random.sample(skills_pool, k=random.randint(1, 3)),
            "priority": priority,
            "location": "hospital"
        }

        patients.append(patient)

    result = patient_collection.insert_many(patients)
    return len(result.inserted_ids)