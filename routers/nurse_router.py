from fastapi import APIRouter, Query
from typing import Optional
from models.Nurse import NurseCreate, NurseResponse
from services.nurse_service import (
    create_nurse_service,
    get_nurses_service,
    generate_nurses_service
)

router = APIRouter(prefix="/nurses", tags=["Nurses"])


@router.post("", response_model=NurseResponse)
def create_nurse(nurse: NurseCreate):
    data = nurse.model_dump()
    nurse_id = create_nurse_service(data)

    return NurseResponse(
        id=nurse_id,
        **data
    )


@router.get("", response_model=list[NurseResponse])
def get_nurses():
    return get_nurses_service()


@router.post("/generate")
def generate_nurses(
    n: int = Query(30, ge=1, le=200, description="Số lượng y tá muốn generate"),
    default_max_minutes_per_day: int = Query(480, ge=240, le=720, description="Giới hạn phút mỗi ngày mặc định")
):
    """
    Generate nurses với khả năng tùy chỉnh max_minutes mỗi ngày
    """
    count = generate_nurses_service(n, default_max_minutes_per_day)
    return {
        "message": f"Successfully generated {count} nurses",
        "default_max_minutes_per_day": default_max_minutes_per_day
    }


# Thêm endpoint hữu ích mới
@router.get("/{nurse_id}", response_model=NurseResponse)
def get_nurse_by_id(nurse_id: str):
    # Bạn có thể implement sau trong service
    pass