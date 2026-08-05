# 05. System Architecture

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | System Architecture |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the high-level architecture of the VisaLiv Employer Outreach Automation CRM.

It describes the major system modules, their responsibilities, interactions, and the overall flow of information throughout the application.

This document intentionally avoids implementation details and focuses on the logical architecture of the system.

---

# 2. Architecture Overview

The system follows a modular architecture where each module has a single responsibility.

Every module communicates only with the modules required to complete its business process.

This approach improves:

- Scalability
- Maintainability
- Readability
- Future extensibility

---

# 3. High-Level Architecture

```

Admin

│

▼

Authentication

│

▼

Student Management

│

▼

Gmail Connection

│

▼

Employer Management

│

▼

Email Template

│

▼

Automation Engine

│

├───────────────┐

▼ ▼ ▼

Employer Queue Workflow

Selection

│

└───────┬───────┘

▼

Email Sending

│

▼

Email History

│

▼

Dashboard

```

---

# 4. Core Modules

The system consists of the following major modules.

---

## 4.1 Authentication

### Responsibility

Provides secure access to the CRM.

### Main Functions

- Admin Login
- Session Validation
- Logout

---

## 4.2 Student Management

### Responsibility

Maintains student records.

### Main Functions

- Add Student
- Edit Student
- Upload Resume
- Activate Student
- Connect Gmail

---

## 4.3 Gmail Connection

### Responsibility

Authorizes the system to send emails using the student's Gmail account.

### Main Functions

- Gmail Authorization
- Connection Status
- Token Management

---

## 4.4 Employer Management

### Responsibility

Maintains employer records.

### Main Functions

- Import Employers
- Update Employers
- Activate / Deactivate Employers

---

## 4.5 Email Template

### Responsibility

Stores reusable email templates.

### Main Functions

- Create Template
- Edit Template
- Dynamic Variables

---

## 4.6 Automation Engine

### Responsibility

Coordinates the entire email automation process.

### Main Functions

- Student Validation
- Employer Selection
- Queue Generation
- Business Rule Validation

---

## 4.7 Queue

### Responsibility

Stores pending email tasks before sending.

### Main Functions

- Pending Emails
- Processing Queue
- Failed Queue

---

## 4.8 Email Sending

### Responsibility

Sends emails using connected Gmail accounts.

### Main Functions

- Generate Personalized Email
- Attach Resume
- Send Email

---

## 4.9 Email History

### Responsibility

Maintains a permanent record of every email.

### Main Functions

- Store Email History
- Duplicate Validation
- Reporting Support

---

## 4.10 Workflow

### Responsibility

Tracks the lifecycle of every application.

### Initial Status

Application Sent

---

## 4.11 Dashboard

### Responsibility

Provides business insights and statistics.

### Displays

- Total Students
- Total Employers
- Queue Summary
- Emails Sent
- Recent Activity

---

# 5. Module Relationships

```

Authentication

↓

Student Management

↓

Gmail Connection

↓

Automation Engine

↓

Employer Selection

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

# 6. Data Flow

The overall data movement is as follows.

```

Admin

↓

Student Information

↓

Student Module

↓

Automation Engine

↓

Employer Selection

↓

Queue

↓

Email Sending

↓

History

↓

Dashboard

```

---

# 7. Separation of Responsibilities

Each module has a single responsibility.

| Module | Responsibility |
|----------|---------------|
| Authentication | User Authentication |
| Students | Student Information |
| Gmail | Gmail Authorization |
| Employers | Employer Database |
| Templates | Email Templates |
| Automation | Business Logic |
| Queue | Pending Emails |
| Email | Email Delivery |
| History | Email Records |
| Workflow | Application Timeline |
| Dashboard | Reports & Statistics |

---

# 8. Design Principles

The architecture follows the following principles.

### Single Responsibility

Each module performs one business function.

---

### Modularity

Modules remain independent and reusable.

---

### Scalability

New modules can be added without affecting existing modules.

---

### Maintainability

Business logic remains separated from presentation.

---

### Extensibility

Future features can be integrated with minimal architectural changes.

---

# 9. Future Expansion

The architecture is prepared for future modules such as:

- Student Portal
- Employer Portal
- Notification System
- Analytics
- AI Email Generation
- Multi-Admin Support

These modules can be integrated without redesigning the core architecture.

---

# 10. Architecture Summary

The VisaLiv Employer Outreach Automation CRM follows a modular architecture centered around the Automation Engine.

Every major business process is divided into independent modules that communicate through clearly defined responsibilities.

This architecture ensures the project remains scalable, maintainable, and suitable for future enterprise expansion.

---

# 11. Notes

This document defines the logical architecture of the system.

Technical implementation details, database structure, APIs, and sequence diagrams will be documented separately in the Technical Design phase.

---

# 12. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial System Architecture for MVP |
