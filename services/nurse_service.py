# services/nurse_service.py
import random
from datetime import datetime, timedelta
from db.db import nurse_collection

# 🔹 CREATE
def create_nurse_service(data: dict):
    data["current_minutes"] = 0
    data["assigned_patients"] = []
    # Đảm bảo có trường mặc định nếu người dùng không truyền
    if "default_max_minutes_per_day" not in data:
        data["default_max_minutes_per_day"] = 480

    result = nurse_collection.insert_one(data)
    return str(result.inserted_id)


# 🔹 GET
def get_nurses_service():
    nurses = []
    for n in nurse_collection.find():
        nurses.append({
            "id": str(n["_id"]),
            "full_name": n["full_name"],
            "skills": n["skills"],
            "shift_start": n["shift_start"],
            "shift_end": n["shift_end"],
            "default_max_minutes_per_day": n.get("default_max_minutes_per_day", 480),  # ← Sửa ở đây
            "current_minutes": n.get("current_minutes", 0),
            "assigned_patients": n.get("assigned_patients", []),
            "is_active": n.get("is_active", True)
        })
    return nurses


# 🔹 GENERATE FAKE DATA
def generate_nurses_service(n: int = 30, default_max_minutes_per_day: int = 480):
    """
    Tạo n y tá test với giới hạn phút mỗi ngày
    """
    nurses = []

    base_time = datetime(2026, 3, 26, 7, 0, 0)   # Ví dụ ca sáng
    skills_pool = [
        "ICU", "Injection", "ElderCare", "Rehab", "MedicationManagement",
        "WoundCare", "VitalSignsMonitoring", "PostSurgeryCare", 
        "PalliativeCare", "DiabetesCare", "RespiratoryCare"
    ]

    for i in range(n):
        nurse = {
            "full_name": f"Nurse {i+1}",
            "skills": random.sample(skills_pool, k=random.randint(3, 5)),
            "shift_start": base_time,
            "shift_end": base_time + timedelta(hours=8),
            "default_max_minutes_per_day": default_max_minutes_per_day,   # ← Dùng tên mới
            "current_minutes": 0,
            "assigned_patients": [],
            "is_active": True
        }
        nurses.append(nurse)

    result = nurse_collection.insert_many(nurses)
    return len(result.inserted_ids)