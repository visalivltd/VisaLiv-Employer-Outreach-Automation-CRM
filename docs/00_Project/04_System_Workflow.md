# 04. System Workflow

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | System Workflow |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document describes the complete workflow of the VisaLiv Employer Outreach Automation CRM.

It explains how data moves through the system from the moment the Admin creates a student until an email is successfully delivered to an employer.

This document focuses on business workflow only.

---

# 2. High-Level Workflow

Admin Login

↓

Student Registration

↓

Resume Upload

↓

Gmail Connection

↓

Employer Import

↓

Email Template Creation

↓

Automation Start

↓

Student Validation

↓

Employer Selection

↓

Queue Generation

↓

Email Personalization

↓

Email Sending

↓

Email History

↓

Workflow Update

↓

Dashboard Update

---

# 3. Detailed Workflow

## Step 1 : Admin Login

### Input

- Admin Credentials

### Process

The Admin logs into the CRM and gains access to the dashboard.

### Output

Authenticated Admin Session.

---

## Step 2 : Student Registration

### Input

Admin enters:

- Student Name
- Student Email

### Process

The student record is created.

Initially the student is available for future automation.

### Output

Student Profile Created.

---

## Step 3 : Resume Upload

### Input

Student Resume

### Process

The Admin uploads the student's resume.

The resume becomes available for future email attachments.

### Output

Resume Linked with Student.

---

## Step 4 : Gmail Connection

### Input

Student Gmail Account

### Process

The Admin authorizes the student's Gmail account.

The system receives permission to send emails on behalf of the student.

### Output

Student Gmail Connected.

---

## Step 5 : Employer Import

### Input

Employer Excel File

### Process

The system imports employer information into the employer database.

### Output

Employer Records Available.

---

## Step 6 : Email Template Creation

### Input

Subject

Body

Dynamic Variables

### Process

The Admin creates a reusable email template.

Dynamic variables will be replaced automatically during email generation.

### Output

Email Template Saved.

---

## Step 7 : Start Automation

### Input

Admin clicks

Start Automation

### Process

The automation process begins.

The system starts evaluating students one by one.

### Output

Automation Started.

---

## Step 8 : Student Validation

For every student, the system verifies:

- Student is Active
- Gmail is Connected
- Resume is Available

If any validation fails,

↓

Student is skipped.

Otherwise,

↓

Continue.

### Output

Eligible Student.

---

## Step 9 : Employer Selection

The system searches for employers that satisfy all business rules.

Selection Conditions

- Employer is Active
- Employer is not in Cooldown
- Student has never contacted the employer
- Student has not reached the daily email limit

The process continues until five employers are selected.

### Output

Eligible Employer List.

---

## Step 10 : Queue Generation

The selected employers are not emailed immediately.

Instead,

a queue entry is created for every selected employer.

Each queue entry contains:

- Student
- Employer
- Email Template
- Status

### Output

Pending Email Queue.

---

## Step 11 : Email Personalization

Before sending,

the system prepares the final email.

The system:

- Replaces dynamic variables
- Inserts student information
- Attaches student resume

### Output

Ready-to-Send Email.

---

## Step 12 : Email Sending

The system processes the pending queue one email at a time.

Each email is sent using the connected Gmail account of the corresponding student.

### Output

Email Delivered.

---

## Step 13 : Email History

After a successful email,

the system stores:

- Student
- Employer
- Date
- Time
- Status

This information is permanently preserved.

### Output

Email History Updated.

---

## Step 14 : Workflow Update

Every successful email creates a workflow record.

Initial Status

Application Sent

The workflow will be extended in future phases.

### Output

Workflow Updated.

---

## Step 15 : Dashboard Update

The Dashboard displays the latest system activity.

Examples

- Total Students
- Total Employers
- Emails Sent Today
- Queue Summary
- Recent Activity

### Output

Updated Dashboard.

---

# 4. Workflow Diagram

Admin

↓

Login

↓

Add Student

↓

Upload Resume

↓

Connect Gmail

↓

Upload Employer Excel

↓

Create Email Template

↓

Start Automation

↓

Validate Student

↓

Select Employers

↓

Generate Queue

↓

Personalize Email

↓

Send Email

↓

Save History

↓

Update Workflow

↓

Update Dashboard

---

# 5. Decision Points

The system makes decisions during automation.

## Student Validation

Is Student Active?

↓

Yes

↓

Continue

↓

No

↓

Skip Student

---

Is Gmail Connected?

↓

Yes

↓

Continue

↓

No

↓

Skip Student

---

Is Resume Available?

↓

Yes

↓

Continue

↓

No

↓

Skip Student

---

## Employer Validation

Is Employer Active?

↓

Yes

↓

Continue

↓

No

↓

Skip Employer

---

Already Contacted?

↓

Yes

↓

Skip Employer

↓

No

↓

Continue

---

Employer in Cooldown?

↓

Yes

↓

Skip Employer

↓

No

↓

Continue

---

Daily Limit Reached?

↓

Yes

↓

Stop Employer Selection

↓

No

↓

Continue

---

# 6. Inputs

- Student Information
- Resume
- Gmail Authorization
- Employer Excel
- Email Template

---

# 7. Outputs

- Email Queue
- Sent Emails
- Email History
- Workflow Records
- Dashboard Statistics

---

# 8. Workflow Completion

The workflow for a student is considered complete when:

- Five eligible employers have been processed, or
- No more eligible employers are available.

The automation then proceeds to the next student.

---

# 9. Notes

This workflow represents the MVP implementation.

Future versions may introduce additional workflow stages without changing the overall architecture.

---

# 10. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial System Workflow for MVP |