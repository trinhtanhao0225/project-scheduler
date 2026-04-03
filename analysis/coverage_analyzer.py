from collections import defaultdict
from typing import List, Dict

def detect_coverage_risk(assignments: List[Dict]) -> List[Dict]:

    slots = defaultdict(int)

    for a in assignments:
        start = a.get("start_time")
        if not start:
            continue

        slot = start[:13]  # YYYY-MM-DD HH
        slots[slot] += 1

    risks = []

    for slot, count in slots.items():

        if count > 10:
            risks.append({
                "time_slot": slot,
                "patients": count,
                "risk": "HIGH_DEMAND"
            })

    return risks