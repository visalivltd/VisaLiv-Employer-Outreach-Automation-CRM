# 03. Relationships

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Database Relationships |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the relationships between database tables, including Primary Keys (PK) and Foreign Keys (FK).

---

# 2. Primary Keys

| Table | Primary Key |
|--------|-------------|
| admins | id |
| students | id |
| employers | id |
| gmail_accounts | id |
| email_templates | id |
| automation_runs | id |
| queues | id |
| email_history | id |
| workflows | id |

---

# 3. Foreign Keys

| Table | Foreign Key | References |
|--------|-------------|------------|
| students | created_by | admins.id |
| gmail_accounts | student_id | students.id |
| automation_runs | started_by | admins.id |
| queues | automation_run_id | automation_runs.id |
| queues | student_id | students.id |
| queues | employer_id | employers.id |
| queues | template_id | email_templates.id |
| email_history | queue_id | queues.id |
| email_history | student_id | students.id |
| email_history | employer_id | employers.id |
| email_history | template_id | email_templates.id |
| workflows | email_history_id | email_history.id |
| workflows | student_id | students.id |
| workflows | employer_id | employers.id |

---

# 4. Relationship Summary

| Parent Table | Child Table | Relationship |
|--------------|-------------|--------------|
| admins | students | 1 : N |
| students | gmail_accounts | 1 : 1 |
| admins | automation_runs | 1 : N |
| automation_runs | queues | 1 : N |
| students | queues | 1 : N |
| employers | queues | 1 : N |
| email_templates | queues | 1 : N |
| queues | email_history | 1 : 1 |
| email_history | workflows | 1 : 1 |

---

# 5. Relationship Flow

```text
Admin
│
├──────► Students
│
└──────► Automation Runs
             │
             ▼
           Queue
      ┌────┼────┐
      ▼    ▼    ▼
 Student Employer Template
      │
      ▼
 Gmail Account

Queue
   │
   ▼
Email History
   │
   ▼
Workflow
```

---

# 6. Referential Integrity Rules

- Every Student must belong to a valid Admin.
- Every Gmail Account must belong to one Student.
- Every Queue record must reference a valid Student.
- Every Queue record must reference a valid Employer.
- Every Queue record must reference a valid Email Template.
- Every Queue record must belong to one Automation Run.
- Every Email History record must belong to one Queue record.
- Every Workflow record must belong to one Email History record.

---

# 7. Cascade Strategy

| Parent | Child | On Delete | On Update |
|---------|-------|-----------|-----------|
| admins | students | Restrict | Cascade |
| students | gmail_accounts | Cascade | Cascade |
| automation_runs | queues | Restrict | Cascade |
| students | queues | Restrict | Cascade |
| employers | queues | Restrict | Cascade |
| email_templates | queues | Restrict | Cascade |
| queues | email_history | Restrict | Cascade |
| email_history | workflows | Restrict | Cascade |

---

# 8. Notes

- Every relationship is enforced using Foreign Keys.
- Parent records should not be deleted if dependent records exist.
- Historical data (Queue, Email History, Workflow) should always be preserved.

---

# 9. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Relationships Document |