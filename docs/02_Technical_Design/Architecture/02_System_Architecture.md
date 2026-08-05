# 02. System Architecture

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | System Architecture |
| Version | 1.0 |
| Status | Frozen |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document describes the high-level architecture of the VisaLiv Employer Outreach Automation CRM.

It illustrates how the major system components interact with each other.

---

# 2. Architecture Overview

```
                Admin
                  │
                  ▼
        React Admin Panel
                  │
          HTTPS / REST API
                  │
                  ▼
          FastAPI Backend
                  │
     ┌────────────┼────────────┐
     │            │            │
     ▼            ▼            ▼
 Business     Automation   Gmail API
  Services      Engine
     │            │
     └──────┬─────┘
            ▼
      PostgreSQL Database
```

---

# 3. System Components

| Component | Responsibility |
|-----------|----------------|
| React Frontend | Admin User Interface |
| FastAPI Backend | API & Business Logic |
| Business Services | Process business rules |
| Automation Engine | Execute employer outreach automation |
| Gmail API | Send emails using student Gmail accounts |
| PostgreSQL | Store application data |

---

# 4. Request Flow

```
Admin

↓

React Frontend

↓

FastAPI API

↓

Business Service

↓

Repository

↓

PostgreSQL
```

---

# 5. Automation Flow

```
Scheduler

↓

Automation Engine

↓

Business Services

↓

Queue

↓

Gmail API

↓

Employer

↓

Workflow Update
```

---

# 6. External Integrations

| Service | Purpose |
|----------|---------|
| Gmail API | Send emails |
| OAuth 2.0 | Gmail Authentication |

---

# 7. Architecture Principles

- Layered Architecture
- RESTful APIs
- Separation of Concerns
- Modular Design
- Single Responsibility
- Database First Design

---

# 8. Notes

- The frontend communicates only with the backend.
- The backend is responsible for all business logic.
- Direct database access from the frontend is not allowed.
- External services are accessed only through the integration layer.

---

# 9. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial System Architecture |