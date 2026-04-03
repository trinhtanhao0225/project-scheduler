# services/scheduler_service.py
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta, date
import random

from db.db import patient_collection, nurse_collection, schedule_collection
from models.Schedule import ScheduleCreate

from services.daily_shift_service import (
    create_or_get_daily_shift,
    update_used_minutes,
    reset_daily_shifts,
    get_remaining_minutes
)

from core.constraint_checker import ConstraintChecker


PRIORITY_WEIGHT = {"emergency": 200, "urgent": 80, "routine": 10}


def _to_datetime(dt) -> datetime:
    if isinstance(dt, date) and not isinstance(dt, datetime):
        return datetime.combine(dt, datetime.min.time())
    return dt


def _ensure_mongo_compatible(doc: dict) -> dict:
    if not isinstance(doc, dict):
        return doc
    for key, value in list(doc.items()):
        if isinstance(value, date) and not isinstance(value, datetime):
            doc[key] = _to_datetime(value)
        elif isinstance(value, dict):
            doc[key] = _ensure_mongo_compatible(value)
        elif isinstance(value, list):
            doc[key] = [
                _ensure_mongo_compatible(item) if isinstance(item, dict) else item
                for item in value
            ]
    return doc


def schedule_patients_service(
    config: Optional[Dict] = None,
    reset: bool = True,
    use_daily_limit: bool = True
) -> Dict[str, Any]:

    if config is None:
        config = {}

    constraint_checker = ConstraintChecker()

    # ==================== RESET ====================
    if reset:
        print("🔄 Reset dữ liệu...")
        schedule_collection.delete_many({})
        nurse_collection.update_many({}, {"$set": {"current_minutes": 0, "assigned_patients": []}})
        patient_collection.update_many({}, {"$unset": {"assigned_nurse_id": ""}})
        if use_daily_limit:
            reset_daily_shifts()
        print("✅ Reset xong")

    # ==================== LOAD DATA ====================
    nurses = list(nurse_collection.find().sort("_id", 1))
    patients = list(
        patient_collection.find().sort([
            ("priority", -1),
            ("earliest_start", 1),
            ("_id", 1)
        ])
    )

    print(f"📊 {len(nurses)} nurses | {len(patients)} patients")

    # 👉 tránh bias
    random.shuffle(nurses)

    # ==================== INIT DAILY SHIFT ====================
    if use_daily_limit:
        all_dates = {
            p["earliest_start"].date()
            for p in patients
            if isinstance(p.get("earliest_start"), datetime)
        }

        for nurse in nurses:
            for d in all_dates:
                create_or_get_daily_shift(str(nurse["_id"]), _to_datetime(d))

    assignments: List[Dict] = []
    unassigned: List[Dict] = []

    print("🚀 Start scheduling (SCORING mode)...")

    # ==================== MAIN LOOP ====================
    for idx, patient in enumerate(patients, 1):

        patient_id = str(patient["_id"])
        patient_name = patient.get("full_name", patient_id[:6])
        duration = int(patient.get("care_minutes", 30))
        required_skills = set(patient.get("required_skills", []))

        earliest = patient.get("earliest_start")
        if not isinstance(earliest, datetime):
            continue

        if patient.get("assigned_nurse_id"):
            continue

        best_choice = None
        best_score = -1

        # ==================== SCORING LOOP ====================
        for nurse in nurses:
            nurse_id = str(nurse["_id"])

            # DAILY LIMIT
            if use_daily_limit:
                remaining = get_remaining_minutes(nurse_id, _to_datetime(earliest.date()))
                if remaining < duration:
                    continue
            else:
                remaining = 480

            start, end = find_valid_start(nurse, patient)
            if not start:
                continue

            validation = constraint_checker.validate_assignment(
                nurse=nurse,
                patient=patient,
                proposed_start=start,
                proposed_end=end
            )

            if not validation.get("is_valid", False):
                continue

            # ==================== SCORE ====================
            score = 0

            # 1. Priority
            priority = patient.get("priority", "routine")
            score += PRIORITY_WEIGHT.get(priority, 0)

            # 2. Skill match
            nurse_skills = set(nurse.get("skills", []))
            skill_match = len(required_skills & nurse_skills)
            score += skill_match * 25

            # 3. Workload penalty
            workload = nurse.get("current_minutes", 0)
            score -= (workload / 480) * 50

            # 4. Delay penalty
            delay = (start - earliest).total_seconds() / 60
            score -= delay * 0.5

            # 5. Remaining capacity bonus
            score += remaining * 0.05

            if score > best_score:
                best_score = score
                best_choice = (nurse, start, end)

        # ==================== ASSIGN ====================
        if best_choice:
            nurse, start, end = best_choice
            nurse_id = str(nurse["_id"])

            schedule_doc = ScheduleCreate(
                nurse_ids=[nurse_id],
                patient_id=patient_id,
                start_time=start,
                end_time=end
            ).model_dump()

            schedule_doc = _ensure_mongo_compatible(schedule_doc)
            schedule_collection.insert_one(schedule_doc)

            nurse_collection.update_one(
                {"_id": nurse["_id"]},
                {
                    "$inc": {"current_minutes": duration},
                    "$push": {"assigned_patients": patient_id}
                }
            )

            if use_daily_limit:
                update_used_minutes(nurse_id, _to_datetime(start.date()), duration)

            patient_collection.update_one(
                {"_id": patient["_id"]},
                {"$set": {"assigned_nurse_id": nurse_id}}
            )

            assignments.append({
                "patient_id": patient_id,
                "patient_name": patient_name,
                "nurse_id": nurse_id,
                "nurse_name": nurse.get("full_name", "Unknown"),
                "start_time": start.isoformat(),
                "score": round(best_score, 2)
            })

            print(f"🏆 [{idx:2d}] {patient_name:25} → {nurse.get('full_name','Unknown'):20} | score={best_score:.1f}")

        else:
            print(f"❌ [{idx:2d}] {patient_name} → no valid nurse")
            unassigned.append({
                "patient_id": patient_id,
                "patient_name": patient_name
            })

    # ==================== RESULT ====================
    result = {
        "status": "completed",
        "total_patients": len(patients),
        "assigned_patients": len(assignments),
        "unassigned_patients": len(unassigned),
        "assignments": assignments,
        "unassigned": unassigned[:20]
    }

    schedule_collection.insert_one({
        "type": "summary",
        "timestamp": datetime.utcnow(),
        **result
    })

    print(f"🎯 DONE: {len(assignments)}/{len(patients)}")

    return result


# ==================== HELPERS ====================

def find_valid_start(nurse: Dict, patient: Dict) -> Tuple[Optional[datetime], Optional[datetime]]:
    duration = int(patient.get("care_minutes", 30))
    start = patient["earliest_start"]
    end_limit = patient["latest_end"]

    while start + timedelta(minutes=duration) <= end_limit:
        end = start + timedelta(minutes=duration)

        if is_valid_shift(nurse, start, end) and not has_overlap(str(nurse["_id"]), start, end):
            return start, end

        start += timedelta(minutes=15)

    return None, None


def is_valid_shift(nurse: Dict, start: datetime, end: datetime) -> bool:
    nurse_start = nurse.get("shift_start")
    nurse_end = nurse.get("shift_end")

    if not nurse_start or not nurse_end:
        return True

    return nurse_start.time() <= start.time() and end.time() <= nurse_end.time()


def has_overlap(nurse_id: str, start: datetime, end: datetime) -> bool:
    for s in schedule_collection.find({"nurse_ids": nurse_id}):
        s_start = s.get("start_time")
        s_end = s.get("end_time")

        if isinstance(s_start, datetime) and isinstance(s_end, datetime):
            if s_start < end and s_end > start:
                return True
    return False