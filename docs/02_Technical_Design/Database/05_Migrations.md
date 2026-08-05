# 05. Migrations

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Database Migrations |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the database migration strategy for the VisaLiv Employer Outreach Automation CRM.

It ensures that database schema changes are applied in a controlled, versioned, and repeatable manner.

---

# 2. Migration Tool

Migration Tool

- Alembic

ORM

- SQLAlchemy

Database

- PostgreSQL

---

# 3. Migration Order

The database tables must be created in the following order.

| Order | Table |
|--------|-------|
| 1 | admins |
| 2 | students |
| 3 | employers |
| 4 | gmail_accounts |
| 5 | email_templates |
| 6 | automation_runs |
| 7 | queues |
| 8 | email_history |
| 9 | workflows |

---

# 4. Migration Rules

- Every schema change must be created through a migration.
- Existing migrations must never be modified after being applied.
- Each migration should represent one logical database change.
- Migration files must have descriptive names.
- Database schema must remain synchronized across all environments.

---

# 5. Naming Convention

Migration filenames should use the following format.

```
YYYYMMDD_HHMM_description
```

Example

```
20260805_1200_create_students_table

20260805_1230_create_employers_table

20260805_1300_create_queue_table
```

---

# 6. Migration Workflow

```
Update Database Design

↓

Generate Migration

↓

Review Migration

↓

Apply Migration

↓

Verify Database

↓

Commit Changes
```

---

# 7. Rollback Strategy

- Every migration must support rollback.
- Rollback should restore the previous schema state.
- Failed migrations must be investigated before reapplying.

---

# 8. Environment Strategy

| Environment | Migration |
|-------------|-----------|
| Development | Automatic |
| Testing | Controlled |
| Production | Manual Approval |

---

# 9. Notes

- Database changes should always be committed together with their corresponding migration files.
- Migration history must be preserved in version control.
- Direct database changes are not allowed outside the migration process.

---

# 10. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Migration Strategy |