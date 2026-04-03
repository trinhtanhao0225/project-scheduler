from datetime import date, datetime, timedelta
from typing import List, Dict, Optional
from bson import ObjectId
from db.db import daily_shift_collection, nurse_collection


def _to_datetime(shift_date) -> datetime:
    """Chuyển date thành datetime (00:00:00) để query MongoDB"""
    if isinstance(shift_date, datetime):
        return shift_date.replace(hour=0, minute=0, second=0, microsecond=0)
    if isinstance(shift_date, date):
        return datetime.combine(shift_date, datetime.min.time())
    raise ValueError(f"Invalid date type: {type(shift_date)}")


def create_or_get_daily_shift(nurse_id: str, shift_date: date, max_minutes: Optional[int] = None) -> str:
    """Tạo hoặc lấy daily shift cho một y tá"""
    dt = _to_datetime(shift_date)

    existing = daily_shift_collection.find_one({"nurse_id": nurse_id, "shift_date": dt})
    if existing:
        return str(existing["_id"])

    if max_minutes is None:
        nurse = nurse_collection.find_one({"_id": ObjectId(nurse_id)})
        max_minutes = nurse.get("default_max_minutes_per_day", 480) if nurse else 480

    nurse = nurse_collection.find_one({"_id": ObjectId(nurse_id)}) or {}

    data = {
        "nurse_id": nurse_id,
        "shift_date": dt,
        "max_minutes": max_minutes,
        "used_minutes": 0,
        "shift_start_time": nurse.get("shift_start"),
        "shift_end_time": nurse.get("shift_end"),
        "assigned_patients": [],
    }

    result = daily_shift_collection.insert_one(data)
    return str(result.inserted_id)


def update_used_minutes(nurse_id: str, shift_date: date, minutes: int, patient_id: Optional[str] = None) -> bool:
    """Cập nhật phút đã dùng và thêm patient vào danh sách"""
    dt = _to_datetime(shift_date)

    update_data = {"$inc": {"used_minutes": minutes}}
    if patient_id:
        update_data.setdefault("$addToSet", {})["assigned_patients"] = patient_id

    result = daily_shift_collection.update_one(
        {"nurse_id": nurse_id, "shift_date": dt},
        update_data
    )
    return result.modified_count > 0


def get_remaining_minutes(nurse_id: str, shift_date: date) -> int:
    """Lấy số phút còn lại của y tá trong ngày"""
    dt = _to_datetime(shift_date)

    shift = daily_shift_collection.find_one({"nurse_id": nurse_id, "shift_date": dt})

    if not shift:
        nurse = nurse_collection.find_one({"_id": ObjectId(nurse_id)})
        return nurse.get("default_max_minutes_per_day", 480) if nurse else 480

    max_min = shift.get("max_minutes", 480)
    used = shift.get("used_minutes", 0)
    return max(0, max_min - used)


def get_daily_shifts_by_date(shift_date: date) -> List[Dict]:
    """Lấy tất cả daily shift của một ngày"""
    dt = _to_datetime(shift_date)

    shifts = list(daily_shift_collection.find({"shift_date": dt}))

    for s in shifts:
        s["id"] = str(s.pop("_id"))
        used = s.get("used_minutes", 0)
        max_min = s.get("max_minutes", 480)

        s["remaining_minutes"] = max(0, max_min - used)
        s["is_overloaded"] = used > max_min
        s["utilization_rate"] = round((used / max_min) * 100, 1) if max_min > 0 else 0

        # Lấy tên y tá
        nurse = nurse_collection.find_one({"_id": ObjectId(s["nurse_id"])})
        s["nurse_name"] = nurse.get("full_name", "Unknown") if nurse else "Unknown"

    return shifts


def get_daily_summary(shift_date: date) -> Dict:
    """Tóm tắt tình hình làm việc trong ngày"""
    shifts = get_daily_shifts_by_date(shift_date)

    if not shifts:
        return {
            "shift_date": shift_date.isoformat(),
            "total_nurses": 0,
            "overloaded_nurses": 0,
            "average_utilization": "0%",
            "total_minutes_used": 0
        }

    total_nurses = len(shifts)
    overloaded = sum(1 for s in shifts if s.get("is_overloaded", False))
    total_used = sum(s.get("used_minutes", 0) for s in shifts)
    total_max = sum(s.get("max_minutes", 480) for s in shifts)

    avg_utilization = round((total_used / total_max) * 100, 1) if total_max > 0 else 0

    return {
        "shift_date": shift_date.isoformat(),
        "total_nurses": total_nurses,
        "overloaded_nurses": overloaded,
        "average_utilization": f"{avg_utilization}%",
        "total_minutes_used": total_used
    }


def reset_daily_shifts():
    """Reset toàn bộ daily shifts"""
    daily_shift_collection.delete_many({})
    print("✅ All daily shifts have been reset.")


def initialize_daily_shifts_for_nurses(nurse_ids: List[str], start_date: date, days: int = 1):
    """Khởi tạo Daily Shift cho nhiều y tá"""
    for nurse_id in nurse_ids:
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            create_or_get_daily_shift(nurse_id, current_date)
    print(f"✅ Initialized daily shifts for {len(nurse_ids)} nurses ({days} days)")