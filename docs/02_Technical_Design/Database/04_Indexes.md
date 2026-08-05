# 04. Indexes

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Database Indexes |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the database indexes required to improve query performance and maintain data integrity.

---

# 2. Primary Key Indexes

Every table has a Primary Key index on the `id` column.

| Table | Indexed Column |
|--------|----------------|
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

# 3. Unique Indexes

| Table | Column | Purpose |
|--------|--------|---------|
| admins | email | Prevent duplicate admin accounts |
| students | email | Prevent duplicate students |
| employers | email | Prevent duplicate employers |
| gmail_accounts | student_id | One Gmail account per student |
| email_templates | template_name | Prevent duplicate template names |

---

# 4. Foreign Key Indexes

| Table | Column |
|--------|--------|
| students | created_by |
| gmail_accounts | student_id |
| automation_runs | started_by |
| queues | automation_run_id |
| queues | student_id |
| queues | employer_id |
| queues | template_id |
| email_history | queue_id |
| email_history | student_id |
| email_history | employer_id |
| email_history | template_id |
| workflows | email_history_id |
| workflows | student_id |
| workflows | employer_id |

---

# 5. Search Indexes

| Table | Column | Purpose |
|--------|--------|---------|
| students | full_name | Student search |
| employers | company_name | Company search |
| employers | contact_name | Employer search |
| queues | status | Queue filtering |
| workflows | current_status | Workflow filtering |
| automation_runs | status | Automation filtering |

---

# 6. Composite Indexes

| Table | Columns | Purpose |
|--------|---------|---------|
| queues | student_id, employer_id | Duplicate email check |
| queues | status, queued_at | Pending queue processing |
| email_history | student_id, employer_id | Email history lookup |
| workflows | student_id, employer_id | Application tracking |

---

# 7. Notes

- Primary Keys are automatically indexed.
- Foreign Keys should also be indexed for better JOIN performance.
- Composite indexes are added for frequently used business queries.

---

# 8. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Database Index Design |