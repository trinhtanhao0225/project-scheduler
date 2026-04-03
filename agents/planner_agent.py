import json
import re
import ollama
from typing import Dict


# =========================
# Trích xuất JSON sạch
# =========================
def extract_json(text: str) -> dict:
    stack = []
    start = -1

    for i, ch in enumerate(text):
        if ch == "{":
            if not stack:
                start = i
            stack.append(ch)
        elif ch == "}":
            if stack:
                stack.pop()
                if not stack and start != -1:
                    json_str = text[start:i + 1]
                    break
    else:
        raise ValueError("Không tìm thấy JSON hợp lệ")

    # Xóa comment và dấu phẩy thừa
    json_str = re.sub(r"//.*", "", json_str)
    json_str = re.sub(r",\s*}", "}", json_str)
    json_str = re.sub(r",\s*]", "]", json_str)

    return json.loads(json_str)


# =========================
# Kiểm tra key + ép kiểu int
# =========================
def validate_weights(weights: dict) -> dict:
    keys = {
        "weight_skill_match",
        "weight_workload_balance",
        "weight_fairness",
        "weight_patient_continuity"
    }
    fixed = {}
    for k in keys:
        try:
            fixed[k] = int(weights.get(k, 25))
        except:
            fixed[k] = 25
    return fixed


# =========================
# Chuẩn hóa tổng trọng số về 100
# =========================
def normalize_weights(weights: dict) -> dict:
    total = sum(weights.values())
    if total == 0:
        return {k: 25 for k in weights}
    factor = 100 / total
    normalized = {k: int(v * factor) for k, v in weights.items()}
    diff = 100 - sum(normalized.values())
    if diff != 0:
        first_key = list(normalized.keys())[0]
        normalized[first_key] += diff
    return normalized


# =========================
# Planner agent
# =========================
def planner_agent(summary: Dict, prev_eval: Dict = None) -> Dict[str, int]:
    normalized = summary.get("normalized", {})

    prompt = f"""
Bạn là chuyên gia tối ưu hóa lịch trình điều dưỡng.

Chỉ số chuẩn hóa:
{json.dumps(normalized)}

Kết quả đánh giá trước đó:
{json.dumps(prev_eval or {})}

Điều chỉnh trọng số dựa trên tình hình, tổng trọng số 80-120.
Chỉ trả về JSON, tất cả giá trị là integer, KHÔNG giải thích, KHÔNG comment.
Trả về định dạng:
{{
  "weight_skill_match": 30,
  "weight_workload_balance": 30,
  "weight_fairness": 30,
  "weight_patient_continuity": 10
}}
"""

    try:
        response = ollama.chat(
            model="mistral",
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.1}
        )
        text = response["message"]["content"]

        for attempt in range(2):
            try:
                weights = extract_json(text)
                weights = validate_weights(weights)
                for k in weights:
                    weights[k] = max(5, min(60, weights[k]))
                return normalize_weights(weights)
            except Exception as e:
                fix_prompt = f"Hãy sửa lại text này thành JSON hợp lệ, chỉ trả JSON:\n{text}"
                fix_response = ollama.chat(
                    model="mistral",
                    messages=[{"role": "user", "content": fix_prompt}],
                    options={"temperature": 0.0}
                )
                text = fix_response["message"]["content"]

        raise ValueError("Không parse JSON sau 2 lần")

    except Exception as e:
        print("Planner fallback:", e)
        return {
            "weight_skill_match": 40,
            "weight_workload_balance": 30,
            "weight_fairness": 20,
            "weight_patient_continuity": 10
        }