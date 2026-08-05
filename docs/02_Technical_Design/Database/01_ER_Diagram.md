# 01. ER Diagram

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | ER Diagram |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the logical relationships between all core entities in the system.

It serves as the foundation for database table design.

---

# 2. Entities

- Admin
- Student
- Employer
- Gmail Account
- Email Template
- Automation Run
- Queue
- Email History
- Workflow

---

# 3. Entity Relationships

## Admin → Student

Relationship

```
1 : N
```

One Admin manages multiple Students.

---

## Student → Gmail Account

Relationship

```
1 : 1
```

One Student has one Gmail Account.

---

## Student → Queue

Relationship

```
1 : N
```

One Student can have many Queue Items.

---

## Employer → Queue

Relationship

```
1 : N
```

One Employer can appear in many Queue Items.

---

## Email Template → Queue

Relationship

```
1 : N
```

One Email Template can be used by many Queue Items.

---

## Automation Run → Queue

Relationship

```
1 : N
```

One Automation Run creates many Queue Items.

---

## Queue → Email History

Relationship

```
1 : 1
```

One Queue Item generates one Email History record.

---

## Email History → Workflow

Relationship

```
1 : 1
```

One successful Email History record creates one Workflow.

---

# 4. Logical ER Diagram

```text
                         +---------+
                         |  Admin  |
                         +---------+
                              |
                            1 | N
                              |
                              ▼
                        +-----------+
                        | Student   |
                        +-----------+
                         |        |
                    1:1  |        |1:N
                         ▼        ▼
                +---------------+  +------------------+
                | Gmail Account |  |      Queue       |
                +---------------+  +------------------+
                                     ▲      ▲      ▲
                                     │      │      │
                                  1:N│   1:N│   1:N│
                                     │      │      │
                             +------------+ | +------------------+
                             | Employer   | | | Email Template   |
                             +------------+ | +------------------+
                                            |
                                            |
                                     +------------------+
                                     | Automation Run   |
                                     +------------------+
                                              |
                                            1:N
                                              |
                                              ▼
                                     +------------------+
                                     |      Queue       |
                                     +------------------+
                                              |
                                            1:1
                                              ▼
                                     +------------------+
                                     | Email History    |
                                     +------------------+
                                              |
                                            1:1
                                              ▼
                                     +------------------+
                                     |    Workflow      |
                                     +------------------+
```

---

# 5. Cardinality Summary

| Parent Entity | Child Entity | Cardinality |
|---------------|--------------|-------------|
| Admin | Student | 1 : N |
| Student | Gmail Account | 1 : 1 |
| Student | Queue | 1 : N |
| Employer | Queue | 1 : N |
| Email Template | Queue | 1 : N |
| Automation Run | Queue | 1 : N |
| Queue | Email History | 1 : 1 |
| Email History | Workflow | 1 : 1 |

---

# 6. Notes

- This is a logical ER Diagram.
- Physical tables will be defined in **02_Database_Tables.md**.
- Primary Keys and Foreign Keys will be finalized during database table design.

---

# 7. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial ER Diagram |