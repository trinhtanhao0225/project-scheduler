from fastapi import APIRouter
from agents.orchestrator import run_orchestrator

router = APIRouter(prefix="/ai-schedule", tags=["AI Scheduler"])


@router.post("")
def run_ai_scheduler():
    return run_orchestrator()