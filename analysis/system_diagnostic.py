from db.db import schedule_collection, nurse_collection
from collections import defaultdict


def detect_nurse_stress():

    schedules = list(schedule_collection.find())
    nurses = list(nurse_collection.find())

    minutes = defaultdict(int)

    for s in schedules:

        duration = s.get("care_minutes", 0)

        for nurse_id in s.get("nurse_ids", []):
            minutes[nurse_id] += duration

    stress_list = []

    for nurse in nurses:

        nurse_id = str(nurse["_id"])

        total = minutes[nurse_id]

        capacity = nurse["max_minutes"]

        utilization = total / capacity if capacity else 0

        if utilization > 0.9:

            stress_list.append({
                "nurse_id": nurse_id,
                "minutes": total,
                "capacity": capacity,
                "utilization": utilization
            })

    return stress_list