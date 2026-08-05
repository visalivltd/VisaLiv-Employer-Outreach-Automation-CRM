# 00. Entity Analysis

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Entity Analysis |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document identifies all core entities used in the VisaLiv Employer Outreach Automation CRM.

It serves as the foundation for database design and the ER Diagram.

---

# 2. Core Entities

| Entity | Purpose | Owner Module |
|---------|---------|--------------|
| Admin | Manages the CRM | Authentication |
| Student | Stores student information | Student |
| Employer | Stores employer information | Employer |
| Gmail Account | Stores Gmail connection details | Gmail |
| Email Template | Stores reusable email templates | Email Template |
| Automation Run | Represents one automation execution | Automation |
| Queue | Stores pending email jobs | Queue |
| Email History | Stores sent email records | Email Sending |
| Workflow | Tracks application lifecycle | Workflow |

---

# 3. Entity Summary

## Admin

Represents the authenticated administrator who manages the CRM.

---

## Student

Represents a job applicant.

Stores profile, resume, Gmail availability, and automation eligibility.

---

## Employer

Represents an employer who can receive job applications.

Stores company and contact information.

---

## Gmail Account

Represents the Gmail authorization associated with a student.

Maintains connection and availability status.

---

## Email Template

Represents reusable email templates with dynamic placeholders.

---

## Automation Run

Represents a single execution of the Automation Engine.

One automation run may process multiple students.

---

## Queue

Represents individual email tasks waiting to be processed.

Each queue item belongs to one student and one employer.

---

## Email History

Represents successfully sent (or failed) emails.

Maintains delivery records for reporting and auditing.

---

## Workflow

Represents the application lifecycle after an email has been sent.

Tracks statuses such as Application Sent, Interview, Offer, etc.

---

# 4. Entity Dependencies

```text
Admin
   │
   ▼
Student
   │
   ▼
Gmail Account
   │
   ▼
Automation Run
   │
   ├──────────────┐
   ▼              ▼
Employer     Email Template
      │             │
      └──────┬──────┘
             ▼
           Queue
             │
             ▼
      Email History
             │
             ▼
          Workflow
```

---

# 5. Notes

These entities define the logical data model of the system.

Relationships, keys, and database tables will be designed in the following documents.

---

# 6. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Entity Analysis |