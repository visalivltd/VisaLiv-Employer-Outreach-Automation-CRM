# 06. Module Overview

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Module Overview |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document provides an overview of all major modules within the VisaLiv Employer Outreach Automation CRM.

Each module has a clearly defined responsibility and operates independently while collaborating with other modules to complete the overall employer outreach process.

Detailed functional and technical specifications for each module will be documented separately.

---

# 2. Module Architecture

```

Authentication

↓

Student Management

↓

Gmail Connection

↓

Employer Management

↓

Email Template

↓

Automation Engine

↓

Queue

↓

Email Sending

↓

Email History

↓

Workflow

↓

Dashboard

```

---

# 3. Module List

| Module | Purpose | Status |
|----------|----------|--------|
| Authentication | Secure Admin Login & Session Management | Planned |
| Student Management | Manage Student Information | Planned |
| Gmail Connection | Connect Student Gmail Accounts | Planned |
| Employer Management | Manage Employer Database | Planned |
| Email Template | Create Reusable Email Templates | Planned |
| Automation Engine | Execute Business Automation | Planned |
| Queue Management | Manage Pending Emails | Planned |
| Email Sending | Deliver Emails Using Student Gmail | Planned |
| Email History | Store Email Records | Planned |
| Workflow | Track Student Application Progress | Planned |
| Dashboard | Display System Statistics | Planned |

---

# 4. Module Details

---

## 4.1 Authentication Module

### Purpose

Provides secure access to the CRM.

### Responsibilities

- Admin Login
- Authentication
- Session Validation
- Logout

### Inputs

- Email
- Password

### Outputs

- Authenticated Session

### Depends On

None

---

## 4.2 Student Management Module

### Purpose

Stores and manages student information.

### Responsibilities

- Add Student
- Edit Student
- Delete Student
- Activate Student
- Upload Resume

### Inputs

- Student Details
- Resume

### Outputs

- Student Profile

### Depends On

Authentication

---

## 4.3 Gmail Connection Module

### Purpose

Connects a student's Gmail account to the system.

### Responsibilities

- Gmail Authorization
- Connection Validation
- Connection Status

### Inputs

- Student Gmail Account

### Outputs

- Authorized Gmail Connection

### Depends On

Student Management

---

## 4.4 Employer Management Module

### Purpose

Maintains employer records.

### Responsibilities

- Import Employer Excel
- Add Employer
- Update Employer
- Activate Employer

### Inputs

- Employer Excel
- Employer Details

### Outputs

- Employer Database

### Depends On

Authentication

---

## 4.5 Email Template Module

### Purpose

Maintains reusable email templates.

### Responsibilities

- Create Template
- Edit Template
- Dynamic Variables

### Inputs

- Subject
- Body

### Outputs

- Email Template

### Depends On

Authentication

---

## 4.6 Automation Engine Module

### Purpose

Coordinates the complete outreach process.

### Responsibilities

- Student Validation
- Employer Selection
- Business Rule Validation
- Queue Generation

### Inputs

- Students
- Employers
- Templates

### Outputs

- Email Queue

### Depends On

Student Module

Employer Module

Template Module

Gmail Module

---

## 4.7 Queue Management Module

### Purpose

Stores emails waiting to be sent.

### Responsibilities

- Create Queue
- Process Queue
- Retry Failed Items

### Inputs

- Email Tasks

### Outputs

- Pending Queue

### Depends On

Automation Engine

---

## 4.8 Email Sending Module

### Purpose

Sends personalized emails.

### Responsibilities

- Personalize Email
- Attach Resume
- Send Email

### Inputs

- Queue

### Outputs

- Sent Email

### Depends On

Queue Management

---

## 4.9 Email History Module

### Purpose

Maintains permanent email records.

### Responsibilities

- Store History
- Duplicate Validation
- Reporting

### Inputs

- Sent Email

### Outputs

- Email History

### Depends On

Email Sending

---

## 4.10 Workflow Module

### Purpose

Tracks application lifecycle.

### Responsibilities

- Create Workflow Entry
- Update Status
- Timeline Tracking

### Inputs

- Email History

### Outputs

- Workflow Timeline

### Depends On

Email History

---

## 4.11 Dashboard Module

### Purpose

Displays business insights.

### Responsibilities

- Statistics
- Queue Overview
- Recent Activity
- Reports

### Inputs

- Students
- Employers
- Queue
- Workflow

### Outputs

- Dashboard

### Depends On

All Business Modules

---

# 5. Module Dependencies

```

Authentication

│

├───────────────┐

▼ ▼

Students Employers

│ │

▼ ▼

Gmail Templates

│ │

└──────┬────────┘

▼

Automation Engine

↓

Queue

↓

Email Sending

↓

Email History

↓

Workflow

↓

Dashboard

```

---

# 6. Module Communication

| From Module | To Module | Purpose |
|--------------|-----------|----------|
| Authentication | Student | Secure Access |
| Student | Gmail | Gmail Authorization |
| Student | Automation | Student Validation |
| Employer | Automation | Employer Selection |
| Template | Automation | Email Personalization |
| Automation | Queue | Queue Generation |
| Queue | Email Sending | Send Email |
| Email Sending | Email History | Save Record |
| Email History | Workflow | Update Timeline |
| Workflow | Dashboard | Display Statistics |

---

# 7. Core Module

The Automation Engine is the core business module of the system.

It coordinates:

- Student Validation
- Employer Selection
- Business Rules
- Queue Generation

All other business modules either provide data to the Automation Engine or consume the results produced by it.

---

# 8. Future Modules

The following modules are planned for future releases.

- Student Portal
- Employer Portal
- Notification Center
- AI Email Generator
- Analytics
- Multi-Admin Management

---

# 9. Notes

This document provides only a high-level overview of each module.

Detailed Functional Design documents will be created separately for every module in the next project phase.

---

# 10. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Module Overview |