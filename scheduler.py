def assign_patients_to_nurses(patients, nurses):
    schedule = []

    nurse_workload = {n["_id"]: 0 for n in nurses}

    for patient in patients:
        for nurse in nurses:
            # constraint 1: skill match
            if not set(patient["required_skills"]).issubset(set(nurse["skills"])):
                continue

            # constraint 2: max 8h = 480 minutes
            if nurse_workload[nurse["_id"]] + patient["care_minutes"] > 480:
                continue

            # assign
            nurse_workload[nurse["_id"]] += patient["care_minutes"]

            schedule.append({
                "patient_id": str(patient["_id"]),
                "nurse_id": str(nurse["_id"])
            })

            break

    return schedule