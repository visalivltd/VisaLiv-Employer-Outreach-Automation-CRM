# 00. Technology Stack

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Technology Stack |
| Version | 1.0 |
| Status | Approved |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the approved technology stack for the VisaLiv Employer Outreach Automation CRM.

All development must follow the technologies listed in this document.

---

# 2. Technology Overview

| Layer | Technology |
|--------|------------|
| Backend | Python 3.13 + FastAPI |
| Frontend | React 19 + TypeScript + Vite |
| Database | PostgreSQL 17 |
| ORM | SQLAlchemy 2.x |
| Validation | Pydantic v2 |
| Database Migration | Alembic |
| Scheduler | APScheduler |
| Authentication | JWT |
| Password Hashing | Passlib (bcrypt) |
| Email Integration | Gmail API + OAuth 2.0 |
| API Documentation | Swagger UI (OpenAPI) |
| Package Manager | uv |
| Version Control | Git |
| Repository | GitHub |

---

# 3. Backend Stack

| Component | Technology |
|-----------|------------|
| Programming Language | Python 3.13 |
| Framework | FastAPI |
| ORM | SQLAlchemy 2.x |
| Validation | Pydantic v2 |
| Scheduler | APScheduler |
| Package Manager | uv |
| Dependency Injection | FastAPI Dependency Injection |
| Authentication | JWT |
| Password Hashing | Passlib (bcrypt) |
| API Documentation | Swagger UI |

---

# 4. Frontend Stack

| Component | Technology |
|-----------|------------|
| Programming Language | TypeScript |
| Framework | React 19 |
| Build Tool | Vite |
| UI Framework | Tailwind CSS |
| Component Library | shadcn/ui |
| Icons | Lucide React |
| State Management | Zustand |
| Routing | React Router |
| Forms | React Hook Form |
| HTTP Client | Axios |

---

# 5. Database Stack

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL 17 |
| ORM | SQLAlchemy |
| Migration Tool | Alembic |
| Database Tool | pgAdmin 4 |

---

# 6. Email Integration

| Component | Technology |
|-----------|------------|
| Email Provider | Gmail API |
| Authentication | OAuth 2.0 |
| Attachment Support | Gmail API Attachments |

---

# 7. File Processing

| Component | Technology |
|-----------|------------|
| Excel Processing | pandas |
| Excel Reader | openpyxl |
| Resume Storage | Local File System (MVP) |

---

# 8. Development Tools

| Tool | Technology |
|------|------------|
| IDE | Visual Studio Code |
| Version Control | Git |
| Repository | GitHub |
| API Testing | Postman |
| Database Management | pgAdmin 4 |

---

# 9. Testing

| Component | Technology |
|-----------|------------|
| Backend Testing | pytest |
| API Testing | Postman |
| Frontend Testing | Vitest (Future) |

---

# 10. Deployment

| Component | Technology |
|-----------|------------|
| Operating System | Ubuntu 24.04 LTS |
| ASGI Server | Uvicorn |
| Reverse Proxy | Nginx |
| Process Manager | systemd |

---

# 11. Future Technologies

The following technologies are planned for future releases.

| Technology | Purpose |
|------------|---------|
| Redis | Caching |
| Celery | Distributed Background Jobs |
| Docker | Containerization |
| GitHub Actions | CI/CD |
| Prometheus | Monitoring |
| Grafana | Dashboards |
| Sentry | Error Tracking |
| AWS S3 | Cloud Resume Storage |

---

# 12. Technology Selection Principles

The selected technologies follow these principles:

- Open-source
- Production-ready
- Enterprise-grade
- Actively maintained
- Scalable
- Secure
- Well documented
- Strong community support

---

# 13. Notes

- This document is the official technology reference for the project.
- New technologies must be reviewed before adoption.
- Any technology change requires an update to this document.

---

# 14. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Approved Technology Stack |