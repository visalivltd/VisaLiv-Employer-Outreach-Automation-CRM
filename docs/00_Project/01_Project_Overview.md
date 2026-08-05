# 01. Project Overview

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Project Overview |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | 05 August 2026 |

---

# 1. Project Introduction

VisaLiv Employer Outreach Automation CRM is an internal automation platform designed to simplify and automate the process of sending job applications to employers on behalf of registered students.

Instead of manually sending resumes to hundreds of employers every day, the system automatically sends personalized emails from each student's own Gmail account while following predefined business rules.

The platform is designed for internal administrative use where the Admin manages students, employer data, email templates, and the complete outreach process.

---

# 2. Business Problem

Currently, sending job applications is a repetitive and time-consuming manual process.

For every student, an administrator must:

- Find employer email addresses
- Open the student's Gmail account
- Attach the student's resume
- Write or copy the email
- Personalize the student's name
- Send the email
- Track which employer already received an application

As the number of students and employers grows, this process becomes difficult to manage and increases the chances of duplicate emails and human errors.

---

# 3. Proposed Solution

VisaLiv CRM automates the entire employer outreach process.

The Admin only needs to:

1. Add students.
2. Connect each student's Gmail account.
3. Upload employer data.
4. Create email templates.
5. Start the automation.

The system will automatically:

- Select eligible employers.
- Personalize email content.
- Attach the student's resume.
- Send emails using the student's Gmail account.
- Maintain email history.
- Apply business rules before every email.
- Generate reports and dashboard statistics.

---

# 4. Project Objectives

The primary objectives of this project are:

- Reduce manual work.
- Eliminate duplicate employer outreach.
- Maintain professional communication.
- Track every email sent.
- Increase productivity.
- Provide a centralized outreach management system.

---

# 5. Target Users

### Primary User

Admin

The Admin has complete control over the system, including:

- Student Management
- Employer Management
- Gmail Connection Management
- Email Template Management
- Automation Control
- Queue Monitoring
- Workflow Tracking
- Dashboard Monitoring

> Note:
> Students do not log into the system during the current MVP.

---

# 6. Project Scope (MVP)

The initial version of the project includes:

### Authentication

- Admin Login

### Student Management

- Add Student
- Edit Student
- Activate / Deactivate Student
- Upload Resume
- Connect Gmail

### Employer Management

- Upload Employers via Excel
- Store Employer Information

### Email Templates

- Create Templates
- Edit Templates
- Use Dynamic Variables

### Automation Engine

- Daily Scheduler
- Employer Selection
- Queue Generation
- Email Sending
- Business Rule Validation

### Tracking

- Email History
- Workflow Logs

### Dashboard

- Statistics
- Queue Status
- Recent Activity
- Automation Summary

---

# 7. Out of Scope (Current MVP)

The following features are intentionally excluded from the first version:

- Student Login Portal
- Employer Portal
- AI-generated emails
- Automatic interview scheduling
- Reply parsing
- Mobile application
- Multi-admin roles
- Advanced analytics

These features may be considered in future phases.

---

# 8. High-Level Workflow

Admin Login

↓

Add Students

↓

Connect Student Gmail

↓

Upload Employer Excel

↓

Create Email Template

↓

Start Automation

↓

Scheduler Runs

↓

Select Eligible Employers

↓

Generate Queue

↓

Send Emails

↓

Save Email History

↓

Update Workflow

↓

Display Dashboard Statistics

---

# 9. Expected Benefits

The system is expected to provide the following benefits:

- Faster outreach process
- Reduced manual effort
- Consistent email formatting
- Better employer tracking
- Prevention of duplicate emails
- Centralized management
- Improved reporting and monitoring

---

# 10. Success Criteria

The MVP will be considered successful if:

- Admin can manage students.
- Admin can upload employers.
- Gmail accounts can be connected.
- Emails are automatically sent according to business rules.
- Email history is recorded.
- Dashboard reflects real-time outreach statistics.

---

# 11. Future Scope

Future versions may include:

- Student Portal
- Employer Portal
- AI-powered email generation
- Interview tracking
- Reply synchronization
- Resume analytics
- Advanced reporting
- Multi-admin support
- Notification system

---

# 12. Conclusion

VisaLiv Employer Outreach Automation CRM is designed to automate and standardize the employer outreach process while maintaining personalized communication through each student's Gmail account.

The first version focuses on delivering a reliable, scalable, and maintainable automation platform that minimizes manual effort and ensures every outreach follows predefined business rules.