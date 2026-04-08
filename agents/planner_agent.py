import json
import re
import ollama
from typing import Dict, Optional

def extract_json(text: str) -> dict:
    # Cải tiến extract_json - tìm tất cả JSON có thể
    json_pattern = r'\{[^{}]*(\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, text, re.DOTALL)
    
    for match in matches:
        try:
            json_str = "{" + match + "}" if not match.startswith("{") else match
            json_str = re.sub(r"//.*", "", json_str)
            json_str = re.sub(r",\s*}", "}", json_str)
            json_str = re.sub(r",\s*]", "]", json_str)
            return json.loads(json_str)
        except:
            continue
    
    # Fallback: tìm dấu { đầu tiên và } cuối cùng
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        try:
            json_str = text[start:end+1]
            json_str = re.sub(r"//.*", "", json_str)
            json_str = re.sub(r",\s*}", "}", json_str)
            json_str = re.sub(r",\s*]", "]", json_str)
            return json.loads(json_str)
        except:
            pass
    raise ValueError("Không tìm thấy JSON hợp lệ")


def planner_agent(summary: Dict, prev_eval: Dict = None) -> Dict[str, int]:
    """
    Planner Agent được tối ưu để thực sự điều chỉnh weights động
    """
    unassigned_ratio = 0
    std_load_ratio = 0
    overall_score = 0

    if prev_eval:
        unassigned_ratio = prev_eval.get("unassigned_ratio", 0) 
        std_load_ratio = prev_eval.get("std_load_ratio", 0)
        overall_score = prev_eval.get("overall_score", 0)

    prompt = f"""Bạn là chuyên gia tối ưu hóa lịch trình y tá thông minh và rất khắt khe.

Tình hình hiện tại:
- Tỷ lệ bệnh nhân chưa được phân công: {unassigned_ratio:.1%}
- Độ lệch tải công việc (std_load_ratio): {std_load_ratio:.3f}
- Điểm tổng thể lần trước: {overall_score}/100

Mục tiêu:
- Giảm tối đa bệnh nhân chưa phân công (ưu tiên cao nếu unassigned_ratio > 15%)
- Cân bằng tải công việc giữa các y tá (ưu tiên nếu std_load_ratio > 0.25)
- Duy trì sự công bằng và continuity bệnh nhân

Hãy điều chỉnh 4 trọng số sau đây một cách thông minh, phù hợp với tình hình trên.
Tổng 4 trọng số phải nằm trong khoảng 95 - 105.

Trả về **CHỈ JSON**, không giải thích, không chữ thừa, không comment:

{{
  "weight_skill_match": số nguyên,
  "weight_workload_balance": số nguyên,
  "weight_fairness": số nguyên,
  "weight_patient_continuity": số nguyên
}}

Ví dụ tốt:
- Nếu nhiều bệnh nhân chưa assign → tăng weight_skill_match và weight_workload_balance
- Nếu tải rất lệch → tăng mạnh weight_workload_balance
- Nếu đã cân bằng tốt → có thể tăng weight_patient_continuity
"""

    try:
        response = ollama.chat(
            model="qwen2.5:7b",           # Bạn có thể thử "llama3.2" hoặc "qwen2.5" nếu máy mạnh
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.2, "num_ctx": 4096}
        )
        
        text = response["message"]["content"].strip()
        print("Raw planner response:", text[:300] + "..." if len(text) > 300 else text)

        # Thử parse nhiều lần
        for attempt in range(3):
            try:
                weights = extract_json(text)
                
                # Validate và giới hạn
                fixed = {
                    "weight_skill_match": int(weights.get("weight_skill_match", 35)),
                    "weight_workload_balance": int(weights.get("weight_workload_balance", 30)),
                    "weight_fairness": int(weights.get("weight_fairness", 20)),
                    "weight_patient_continuity": int(weights.get("weight_patient_continuity", 15))
                }

                # Giới hạn mỗi trọng số
                for k in fixed:
                    fixed[k] = max(10, min(55, fixed[k]))

                normalized = normalize_weights(fixed)
                print(f"→ Planner decided weights: {normalized}")
                return normalized

            except Exception as e:
                print(f"Parse attempt {attempt+1} failed: {e}")
                if attempt < 2:
                    # Fix prompt
                    fix_prompt = f"Chỉ trả về đúng JSON, không thêm chữ nào khác:\n{text}"
                    fix_resp = ollama.chat(
                        model="mistral",
                        messages=[{"role": "user", "content": fix_prompt}],
                        options={"temperature": 0.0}
                    )
                    text = fix_resp["message"]["content"].strip()

        # Fallback tốt hơn
        print("Planner fallback triggered")
        return {
            "weight_skill_match": 40,
            "weight_workload_balance": 35,
            "weight_fairness": 15,
            "weight_patient_continuity": 10
        }

    except Exception as e:
        print(f"Planner agent error: {e}")
        return {
            "weight_skill_match": 40,
            "weight_workload_balance": 30,
            "weight_fairness": 20,
            "weight_patient_continuity": 10
        }


# Giữ nguyên 2 hàm này
def normalize_weights(weights: dict) -> dict:
    total = sum(weights.values())
    if total == 0:
        return {k: 25 for k in weights}
    
    factor = 100 / total
    normalized = {k: round(v * factor) for k, v in weights.items()}
    
    diff = 100 - sum(normalized.values())
    if diff != 0:
        # Thêm/chia diff cho trọng số quan trọng nhất
        normalized["weight_workload_balance"] = normalized.get("weight_workload_balance", 25) + diff
    
    return normalized