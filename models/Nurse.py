from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class NurseBase(BaseModel):
    full_name: str
    skills: List[str]
    
    # Thời gian ca làm việc cố định trong ngày
    shift_start: datetime
    shift_end: datetime
    
    # Giới hạn thời gian làm việc MẶC ĐỊNH mỗi ngày
    default_max_minutes_per_day: int = Field(
        480, 
        gt=0, 
        description="Giới hạn tối đa phút làm việc mỗi ngày (mặc định 8 giờ)"
    )
    
    is_active: bool = True


class NurseCreate(NurseBase):
    pass


class NurseResponse(NurseBase):
    id: str
    current_minutes: int = 0                    # Tổng phút đã làm (toàn bộ thời gian)
    assigned_patients: List[str] = Field(default_factory=list)
    
    # Thông tin bổ sung hữu ích
    total_assigned_days: int = 0                # Số ngày đã được phân công

    class Config:
        from_attributes = True