# 02. Business Requirements

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Business Requirements |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the business requirements for the VisaLiv Employer Outreach Automation CRM.

It describes what the system should do from a business perspective without discussing technical implementation.

---

# 2. Business Objective

The objective of the system is to automate the employer outreach process on behalf of students while reducing manual work and ensuring every application follows predefined business rules.

The system should help the administrator manage students, employers, email templates, and automated application distribution from one centralized platform.

---

# 3. Primary User

Current MVP has only one user.

### Admin

The Admin is responsible for:

- Managing students
- Connecting student Gmail accounts
- Uploading employer data
- Creating email templates
- Starting automation
- Monitoring email history
- Monitoring workflow
- Viewing dashboard statistics

Students do not access the system during the MVP.

---

# 4. Business Process

The complete business process is as follows:

Admin Login

↓

Add Student

↓

Upload Student Resume

↓

Connect Student Gmail

↓

Upload Employer Excel

↓

Create Email Template

↓

Start Automation

↓

System Selects Eligible Employers

↓

System Generates Email Queue

↓

System Sends Emails

↓

System Stores Email History

↓

System Updates Workflow

↓

Dashboard Displays Statistics

---

# 5. Functional Requirements

The system shall provide the following features.

## 5.1 Authentication

The system shall allow the Admin to securely log into the CRM.

---

## 5.2 Student Management

The Admin shall be able to:

- Add students
- Edit student information
- Activate or deactivate students
- Upload student resumes
- Connect Gmail accounts

---

## 5.3 Employer Management

The Admin shall be able to:

- Upload employer data using Excel
- View employer records
- Search employers
- Update employer information
- Enable or disable employers

---

## 5.4 Email Template Management

The Admin shall be able to:

- Create templates
- Edit templates
- Delete templates
- Use dynamic variables

Example:

- Student Name
- Student Email

---

## 5.5 Automation

The Admin shall be able to:

- Start automation
- Stop automation
- View automation status

The system shall automatically:

- Select employers
- Generate queue
- Personalize emails
- Attach resumes
- Send emails
- Save history

---

## 5.6 Queue Management

The system shall:

- Display pending emails
- Display sending emails
- Display sent emails
- Display failed emails

---

## 5.7 Workflow Tracking

The system shall maintain the application timeline for every student.

Initially, the workflow shall include:

- Application Sent

Future statuses may be added in later versions.

---

## 5.8 Dashboard

The Dashboard shall display:

- Total Students
- Total Employers
- Emails Sent Today
- Queue Summary
- Recent Activity
- Workflow Summary

---

# 6. Business Rules

The following rules are mandatory.

### Rule 1

One student can send a maximum of five employer emails per day.

---

### Rule 2

A student must never send another email to the same employer.

---

### Rule 3

Once an employer receives an email from any student, that employer shall not receive another application from any other student for the next three days.

---

### Rule 4

Only active students shall participate in automation.

---

### Rule 5

Only students with connected Gmail accounts shall participate in automation.

---

### Rule 6

Only active employers shall be considered during employer selection.

---

# 7. Inputs

The system receives the following inputs from the Admin.

Student Information

- Name
- Email
- Resume

Employer Information

- Company Name
- Employer Email

Email Template

- Subject
- Body

Automation Controls

- Start
- Stop

---

# 8. Outputs

The system produces:

- Personalized emails
- Email queue
- Email history
- Workflow records
- Dashboard statistics

---

# 9. Assumptions

The following assumptions are valid for the MVP.

- The Admin manages the complete system.
- Student Gmail accounts are connected before automation starts.
- Employer email addresses are valid.
- Student resumes are available before sending emails.

---

# 10. Constraints

Current MVP limitations include:

- Single Admin user
- Gmail only
- Manual employer upload through Excel
- No student login
- No employer login

---

# 11. Success Criteria

The project shall be considered successful if:

- Students can be managed.
- Employers can be uploaded.
- Gmail accounts can be connected.
- Emails are automatically sent according to business rules.
- Email history is maintained.
- Dashboard reflects system activity accurately.

---

# 12. Future Enhancements

Future releases may include:

- Student Portal
- Employer Portal
- AI-powered email generation
- Reply synchronization
- Interview tracking
- Multi-admin support
- Advanced analytics

---

# 13. Conclusion

The VisaLiv Employer Outreach Automation CRM is intended to simplify and automate employer outreach by replacing repetitive manual tasks with a centralized and rule-based automation system.

The MVP focuses only on the core business process required to automate email distribution while maintaining complete visibility and control for the Admin.