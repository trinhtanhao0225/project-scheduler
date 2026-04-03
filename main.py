from fastapi import FastAPI
from routers.patient_router import router as patient_router
from routers.nurse_router import router as nurse_router
from routers.daily_shift_router import router as daily_shift_router
app = FastAPI()

app.include_router(patient_router)
app.include_router(nurse_router)

from routers.scheduler_router import router as scheduler_router

app.include_router(scheduler_router)

from routers.agent_router import router as agent_router

app.include_router(agent_router)
app.include_router(daily_shift_router)