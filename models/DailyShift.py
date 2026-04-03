from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional


class DailyNurseShiftBase(BaseModel):
    nurse_id: str
    shift_date: date                     # Ngày làm việc
    max_minutes: int = Field(480, gt=0)  # Giới hạn trong ngày cụ thể này
    
    # Thời gian ca làm việc thực tế trong ngày (có thể khác với mặc định)
    shift_start: Optional[datetime] = None
    shift_end: Optional[datetime] = None


class DailyNurseShiftCreate(DailyNurseShiftBase):
    pass


class DailyNurseShiftResponse(DailyNurseShiftBase):
    id: str
    used_minutes: int = 0                # Đã dùng bao nhiêu phút trong ngày
    remaining_minutes: int = 0           # Còn lại bao nhiêu
    is_overloaded: bool = False

    class Config:
        from_attributes = True
        json_encoders = {
            date: lambda v: v.isoformat()
        }

    def model_post_init(self, __context):
        """Tự động tính remaining_minutes và is_overloaded"""
        self.remaining_minutes = self.max_minutes - self.used_minutes
        self.is_overloaded = self.used_minutes > self.max_minutes