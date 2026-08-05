# 02. API List

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | API List |
| Version | 1.0 |
| Status | Frozen |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document provides a complete list of REST API endpoints used in the VisaLiv Employer Outreach Automation CRM.

Detailed API behavior is implemented in the backend and documented automatically using FastAPI Swagger.

---

# 2. Authentication

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/v1/auth/login | Admin Login |
| POST | /api/v1/auth/logout | Admin Logout |
| POST | /api/v1/auth/refresh | Refresh Access Token |
| GET | /api/v1/auth/me | Get Logged-in Admin |

---

# 3. Students

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/v1/students | List Students |
| GET | /api/v1/students/{id} | Student Details |
| POST | /api/v1/students | Create Student |
| PUT | /api/v1/students/{id} | Update Student |
| DELETE | /api/v1/students/{id} | Delete Student |

---

# 4. Employers

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/v1/employers | List Employers |
| GET | /api/v1/employers/{id} | Employer Details |
| POST | /api/v1/employers | Create Employer |
| PUT | /api/v1/employers/{id} | Update Employer |
| DELETE | /api/v1/employers/{id} | Delete Employer |

---

# 5. Gmail Accounts

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/v1/gmail | Gmail Account Details |
| POST | /api/v1/gmail/connect | Connect Gmail |
| POST | /api/v1/gmail/disconnect | Disconnect Gmail |
| GET | /api/v1/gmail/status | Gmail Connection Status |

---

# 6. Email Templates

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/v1/email-templates | List Templates |
| GET | /api/v1/email-templates/{id} | Template Details |
| POST | /api/v1/email-templates | Create Template |
| PUT | /api/v1/email-templates/{id} | Update Template |
| DELETE | /api/v1/email-templates/{id} | Delete Template |

---

# 7. Automation

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/v1/automation/start | Start Automation |
| GET | /api/v1/automation/status | Current Status |
| GET | /api/v1/automation/history | Automation History |

---

# 8. Queue

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/v1/queues | List Queue Items |
| GET | /api/v1/queues/{id} | Queue Details |
| GET | /api/v1/queues/pending | Pending Queue |

---

# 9. Workflow

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/v1/workflows | List Workflows |
| GET | /api/v1/workflows/{id} | Workflow Details |
| PATCH | /api/v1/workflows/{id} | Update Workflow Status |

---

# 10. Dashboard

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/v1/dashboard/summary | Dashboard Summary |
| GET | /api/v1/dashboard/statistics | Dashboard Statistics |
| GET | /api/v1/dashboard/recent-activity | Recent Activity |

---

# 11. Notes

- All APIs follow **API Standards v1.0**.
- Authentication is required for all endpoints unless specified otherwise.
- API request and response schemas are generated automatically through FastAPI Swagger.

---

# 12. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial API Endpoint List |