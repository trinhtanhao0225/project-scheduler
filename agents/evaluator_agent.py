import json
import re
from typing import List, Dict
import ollama
from db.db import daily_shift_collection
from datetime import date


def compute_metrics(assignments: List[Dict], patients: List[Dict], nurses: List[Dict]) -> Dict:
    assigned = [a for a in assignments if a.get("nurse_ids") != ["unassigned"]]
    total = len(patients)
    unassigned = total - len(assigned)

    # Tính load theo ngày (quan trọng hơn load tổng)
    daily_load = {}        # (nurse_id, date) -> minutes
    overload_count = 0
    total_daily_slots = 0

    for a in assigned:
        for nurse_id in a["nurse_ids"]:
            # Lấy ngày từ assignment
            assign_date_str = a.get("date")
            if not assign_date_str:
                continue
            assign_date = date.fromisoformat(assign_date_str)
            
            key = (nurse_id, assign_date)
            daily_load[key] = daily_load.get(key, 0) + a.get("care_minutes", a.get("duration", 0))

    # Kiểm tra overload từ Daily Shift collection
    for (nurse_id, d), minutes in daily_load.items():
        shift = daily_shift_collection.find_one({"nurse_id": nurse_id, "shift_date": d})
        if shift:
            max_min = shift.get("max_minutes", 480)
            if minutes > max_min:
                overload_count += 1
            total_daily_slots += 1

    loads = list(daily_load.values())
    avg_load = sum(loads) / len(loads) if loads else 0
    std_load = (sum((x - avg_load)**2 for x in loads) / len(loads))**0.5 if loads else 0

    return {
        "assigned_count": len(assigned),
        "unassigned_count": unassigned,
        "assign_percentage": round(len(assigned) / total * 100, 1) if total else 0,
        "avg_daily_load": round(avg_load, 2),
        "std_daily_load": round(std_load, 2),
        "daily_overload_count": overload_count,
        "total_daily_slots_checked": total_daily_slots,
        "overload_ratio": round(overload_count / max(1, total_daily_slots) * 100, 1) if total_daily_slots else 0,
    }


def compute_score(metrics: Dict) -> float:
    assign_rate = metrics["assign_percentage"] / 100
    overload_penalty = metrics["overload_ratio"] / 100

    # Score mới: ưu tiên assign cao + phạt nặng overload
    score = (
        assign_rate * 0.55 +
        (1 - overload_penalty) * 0.35 +
        (1 - min(metrics.get("std_daily_load", 0) / 480, 1)) * 0.10
    ) * 100

    return round(max(0, min(100, score)), 1)


def evaluator_agent(assignments: List[Dict], patients: List[Dict], nurses: List[Dict]):
    metrics = compute_metrics(assignments, patients, nurses)
    score = compute_score(metrics)

    prompt = f"""
You are a senior hospital scheduling evaluator.
Evaluate the quality of this nurse-patient assignment with focus on daily workload limits.

Metrics:
{json.dumps(metrics, indent=2)}

Return only valid JSON:
{{
  "overall_score": {score},
  "insight": "Short analysis about scheduling quality, especially daily limits and overload...",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "next_weight_suggestion": {{
    "weight_skill_match": int,
    "weight_workload_balance": int,
    "weight_fairness": int,
    "weight_patient_continuity": int
  }}
}}
"""

    try:
        res = ollama.chat(
            model="mistral",
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.3}
        )
        text = res["message"]["content"]
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            result = json.loads(match.group())
            result.update(metrics)   # merge metrics
            return result
    except Exception as e:
        print("Evaluator fallback:", e)

    # Fallback
    return {
        "overall_score": score,
        "insight": "Fallback evaluation - Daily overload is the main concern.",
        "strengths": ["Good assignment rate"],
        "weaknesses": ["Need better daily workload balancing"],
        "next_weight_suggestion": {
            "weight_skill_match": 40,
            "weight_workload_balance": 50,
            "weight_fairness": 5,
            "weight_patient_continuity": 5
        },
        **metrics
    }