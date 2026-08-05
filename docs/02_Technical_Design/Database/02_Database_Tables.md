# 02. Database Tables

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Database Tables |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines all database tables and their logical columns required for the VisaLiv Employer Outreach Automation CRM.

---

# 2. Tables Overview

| Table | Purpose |
|--------|---------|
| admins | System administrators |
| students | Student information |
| employers | Employer information |
| gmail_accounts | Gmail connection details |
| email_templates | Email templates |
| automation_runs | Automation execution records |
| queues | Email queue records |
| email_history | Sent email history |
| workflows | Application workflow |

---

# 3. Table Definitions

---

## 3.1 admins

| Column |
|----------|
| id |
| name |
| email |
| password |
| status |
| last_login_at |
| created_at |
| updated_at |

---

## 3.2 students

| Column |
|----------|
| id |
| full_name |
| email |
| password |
| resume_file |
| status |
| created_by |
| created_at |
| updated_at |

---

## 3.3 employers

| Column |
|----------|
| id |
| company_name |
| contact_name |
| email |
| status |
| last_contacted_at |
| created_at |
| updated_at |

---

## 3.4 gmail_accounts

| Column |
|----------|
| id |
| student_id |
| gmail_email |
| connection_status |
| availability_status |
| connected_at |
| disconnected_at |
| created_at |
| updated_at |

---

## 3.5 email_templates

| Column |
|----------|
| id |
| template_name |
| subject |
| body |
| status |
| created_at |
| updated_at |

---

## 3.6 automation_runs

| Column |
|----------|
| id |
| started_by |
| started_at |
| completed_at |
| status |
| total_students |
| processed_students |
| total_queue_items |
| created_at |

---

## 3.7 queues

| Column |
|----------|
| id |
| automation_run_id |
| student_id |
| employer_id |
| template_id |
| status |
| queued_at |
| processed_at |
| created_at |
| updated_at |

---

## 3.8 email_history

| Column |
|----------|
| id |
| queue_id |
| student_id |
| employer_id |
| template_id |
| sent_at |
| delivery_status |
| error_message |
| created_at |

---

## 3.9 workflows

| Column |
|----------|
| id |
| email_history_id |
| student_id |
| employer_id |
| current_status |
| remarks |
| created_at |
| updated_at |

---

# 4. Common Columns

The following columns are commonly used across tables.

| Column | Purpose |
|---------|----------|
| id | Primary identifier |
| status | Current status |
| created_at | Record creation time |
| updated_at | Last modification time |

---

# 5. Naming Convention

- Table names use plural form.
- Column names use snake_case.
- Primary key column is `id`.
- Foreign key columns use `<table>_id`.
- Timestamp columns use `_at` suffix.

---

# 6. Notes

- Primary Keys will be defined in the Relationships document.
- Foreign Keys will be defined in the Relationships document.
- Indexes will be defined separately.
- Database implementation will use PostgreSQL 17 with SQLAlchemy 2.x ORM.
- Database migrations will be managed using Alembic.

---

# 7. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Database Tables |