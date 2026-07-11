# 🚀 CodePilot AI Setup & Run Guide

Follow this guide to get CodePilot AI up and running on your local Windows system.

---

## 📋 Prerequisites

Ensure you have the following installed:
* **Python**: `3.11.x`
* **Node.js**: `≥ 18.x`
* **Docker Desktop**: Running (required for PostgreSQL, Redis, Qdrant, MinIO)
* **Git**: Latest version

---

## 🛠️ Step-by-Step Execution Guide

### Step 1: Start Docker Infrastructure
From the project root (where `docker-compose.yml` is located), spin up the database, vector store, message broker, object storage, and observability containers:
```powershell
docker compose up -d
```
Verify all containers are up and healthy:
```powershell
docker compose ps
```

---

### Step 2: Backend Setup

1. **Navigate to the backend directory:**
   ```powershell
   cd backend
   ```

2. **Activate the virtual environment:**
   ```powershell
   .\venv\Scripts\activate
   ```

3. **Verify/Install dependencies:**
   The `requirements.txt` is fully up-to-date. If you need to re-verify or install missing packages, run:
   ```powershell
   pip install -r requirements.txt
   ```

4. **Run database migrations:**
   Run Alembic to create the database schemas and tables in PostgreSQL:
   ```powershell
   alembic upgrade head
   ```

5. **Start the FastAPI server:**
   Start the API server in reload mode for development:
   ```powershell
   uvicorn main:app --reload --port 8000
   ```

---

### Step 3: Start Celery Worker (Windows-Specific)
Open a **new** terminal window, navigate to the `backend` directory, activate the virtual environment, and start the Celery worker.

> [!IMPORTANT]
> Because standard Celery multitasking (prefork pool) is not supported natively on Windows, you must run the worker using the `solo` pool executor:
```powershell
cd backend
.\venv\Scripts\activate
celery -A celery_app worker --loglevel=info -Q indexing,default -P solo
```

---

### Step 4: Frontend Setup
Open another **new** terminal window, navigate to the `frontend` directory, install packages, and start the Vite dev server:
```powershell
cd frontend
npm install
npm run dev
```

---

## 🌐 Available Services & Endpoints

Once all services are started, you can access them at the following addresses:

| Service | Address / Port | Purpose |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Core user interface |
| **FastAPI Swagger Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API testing |
| **Celery Flower Dashboard** | [http://localhost:5555](http://localhost:5555) | Background task queue monitoring |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | System metric collection |
| **Grafana** | [http://localhost:3000](http://localhost:3000) | Observability dashboards (`admin` / `codepilot_grafana_pass`) |

---

## 🔧 Running Unit Tests
To verify everything is working perfectly, you can run the backend pytest suite inside your active virtual environment:
```powershell
cd backend
.\venv\Scripts\python -m pytest --ignore=repos
```
