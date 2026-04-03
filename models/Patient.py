from pydantic import BaseModel, field_validator
from typing import List, Optional, Tuple
from datetime import datetime
from enum import Enum


# 🔹 Priority enum
class PatientPriority(str, Enum):
    emergency = "emergency"
    urgent = "urgent"
    routine = "routine"


# 🔹 Base model
class PatientBase(BaseModel):
    full_name: str
    care_minutes: int  # thời gian chăm sóc (phút)

    # Time window (scheduler sẽ tự chọn giờ phù hợp)
    earliest_start: datetime
    latest_end: datetime

    required_skills: List[str]

    # priority
    priority: PatientPriority = PatientPriority.routine

    # cùng bệnh viện → có thể dùng đơn giản
    location: Optional[str] = "hospital"

    # 🔥 validate thời gian
    @field_validator("latest_end")
    def validate_time_window(cls, v, info):
        earliest = info.data.get("earliest_start")
        if earliest and v <= earliest:
            raise ValueError("latest_end must be after earliest_start")
        return v


# 🔹 Create
class PatientCreate(PatientBase):
    pass


# 🔹 Response
class PatientResponse(PatientBase):
    id: str
    assigned_nurse_id: Optional[str] = None

    class Config:
        from_attributes = True