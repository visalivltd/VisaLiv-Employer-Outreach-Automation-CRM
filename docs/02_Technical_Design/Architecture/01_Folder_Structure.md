# 01. Folder Structure

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Folder Structure |
| Version | 1.0 |
| Status | Frozen |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the standard project folder structure.

All development must follow this structure.

---

# 2. Project Structure

```text
visaliv-employer-outreach-crm/

│
├── backend/
│
├── frontend/
│
├── docs/
│
├── uploads/
│   ├── resumes/
│   └── excel/
│
├── scripts/
│
├── .gitignore
├── README.md
```

---

# 3. Backend Structure

```text
backend/

├── app/
│
│   ├── api/
│   │
│   ├── core/
│   │
│   ├── db/
│   │
│   ├── models/
│   │
│   ├── schemas/
│   │
│   ├── repositories/
│   │
│   ├── services/
│   │
│   ├── automation/
│   │
│   ├── scheduler/
│   │
│   ├── integrations/
│   │
│   ├── utils/
│   │
│   └── main.py
│
├── alembic/
│
├── tests/
│
├── .env
├── pyproject.toml
└── uv.lock
```

---

# 4. Frontend Structure

```text
frontend/

├── src/
│
│   ├── api/
│   ├── assets/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── store/
│   ├── types/
│   ├── utils/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── public/
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

# 5. Documentation Structure

```text
docs/

├── README.md
├── ARCHITECTURE_DECISIONS.md
│
├── 00_Project/
├── 01_Functional_Design/
├── 02_Technical_Design/
├── 03_Development/
├── 04_Testing/
└── 05_Deployment/
```

---

# 6. Folder Responsibilities

| Folder | Responsibility |
|---------|----------------|
| api | API Routes |
| core | Configuration & Security |
| db | Database Configuration |
| models | SQLAlchemy Models |
| schemas | Pydantic Schemas |
| repositories | Database Operations |
| services | Business Logic |
| automation | Automation Engine |
| scheduler | APScheduler Jobs |
| integrations | Gmail & External Services |
| utils | Shared Utilities |
| tests | Unit & Integration Tests |

---

# 7. Notes

- Every module must follow this structure.
- Business logic belongs only in the `services` layer.
- Database operations belong only in the `repositories` layer.
- External integrations must remain inside the `integrations` folder.

---

# 8. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Folder Structure |