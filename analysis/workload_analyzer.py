from typing import Dict, List


def analyze_workload(assignments: List[dict], nurses: List[dict]) -> Dict:

    # convert nurse ids to string
    nurse_ids = [str(n["_id"]) for n in nurses]

    nurse_load = {nid: 0 for nid in nurse_ids}

    for a in assignments:

        nid = str(a.get("nurse_id"))

        if not nid or nid == "unassigned":
            continue

        minutes = a.get("care_minutes", 0)

        nurse_load[nid] = nurse_load.get(nid, 0) + minutes

    utilization = {}
    stress_nurses = []

    for n in nurses:

        nid = str(n["_id"])

        capacity = n.get("max_minutes", 8) * 60

        load = nurse_load.get(nid, 0)

        util = round(load / capacity, 2) if capacity else 0

        utilization[nid] = util

        if util > 0.85:
            stress_nurses.append({
                "nurse_id": nid,
                "utilization": util
            })

    return {
        "nurse_load": nurse_load,
        "utilization": utilization,
        "stress_nurses": stress_nurses,
        "stress_count": len(stress_nurses)
    }