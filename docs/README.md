# VisaLiv Employer Outreach Automation CRM

VisaLiv Employer Outreach Automation CRM is an internal platform for managing employer outreach, candidate/job applications, email communication, and automation workflows.

The system is being developed with a FastAPI backend, PostgreSQL database, frontend application, Gmail integration, and scheduled automation.

---

## Project Status

**Status:** Active Development


# Tech Stack

## Frontend

- JavaScript
- Frontend application in `/frontend`

## Backend

- Python 3.12+
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- Psycopg 3
- APScheduler

## Database

- PostgreSQL 18
- Local development database

---

# Project Structure

```text
VisaLiv Employer Outreach Automation CRM/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── uv.lock
│
├── frontend/
│
├── docs/
│
└── uploads/
