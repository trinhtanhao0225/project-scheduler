from fastapi import APIRouter
from models.Patient import PatientCreate, PatientResponse
from services.patient_service import (
    create_patient_service,
    get_patients_service,
    generate_patients_service
)

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("", response_model=PatientResponse)
def create_patient(patient: PatientCreate):
    data = patient.model_dump()

    patient_id = create_patient_service(data)

    return PatientResponse(
        id=patient_id,
        assigned_nurse_id=None,
        **data
    )

@router.get("", response_model=list[PatientResponse])
def get_patients():
    return get_patients_service()

@router.post("/generate")
def generate_patients(n: int = 100):
    count = generate_patients_service(n)
    return {"message": f"Generated {count} patients"}