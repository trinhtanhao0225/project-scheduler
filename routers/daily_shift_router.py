from fastapi import APIRouter, Query, HTTPException
from datetime import date, datetime
from typing import List, Optional

from services.daily_shift_service import (
    get_daily_shifts_by_date,
    get_daily_summary,
    reset_daily_shifts,
    get_remaining_minutes,
    initialize_daily_shifts_for_nurses,
)

router = APIRouter(prefix="/daily-shifts", tags=["Daily Shifts"])


@router.get("")
def get_daily_shifts(
    shift_date: Optional[str] = Query(None, description="Ngày cần xem (YYYY-MM-DD)")
):
    """Lấy workload của tất cả y tá theo ngày"""
    try:
        query_date = datetime.strptime(shift_date, "%Y-%m-%d").date() if shift_date else date.today()
        shifts = get_daily_shifts_by_date(query_date)
        return shifts
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")


@router.get("/summary")
def get_daily_shift_summary(
    shift_date: Optional[str] = Query(None)
):
    """Tóm tắt tình hình daily shift"""
    try:
        query_date = datetime.strptime(shift_date, "%Y-%m-%d").date() if shift_date else date.today()
        return get_daily_summary(query_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset")
def reset_all_daily_shifts():
    """Reset toàn bộ daily shifts"""
    reset_daily_shifts()
    return {"message": "All daily shifts have been reset successfully", "status": "success"}


@router.post("/initialize")
def initialize_daily_shifts(payload: dict):
    """Khởi tạo Daily Shift cho danh sách y tá"""
    try:
        nurse_ids = payload.get("nurse_ids", [])
        start_date_str = payload.get("start_date")
        days = payload.get("days", 1)

        if not nurse_ids:
            raise HTTPException(status_code=400, detail="nurse_ids is required")
        if not start_date_str:
            raise HTTPException(status_code=400, detail="start_date is required")

        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()

        initialize_daily_shifts_for_nurses(nurse_ids, start_date, days)

        return {
            "message": f"Successfully initialized daily shifts for {len(nurse_ids)} nurses",
            "nurse_count": len(nurse_ids),
            "days": days,
            "start_date": start_date_str
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Các endpoint bổ sung (có thể dùng sau)
@router.get("/remaining/{nurse_id}")
def get_nurse_remaining_minutes(
    nurse_id: str,
    shift_date: Optional[str] = Query(None)
):
    try:
        query_date = datetime.strptime(shift_date, "%Y-%m-%d").date() if shift_date else date.today()
        remaining = get_remaining_minutes(nurse_id, query_date)
        return {
            "nurse_id": nurse_id,
            "shift_date": query_date.isoformat(),
            "remaining_minutes": remaining,
            "is_overloaded": remaining < 0
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")