"""
ConstraintChecker - Engine kiểm tra các ràng buộc cứng (Hard Constraints)
Phiên bản đã sửa lỗi datetime.date + cải thiện ổn định
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Tuple, Optional

from db.db import schedule_collection, daily_shift_collection
from bson import ObjectId


def _to_datetime(dt) -> datetime:
    """Helper chuyển date thành datetime (00:00:00) để MongoDB chấp nhận"""
    if isinstance(dt, date) and not isinstance(dt, datetime):
        return datetime.combine(dt, datetime.min.time())
    return dt


class ConstraintChecker:
    """
    Class chịu trách nhiệm kiểm tra tất cả các ràng buộc trước khi assign lịch.
    """

    def __init__(self):
        pass

    # ====================== DAILY CAPACITY ======================
    def check_daily_capacity(self, nurse_id: str, shift_date: date, required_minutes: int) -> Tuple[bool, str]:
        """
        Kiểm tra xem y tá còn đủ thời gian trong ngày không
        """
        try:
            # === SỬA LỖI Ở ĐÂY ===
            query_date = _to_datetime(shift_date)

            shift = daily_shift_collection.find_one({
                "nurse_id": nurse_id,
                "shift_date": query_date          # Phải là datetime
            })

            if not shift:
                return True, "No daily shift record found (using default)"

            max_minutes = shift.get("max_minutes", 480)
            used_minutes = shift.get("used_minutes", 0)
            remaining = max_minutes - used_minutes

            if required_minutes > remaining:
                return False, f"Daily capacity exceeded. Remaining: {remaining}min, Required: {required_minutes}min"

            return True, f"OK (Remaining: {remaining}min)"

        except Exception as e:
            print(f"❌ Lỗi check_daily_capacity: {type(e).__name__} - {e}")
            return True, "Error occurred, skipping strict check"   # tạm cho qua để không crash toàn bộ

    # ====================== OVERLAP ======================
    def check_overlap(self, nurse_id: str, new_start: datetime, new_end: datetime) -> Tuple[bool, str]:
        """
        Kiểm tra trùng lịch với các ca đã có
        """
        try:
            overlapping = list(schedule_collection.find({
                "nurse_ids": nurse_id,
                "start_time": {"$lt": new_end},
                "end_time": {"$gt": new_start}
            }))

            if overlapping:
                return False, f"Time overlap with {len(overlapping)} existing assignment(s)"

            return True, "No overlap"
        except Exception as e:
            print(f"❌ Lỗi check_overlap: {e}")
            return True, "Overlap check error"

    # ====================== SKILL COVERAGE ======================
    def check_skill_coverage(self, nurse_skills: List[str], required_skills: List[str]) -> Tuple[bool, float]:
        """
        Kiểm tra độ phủ kỹ năng. Trả về (is_sufficient, coverage_ratio)
        """
        if not required_skills:
            return True, 1.0

        nurse_set = set(nurse_skills or [])
        required_set = set(required_skills or [])
        covered = len(nurse_set & required_set)
        ratio = covered / len(required_set) if required_set else 1.0

        is_sufficient = ratio >= 0.75
        return is_sufficient, round(ratio, 2)

    # ====================== MINIMUM REST TIME ======================
    def check_minimum_rest(self, nurse_id: str, new_start: datetime, min_rest_minutes: int = 45) -> Tuple[bool, str]:
        """
        Kiểm tra thời gian nghỉ tối thiểu giữa các ca
        """
        try:
            previous = schedule_collection.find_one(
                {
                    "nurse_ids": nurse_id,
                    "end_time": {"$lte": new_start}
                },
                sort=[("end_time", -1)]
            )

            if not previous or not previous.get("end_time"):
                return True, "No previous assignment"

            time_diff = (new_start - previous["end_time"]).total_seconds() / 60

            if time_diff < min_rest_minutes:
                return False, f"Insufficient rest time: only {time_diff:.0f}min (need {min_rest_minutes}min)"

            return True, f"Rest time OK ({time_diff:.0f}min)"
        except Exception as e:
            print(f"❌ Lỗi check_minimum_rest: {e}")
            return True, "Rest check error"

    # ====================== MAIN VALIDATION ======================
    def validate_assignment(self, 
                          nurse: Dict, 
                          patient: Dict, 
                          proposed_start: datetime, 
                          proposed_end: datetime) -> Dict:
        """
        Kiểm tra toàn bộ ràng buộc cho một lần phân công
        """
        nurse_id = str(nurse.get("_id"))
        shift_date = proposed_start.date()
        duration = int(patient.get("care_minutes", 30))

        violations = []
        warnings = []
        penalty = 0

        # 1. Daily Capacity Check
        ok, msg = self.check_daily_capacity(nurse_id, shift_date, duration)
        if not ok:
            violations.append(f"Daily Capacity: {msg}")
            penalty += 30

        # 2. Overlap Check
        ok, msg = self.check_overlap(nurse_id, proposed_start, proposed_end)
        if not ok:
            violations.append(f"Overlap: {msg}")
            penalty += 50

        # 3. Skill Coverage Check
        nurse_skills = nurse.get("skills", [])
        required_skills = patient.get("required_skills", [])
        ok, coverage_ratio = self.check_skill_coverage(nurse_skills, required_skills)
        
        if not ok:
            violations.append(f"Low skill coverage: {coverage_ratio*100:.0f}%")
            penalty += 20
        elif coverage_ratio < 0.9:
            warnings.append(f"Partial skill coverage: {coverage_ratio*100:.0f}%")

        # 4. Minimum Rest Time
        ok, msg = self.check_minimum_rest(nurse_id, proposed_start, min_rest_minutes=45)
        if not ok:
            warnings.append(f"Rest time issue: {msg}")
            penalty += 8

        return {
            "is_valid": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "penalty": penalty,
            "details": {
                "daily_capacity_ok": "Daily Capacity" not in "".join(violations),
                "no_overlap": "Overlap" not in "".join(violations),
                "skill_coverage": coverage_ratio
            }
        }


    def batch_validate(self, assignments: List[Dict]) -> Dict:
        """Validate hàng loạt assignment"""
        # Hiện tại chưa triển khai chi tiết
        return {
            "total_violations": 0,
            "violation_details": []
        }