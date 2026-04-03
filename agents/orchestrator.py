from typing import Dict
from db.db import nurse_collection, patient_collection
from agents.planner_agent import planner_agent
from agents.evaluator_agent import evaluator_agent
from services.scheduler_service import schedule_patients_service


def run_orchestrator(max_iter=8, target_score=90, reset=True, use_daily_limit=True):
    best_score = -1
    best_result = None
    prev_eval = None

    for i in range(max_iter):
        nurses = list(nurse_collection.find())
        patients = list(patient_collection.find())

        normalized = {}
        if prev_eval:
            normalized = {
                "unassigned_ratio": prev_eval.get("unassigned_count", 0) / max(1, len(patients)),
                "std_load_ratio": prev_eval.get("std_load", 0) / 480
            }

        # Planner
        config = planner_agent(summary={"normalized": normalized}, prev_eval=prev_eval)

        # Executor - Truyền thêm use_daily_limit
        assignments = schedule_patients_service(
            config=config, 
            reset=reset,
            use_daily_limit=use_daily_limit
        )

        # Evaluator
        eval_result = evaluator_agent(assignments, patients, nurses)
        score = eval_result.get("overall_score", 0)
        print(f"Iteration {i+1}: score = {score:.2f} | daily_limit={use_daily_limit}")

        if score > best_score:
            best_score = score
            best_result = {
                "config": config,
                "assignments": assignments,
                "metrics": eval_result
            }

        prev_eval = eval_result
        if score >= target_score:
            break

    return {
        "best_score": best_score,
        "best_config": best_result["config"] if best_result else None,
        "metrics": best_result["metrics"] if best_result else None,
        "sample_assignments": best_result["assignments"][:5] if best_result else [],
        "used_daily_limit": use_daily_limit
    }