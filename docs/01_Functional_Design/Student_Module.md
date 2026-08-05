# Student Module

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Module | Student Management |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

The Student Management Module is responsible for maintaining all student-related information required for the Employer Outreach Automation process.

Each student represents an individual job applicant whose Gmail account will be used to send personalized application emails to employers.

This module acts as the primary source of student data for the Automation Engine.

---

# 2. Objectives

The Student Module is responsible for:

- Managing student information
- Uploading student resumes
- Connecting Gmail accounts
- Activating or deactivating students
- Providing validated student data to the Automation Engine

---

# 3. Scope

## Included (MVP)

- Add Student
- View Student
- Edit Student
- Activate / Deactivate Student
- Upload Resume
- Connect Gmail Account
- View Student Status

## Excluded (Future)

- Student Self Registration
- Student Login
- Resume Builder
- Resume Versioning
- Profile Completion Score
- Student Portal

---

# 4. Primary User

Current User

- Admin

Students do not have direct access to the CRM in the MVP.

---

# 5. Student Information

Each student contains the following information.

## Basic Information

- Full Name
- Email Address

---

## Resume Information

- Resume File
- Upload Date

---

## Gmail Information

- Gmail Connected Status

---

## Account Information

- Active / Inactive Status
- Created Date
- Updated Date

---

# 6. Functional Requirements

The Admin shall be able to:

- Add a new student.
- Update student information.
- Upload a student's resume.
- Connect the student's Gmail account.
- Activate or deactivate a student.
- View all registered students.
- Search students.
- Filter students by status.

---

# 7. Student Lifecycle

```
Create Student

↓

Upload Resume

↓

Connect Gmail

↓

Activate Student

↓

Eligible for Automation

↓

Processing

↓

Completed
```

---

# 8. Student Status

| Status | Description |
|----------|-------------|
| Draft | Student record created but incomplete |
| Resume Uploaded | Resume has been uploaded |
| Gmail Connected | Gmail account successfully connected |
| Active | Student is eligible for automation |
| Inactive | Student excluded from automation |
| Processing | Student is currently being processed |
| Completed | Daily automation completed |

---

# 9. Validation Rules

## Student Name

- Required

---

## Email Address

- Required
- Must be unique
- Must be a valid email format

---

## Resume

- Required before automation
- Only one active resume per student

---

## Gmail

- Must be connected before automation

---

# 10. Business Rules

### STUDENT-01

Every student must have a unique email address.

---

### STUDENT-02

Only active students are eligible for automation.

---

### STUDENT-03

A resume must be uploaded before automation begins.

---

### STUDENT-04

The student's Gmail account must be connected before any email can be sent.

---

### STUDENT-05

A student can send a maximum of five employer emails per day.

---

### STUDENT-06

A student must never send another email to the same employer.

---

### STUDENT-07

If Gmail is disconnected, the student is automatically skipped during automation.

---

### STUDENT-08

If the student is inactive, the Automation Engine must ignore the student.

---

# 11. Business Events

Business Events represent important actions that occur within the Student Module.

| Event ID | Event | Trigger | Action | Next Module |
|----------|--------|---------|--------|-------------|
| STU-001 | Student Created | Admin saves a new student | Student profile is created | Student Management |
| STU-002 | Student Updated | Admin edits student information | Profile is updated | Dashboard |
| STU-003 | Resume Uploaded | Admin uploads resume | Resume linked to student | Automation Engine |
| STU-004 | Gmail Connected | Gmail authorization successful | Student becomes eligible for automation | Gmail Module |
| STU-005 | Student Activated | Admin changes status to Active | Student available for automation | Automation Engine |
| STU-006 | Student Deactivated | Admin changes status to Inactive | Student excluded from automation | Automation Engine |
| STU-007 | Student Processed | Daily automation completes | Student marked as processed | Workflow |

# 12. State Transition

The following diagram represents the lifecycle of a student within the system.

```
Draft
   │
   ▼
Resume Uploaded
   │
   ▼
Gmail Connected
   │
   ▼
Active
   │
   ▼
Eligible
   │
   ▼
Processing
   │
   ▼
Completed
```

Alternative state transitions:

```
Active
   │
   ▼
Inactive
```

```
Resume Uploaded
   │
   ▼
Resume Missing
   │
   ▼
Not Eligible
```

```
Gmail Connected
   │
   ▼
Gmail Disconnected
   │
   ▼
Not Eligible
```

### State Definitions

| State | Description |
|---------|-------------|
| Draft | Student record has been created but is incomplete. |
| Resume Uploaded | Resume has been successfully uploaded. |
| Gmail Connected | Student's Gmail account has been authorized. |
| Active | Student is active and available for automation. |
| Eligible | Student satisfies all eligibility conditions for automation. |
| Processing | Student is currently being processed by the Automation Engine. |
| Completed | Daily automation cycle has finished for the student. |
| Inactive | Student has been disabled by the Admin. |
| Resume Missing | Resume is unavailable or has been removed. |
| Gmail Disconnected | Gmail authorization is no longer valid. |
| Not Eligible | Student cannot participate in automation until requirements are met. |


# 12. Inputs

The Student Module receives:

- Student Details
- Resume
- Gmail Authorization

---

# 13. Outputs

The Student Module provides:

- Student Profile
- Resume Information
- Gmail Status
- Eligibility Status

These outputs are consumed by the Automation Engine.

---

# 14. Student Eligibility

A student is considered eligible only when:

✔ Student is Active

✔ Resume is Uploaded

✔ Gmail is Connected

If any condition fails,

↓

Student is skipped.

---

# 15. Student Search

The Admin should be able to search students using:

- Name
- Email

---

# 16. Student Filters

Available filters include:

- Active
- Inactive
- Gmail Connected
- Gmail Not Connected
- Resume Uploaded
- Resume Missing

---

# 17. Error Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Duplicate Email | Reject Student |
| Invalid Email | Validation Error |
| Resume Missing | Student Not Eligible |
| Gmail Not Connected | Skip During Automation |
| Student Inactive | Skip During Automation |

---

# 18. Module Dependencies

### Depends On

- Authentication Module

---

### Used By

- Gmail Module
- Automation Module
- Dashboard Module
- Workflow Module

---

# 19. Future Enhancements

Future releases may include:

- Student Login
- Resume Version Management
- Multiple Resume Support
- Profile Completion Score
- AI Resume Analysis
- Resume Parsing
- Bulk Student Import
- Student Activity Timeline

---

# 20. Success Criteria

The Student Module is considered complete when:

- Students can be created.
- Student information can be updated.
- Resumes can be uploaded.
- Gmail accounts can be connected.
- Student eligibility is correctly determined.
- Automation can consume valid student records.

---

# 21. Notes

The Student Module is the foundation of the Employer Outreach Automation process.

Every downstream module depends on the quality and completeness of student information.

Technical implementation details such as APIs, database schema, validation mechanisms, and storage will be documented in the Technical Design phase.

---

# 22. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Student Module |