def build_recommendation(metrics: dict) -> str:

    if metrics.get("unassigned_count", 0) > 0:
        return "Một số bệnh nhân chưa được phân công. Nên tăng số lượng y tá hoặc giảm thời gian chăm sóc."

    if metrics.get("load_ratio_max_min", 0) > 2:
        return "Phân bổ tải chưa đều. Nên tăng weight_workload_balance."

    if metrics.get("fairness_score", 100) < 60:
        return "Độ công bằng thấp. Nên tăng weight_fairness."

    if metrics.get("stress_count", 0) > 0:
        return "Một số y tá đang quá tải (>85% capacity). Nên cân bằng lại lịch."

    return "Lịch hiện tại khá ổn định."