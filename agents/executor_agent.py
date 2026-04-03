from typing import Dict, List
from services.scheduler_service import schedule_patients_service


def executor_agent(config: Dict, reset: bool = True) -> List[Dict]:
    try:
        return schedule_patients_service(config=config, reset=reset)
    except Exception as e:
        print("Executor error:", e)
        return []