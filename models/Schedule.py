from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional
from enum import Enum


class ScheduleStatus(str, Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    delayed = "delayed"


class ScheduleBase(BaseModel):
    nurse_ids: List[str]
    patient_id: str
    start_time: datetime
    end_time: datetime
    
    # Thêm để dễ group theo ngày
    schedule_date: Optional[date] = None
    
    # Real-time fields
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    status: ScheduleStatus = ScheduleStatus.scheduled


class ScheduleCreate(ScheduleBase):
    def model_post_init(self, __context):
        if self.schedule_date is None:
            self.schedule_date = self.start_time.date()


class ScheduleResponse(ScheduleBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True