from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")

db = client["hospital_db"]

patient_collection = db["patients"]
nurse_collection = db["nurses"]
schedule_collection = db["schedule"]
daily_shift_collection = db["daily_shifts"]