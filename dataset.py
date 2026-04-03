import random
from datetime import datetime, timedelta
from db.db import nurse_col, patient_col

random.seed(42)


def generate_nurses(n=30):
    nurses = []

    for i in range(n):
        nurse = {
            "id": f"N{i}",
            "max_hours": 8,
            "skill": random.choice(["general", "icu"]),
        }
        nurses.append(nurse)

    nurse_col.delete_many({})
    nurse_col.insert_many(nurses)

    return nurses


def generate_patients(n=100):
    base = datetime(2026, 1, 1)
    patients = []

    for i in range(n):
        patient = {
            "id": f"P{i}",
            "required_skill": random.choice(["general", "icu"]),
            "start": (base + timedelta(hours=random.randint(0, 23))).isoformat(),
            "duration": random.randint(1, 3),
        }
        patients.append(patient)

    patient_col.delete_many({})
    patient_col.insert_many(patients)

    return patients