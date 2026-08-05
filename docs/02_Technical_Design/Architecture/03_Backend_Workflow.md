# 03. Backend Workflow

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Backend Workflow |
| Version | 1.0 |
| Status | Frozen |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the backend request lifecycle and automation workflow.

It provides a standard execution flow for all backend operations.

---

# 2. Standard Request Flow

```
Client Request
      │
      ▼
API Router
      │
      ▼
Service Layer
      │
      ▼
Repository Layer
      │
      ▼
Database
      │
      ▼
Response
```

---

# 3. Layer Responsibilities

| Layer | Responsibility |
|--------|----------------|
| API Router | Receive requests and return responses |
| Service Layer | Execute business logic |
| Repository Layer | Perform database operations |
| Database | Store and retrieve data |

---

# 4. Authentication Flow

```
Admin Login

↓

Authentication API

↓

Validate Credentials

↓

Generate JWT Tokens

↓

Return Access Token + Refresh Token
```

---

# 5. CRUD Workflow

```
Request

↓

API Router

↓

Validation

↓

Service

↓

Repository

↓

Database

↓

Response
```

---

# 6. Automation Workflow

```
Scheduler

↓

Automation Engine

↓

Load Eligible Students

↓

Select Eligible Employers

↓

Apply Business Rules

↓

Create Queue

↓

Email Sending

↓

Save Email History

↓

Create / Update Workflow

↓

Complete
```

---

# 7. Dashboard Workflow

```
Dashboard Request

↓

API Router

↓

Service

↓

Collect Statistics

↓

Database

↓

Dashboard Response
```

---

# 8. Error Flow

```
Request

↓

Validation Failed

↓

Return Error Response
```

or

```
Request

↓

Unexpected Exception

↓

Log Error

↓

Return Internal Server Error
```

---

# 9. Workflow Principles

- API Router handles HTTP communication.
- Service Layer contains business logic.
- Repository Layer accesses the database.
- Services do not access the database directly.
- Repositories do not contain business logic.

---

# 10. Notes

- All backend modules must follow this workflow.
- Business rules are implemented only in the Service Layer.
- Database access must always go through the Repository Layer.

---

# 11. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Backend Workflow |