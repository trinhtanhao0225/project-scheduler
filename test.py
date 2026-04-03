# test_orchestrator.py
from agents.orchestrator import run_orchestrator

def test_orchestrator():
    """
    Test pipeline planner → executor → evaluator → orchestrator
    """
    print("===== START ORCHESTRATOR TEST =====")
    
    # max_iter=5 để test nhanh
    result = run_orchestrator(max_iter=5, target_score=90)
    
    print("\n=== BEST SCORE ===")
    print(result["best_score"])
    
    print("\n=== BEST CONFIG ===")
    for k, v in result["best_config"].items():
        print(f"{k}: {v}")
    
    print("\n=== METRICS ===")
    for k, v in result["metrics"].items():
        if k != "next_weight_suggestion":
            print(f"{k}: {v}")
    
    print("\n=== NEXT WEIGHT SUGGESTION ===")
    for k, v in result["metrics"]["next_weight_suggestion"].items():
        print(f"{k}: {v}")
    
    print("\n=== SAMPLE ASSIGNMENTS (first 5) ===")
    for a in result["sample_assignments"]:
        print(f"Patient {a.get('patient_id')} → Nurse(s): {a.get('nurse_ids')}, care {a.get('care_minutes')} min")
    
    print("\n===== TEST COMPLETE =====")

if __name__ == "__main__":
    test_orchestrator()