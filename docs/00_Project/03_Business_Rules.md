# 03. Business Rules

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Business Rules |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the business rules that govern the Employer Outreach Automation process.

Every automation decision made by the system must follow these rules.

These rules ensure consistency, prevent duplicate outreach, and maintain professional communication with employers.

---

# 2. Rule Categories

The business rules are grouped into the following categories:

- Student Rules
- Employer Rules
- Email Rules
- Automation Rules
- Queue Rules
- Workflow Rules

---

# Rule BR-01 : Active Student Rule

## Description

Only students marked as **Active** are eligible for automation.

## Business Logic

Before processing any student, the system must verify that the student status is Active.

Inactive students must be ignored.

## Example

Student Status = Active

Result

Student is processed.

Student Status = Inactive

Result

Student is skipped.

---

# Rule BR-02 : Gmail Connection Rule

## Description

A student can participate in automation only after the Admin connects the student's Gmail account.

## Business Logic

If Gmail is not connected, the student is skipped.

## Example

Rahul

Gmail Connected

Result

Eligible

Aman

Gmail Not Connected

Result

Skipped

---

# Rule BR-03 : Resume Availability Rule

## Description

Every student must have a resume uploaded before automation begins.

## Business Logic

Students without resumes are skipped.

## Example

Resume Uploaded

Result

Continue

Resume Missing

Result

Skip Student

---

# Rule BR-04 : Daily Email Limit

## Description

A student can send a maximum of **5 employer emails per day**.

## Business Logic

Once the student reaches five successful queue entries in a day, no additional employers shall be selected.

## Example

Rahul

Today's Emails = 5

Result

No more employers selected.

---

# Rule BR-05 : Duplicate Employer Rule

## Description

A student must never send another application to the same employer.

## Business Logic

Before selecting an employer, the system checks whether the student has previously contacted that employer.

If yes, the employer is skipped permanently for that student.

## Example

Rahul

↓

Google

↓

Already Contacted

↓

Skip

---

# Rule BR-06 : Employer Cooldown Rule

## Description

After receiving an application email, an employer enters a cooldown period of **3 days**.

During this period, no other student can send another application to that employer.

## Business Logic

Before selecting an employer, the system checks the employer's recent email history.

If the employer received an application within the last three days, the employer is skipped.

## Example

Day 1

Rahul

↓

Google

Email Sent

Day 2

Aman

↓

Google

Result

Skipped

Day 4

Neha

↓

Google

Result

Eligible

---

# Rule BR-07 : Active Employer Rule

## Description

Only active employers are considered for automation.

## Business Logic

Inactive employers are ignored during employer selection.

---

# Rule BR-08 : Employer Selection Rule

## Description

The system selects employers one by one until the student's daily limit is reached.

## Selection Conditions

An employer is eligible only if:

- Employer is Active
- Employer is not in Cooldown
- Student has never contacted the employer
- Student has not reached the daily limit

The selection process stops after selecting five employers.

---

# Rule BR-09 : Queue Generation Rule

## Description

Emails are not sent immediately after employer selection.

Instead, they are added to a Queue.

## Business Logic

Each selected employer creates one queue item.

## Example

Rahul

↓

Google

↓

Queue

↓

Pending

---

# Rule BR-10 : Email Personalization Rule

## Description

The system automatically personalizes every email before sending.

## Business Logic

Dynamic placeholders are replaced with student-specific information.

Example Variables

- Student Name
- Student Email

The student's resume is attached automatically.

---

# Rule BR-11 : Email Sending Rule

## Description

Only queued emails are sent.

## Business Logic

Each queue item is processed independently.

If sending succeeds,

Queue Status

↓

Sent

If sending fails,

Queue Status

↓

Failed

---

# Rule BR-12 : Email History Rule

## Description

Every successfully sent email must be stored permanently.

## Business Logic

Email History is used for:

- Duplicate prevention
- Employer cooldown validation
- Reporting

History records cannot be deleted automatically.

---

# Rule BR-13 : Workflow Rule

## Description

Every successful email creates a workflow entry.

## Initial Workflow Status

Application Sent

Future workflow stages will be introduced in later project phases.

---

# Rule BR-14 : Dashboard Rule

## Description

The Dashboard must display information generated from system activity.

Examples

- Total Students
- Total Employers
- Emails Sent Today
- Queue Status
- Recent Activity

The Dashboard does not modify business data.

It only displays summarized information.

---

# 3. Rule Priority

If multiple rules are evaluated simultaneously, they shall be executed in the following order:

1. Active Student
2. Gmail Connected
3. Resume Available
4. Active Employer
5. Duplicate Check
6. Employer Cooldown
7. Daily Email Limit
8. Queue Generation
9. Email Personalization
10. Email Sending
11. Email History
12. Workflow Update

---

# 4. Exception Handling

The following situations shall prevent email generation:

- Student is Inactive
- Gmail is not connected
- Resume is missing
- Employer is Inactive
- Employer is already contacted by the student
- Employer is in Cooldown
- Daily limit reached

---

# 5. Notes

These business rules represent the MVP version of the VisaLiv Employer Outreach Automation CRM.

Any modification to these rules must be reviewed and documented before implementation.

---

# 6. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Business Rules for MVP |