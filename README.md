# 🏥 ProjectScheduler  
**Intelligent Nurse–Patient Scheduling System**

---

## 🌟 Overview
ProjectScheduler is an intelligent scheduling system designed for hospital environments.  
It simulates realistic healthcare data, assigns patients to nurses under strict constraints, and leverages AI to optimize and explain scheduling decisions.

The system is built with scalability, extensibility, and production-readiness in mind.

---

## 🧩 Objectives
- Generate realistic synthetic healthcare datasets  
- Implement constraint-based nurse–patient assignment  
- Integrate AI for optimization and decision explanation  
- Ensure modular architecture for easy scaling to production  

---

## 🏗️ System Architecture

### 🔹 API Layer (FastAPI)
- `main.py`
- `routers/`
  - `nurse`
  - `patient`
  - `daily_shift`
  - `scheduler`
  - `agent`

### 🔹 Domain Models
- `Nurse.py`
- `Patient.py`
- `DailyShift.py`
- `Schedule.py`

### 🔹 Data Layer
- `db.py` (MongoDB collections)

### 🔹 Service Layer
- `scheduler_service.py`  
  → Assign patients to nurses using scoring & constraints  
- `daily_shift_service.py`  
  → Manage nurse workload limits  

### 🔹 Core Constraints
- `constraint_checker.py`

### 🔹 AI Agent System
- `planner_agent.py` → Suggests weight configurations (Ollama / Mistral)  
- `evaluator_agent.py` → Evaluates performance & generates insights  
- `orchestrator.py` → Iterative optimization loop  

---

## ⚙️ Key Components

### 📦 Synthetic Data Generation
- `dataset.py`

### 🧠 Scheduling Engine
- `schedule_patients_service()`

### 📊 Scoring Factors
- Patient priority  
- Skill matching  
- Workload balance  
- Delay penalty  
- Daily shift limits  

### 🔁 Optimization Loop
- `orchestrator.run_orchestrator()`
  - Iterative refinement (`max_iter`)
  - Target score optimization  
  - Dynamic configuration based on previous evaluations  

---

## 📈 Constraints & Advanced Features
- 8-hour working limit per nurse/day  
- Nurse–patient ratio control  
- No shift overlap, strict time constraints  
- Daily shift workload management  

### 📊 Metrics
- **Overload ratio**
- **Standard deviation of daily workload**

### 🤖 AI Insights
- Strengths / weaknesses  
- Suggested improvements  

---

## ✅ Milestone 1 (Completed)
- Synthetic dataset generation  
- Automated scheduling for ≥100 patients  
- Constraint violation detection:
  - Unassigned patients  
  - Overloaded nurses  
- AI-based explanation & adjustment suggestions  
- Scalable and modular architecture  

---

## 🧪 Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt

### 2. Start MongoDB
Make sure MongoDB is running locally

### 3. Run backend
```bash
uvicorn main:app --reload

### 3. Run /frontend
```bash
npm run dev
