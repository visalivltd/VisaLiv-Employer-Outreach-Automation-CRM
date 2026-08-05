# Employer Module

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Module | Employer Management |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

The Employer Management Module is responsible for maintaining the employer database used during the outreach automation process.

Employers are imported into the system by the Admin and are later selected by the Automation Engine based on defined business rules.

This module serves as the primary source of employer data for automated email campaigns.

---

# 2. Objectives

The Employer Module is responsible for:

- Managing employer information
- Importing employer data
- Maintaining employer availability
- Preventing duplicate employer records
- Providing employer data to the Automation Engine

---

# 3. Scope

## Included (MVP)

- Import Employers via Excel
- Add Employer
- Edit Employer
- View Employer
- Activate / Deactivate Employer
- Search Employers
- Filter Employers

## Excluded (Future)

- Employer Self Registration
- Company Profile Management
- Employer Portal
- Employer Verification
- Bulk Employer Updates
- AI Employer Enrichment

---

# 4. Primary User

Current User

- Admin

Employers do not have direct access to the CRM in the MVP.

---

# 5. Module Overview

The Employer Module stores employer information imported by the Admin.

The Automation Engine uses this information to identify eligible employers for each student while enforcing all business rules, including duplicate prevention and cooldown periods.

---

# 6. Functional Requirements

The Admin shall be able to:

- Import employer data from Excel.
- Add a new employer manually.
- Update employer information.
- Activate or deactivate employers.
- Search employers.
- Filter employers.
- View employer details.

---

# 7. Module Workflow

```
Upload Excel

↓

Validate Data

↓

Import Employers

↓

Save Employer Records

↓

Activate Employer

↓

Available for Automation

↓

Selected by Automation Engine

↓

Cooldown Applied

↓

Available Again
```

---

# 8. Inputs

The Employer Module receives:

- Employer Excel File
- Employer Details
- Status Updates

---

# 9. Outputs

The Employer Module provides:

- Employer Database
- Employer Status
- Employer Availability
- Employer Eligibility

These outputs are consumed by the Automation Engine.

---

# 10. Validation Rules

## Employer Name

- Required

---

## Company Name

- Required

---

## Employer Email

- Required
- Must be unique
- Must be a valid email format

---

## Excel Import

- File must contain required columns.
- Invalid rows should be skipped and reported.

---

# 11. Business Rules

### EMP-01

Every employer must have a unique email address.

---

### EMP-02

Only active employers are eligible for automation.

---

### EMP-03

An employer who receives an application email enters a cooldown period of **3 days**.

---

### EMP-04

During the cooldown period, no student may send another application to that employer.

---

### EMP-05

After the cooldown expires, the employer becomes eligible again for other students.

---

### EMP-06

A student who has already emailed an employer must never email the same employer again.

---

### EMP-07

Inactive employers must be ignored during employer selection.

---

# 12. Business Events

Business Events represent important actions that occur within the Employer Module.

| Event ID | Event | Trigger | Action | Next Module |
|----------|-------|---------|--------|-------------|
| EMP-001 | Employer Imported | Admin uploads Excel | Employer records created | Employer Module |
| EMP-002 | Employer Created | Admin adds employer | Employer saved | Employer Module |
| EMP-003 | Employer Updated | Admin edits employer | Record updated | Dashboard |
| EMP-004 | Employer Activated | Admin activates employer | Available for automation | Automation Engine |
| EMP-005 | Employer Deactivated | Admin deactivates employer | Excluded from automation | Automation Engine |
| EMP-006 | Employer Selected | Automation selects employer | Queue item generated | Queue Module |
| EMP-007 | Cooldown Started | Email sent successfully | Employer unavailable for 3 days | Automation Engine |
| EMP-008 | Cooldown Expired | 3-day period completed | Employer available again | Automation Engine |

---

# 13. State Transition

The following diagram represents the lifecycle of an employer within the system.

```
Imported
   │
   ▼
Active
   │
   ▼
Eligible
   │
   ▼
Selected
   │
   ▼
Cooldown
   │
   ▼
Eligible
```

Alternative state transitions:

```
Active
   │
   ▼
Inactive
```

```
Eligible
   │
   ▼
Selected
   │
   ▼
Rejected
   │
   ▼
Eligible
```

### State Definitions

| State | Description |
|---------|-------------|
| Imported | Employer data has been imported into the system. |
| Active | Employer is enabled for automation. |
| Eligible | Employer satisfies all business rules for selection. |
| Selected | Employer has been selected for an email. |
| Cooldown | Employer cannot receive another application for 3 days. |
| Inactive | Employer has been disabled by the Admin. |
| Rejected | Employer was skipped during processing due to validation or business rules and may become eligible later if conditions change. |

---

# 14. Module Dependencies

### Depends On

- Authentication Module

### Used By

- Automation Module
- Queue Module
- Dashboard Module

---

# 15. Error Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Duplicate Employer Email | Reject Employer |
| Invalid Email Format | Validation Error |
| Missing Required Excel Columns | Reject Import |
| Duplicate Rows in Excel | Skip Duplicate |
| Employer Inactive | Skip During Automation |
| Employer in Cooldown | Skip During Automation |

---

# 16. Future Enhancements

Future releases may include:

- Employer Portal
- Company Profiles
- Industry Classification
- Employer Ratings
- AI Company Enrichment
- Bulk Employer Synchronization
- Employer Notes & Tags

---

# 17. Success Criteria

The Employer Module is considered complete when:

- Employers can be imported successfully.
- Employers can be created and updated.
- Duplicate employers are prevented.
- Employer eligibility is determined correctly.
- Cooldown rules are enforced.
- Automation can retrieve eligible employers.

---

# 18. Notes

The Employer Module is one of the primary data sources for the Automation Engine.

Its responsibility is limited to maintaining employer information and availability.

Employer selection logic is handled by the Automation Module.

---

# 19. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Employer Module |