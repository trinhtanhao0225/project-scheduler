# routers/ai_schedule.py
from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any
from datetime import datetime, date

from services.scheduler_service import schedule_patients_service

router = APIRouter(prefix="/ai-schedule", tags=["AI Scheduler"])


@router.post("")
def run_scheduler(
    max_iter: int = Query(8, ge=1, le=30, description="Số lần lặp tối đa (hiện chưa dùng)"),
    target_score: float = Query(90.0, ge=0, le=100),
    reset: bool = Query(True, description="Reset dữ liệu trước khi lập lịch"),
    use_daily_limit: bool = Query(True, description="Sử dụng giới hạn phút mỗi ngày của y tá")
):
    """Chạy AI Scheduler lập lịch bệnh nhân"""
    try:
        config = {
            "weight_skill_match": 10,
            "weight_workload_balance": 20
        }

        result = schedule_patients_service(
            config=config,
            reset=reset,
            use_daily_limit=use_daily_limit
        )

        return {
            "status": "success",
            "message": "AI Scheduler đã chạy xong",
            "best_score": result.get("best_score"),
            "total_patients": result.get("total_patients"),
            "assigned_patients": result.get("assigned_patients"),
            "unassigned_patients": result.get("unassigned_patients"),
            "timestamp": result.get("timestamp"),
            "result": result
        }

    except Exception as e:
        import traceback
        print("=== ERROR IN AI SCHEDULER ===")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi scheduler: {str(e)}"
        )


@router.get("/latest")
def get_latest_schedule():
    """Lấy kết quả scheduler lần chạy gần nhất"""
    try:
        from db.db import schedule_collection

        latest = schedule_collection.find_one(
            {"type": "schedule_summary"},
            sort=[("timestamp", -1)]
        )

        if not latest:
            return {"has_data": False, "message": "Chưa có kết quả scheduler nào"}

        latest["_id"] = str(latest["_id"])
        if isinstance(latest.get("timestamp"), datetime):
            latest["timestamp"] = latest["timestamp"].isoformat()

        # Chuyển các trường date nếu còn sót
        if isinstance(latest.get("date"), date):
            latest["date"] = datetime.combine(latest["date"], datetime.min.time()).isoformat()

        return {
            "has_data": True,
            "latest_result": latest
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_schedule_history(limit: int = Query(10, ge=1, le=50)):
    """Lấy lịch sử các lần chạy scheduler"""
    try:
        from db.db import schedule_collection

        history = list(
            schedule_collection
            .find({"type": "schedule_summary"})
            .sort("timestamp", -1)
            .limit(limit)
        )

        for item in history:
            item["_id"] = str(item["_id"])
            if isinstance(item.get("timestamp"), datetime):
                item["timestamp"] = item["timestamp"].isoformat()
            if isinstance(item.get("date"), date):
                item["date"] = datetime.combine(item["date"], datetime.min.time()).isoformat()

        return {"total": len(history), "history": history}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))