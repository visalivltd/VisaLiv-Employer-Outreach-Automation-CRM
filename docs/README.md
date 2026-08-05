# VisaLiv Employer Outreach Automation CRM

> Enterprise Documentation Index

---

# Document Information

| Field | Value |
|--------|-------|
| Project | VisaLiv Employer Outreach Automation CRM |
| Version | 1.0 |
| Status | Active |
| Documentation Structure | Frozen (v1.0) |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# Purpose

This repository contains the complete documentation for the **VisaLiv Employer Outreach Automation CRM**.

The documentation is organized according to the **Software Development Life Cycle (SDLC)** to ensure consistency, maintainability, scalability, and proper project governance.

This documentation serves as the **Single Source of Truth (SSOT)** for the entire project.

Every business decision, architecture change, and implementation must first be reflected in the documentation before development begins.

---

# Documentation Structure

```
docs/

├── README.md
│
├── 00_Project/
│
├── 01_Functional_Design/
│
├── 02_Technical_Design/
│
├── 03_Development/
│
├── 04_Testing/
│
└── 05_Deployment/
```

---

# Documentation Phases

| Phase | Folder | Purpose | Status |
|---------|--------|----------|--------|
| Phase 0 | 00_Project | Business Planning & Project Definition | 🟡 In Progress |
| Phase 1 | 01_Functional_Design | Functional Design of Every Module | ⏳ Pending |
| Phase 2 | 02_Technical_Design | Technical Architecture & System Design | ⏳ Pending |
| Phase 3 | 03_Development | Development Guidelines & Implementation | ⏳ Pending |
| Phase 4 | 04_Testing | Testing Strategy, Bug Tracking & Reports | ⏳ Pending |
| Phase 5 | 05_Deployment | Deployment & Release Documentation | ⏳ Pending |

---

# Folder Overview

---

# README.md

Purpose

Acts as the master documentation index.

Contains:

- Documentation Structure
- Documentation Standards
- Project Progress
- Development Lifecycle
- Navigation Guide

---

# 00_Project

Purpose

Defines **what we are building** and **why we are building it**.

These are business-level documents and contain no implementation details.

## Documents

### 00_Glossary.md

Defines all common business and technical terminology used throughout the project.

Examples:

- Student
- Employer
- Queue
- Workflow
- Scheduler
- Cooldown

---

### 01_Project_Overview.md

Provides a high-level overview of the project.

Contains:

- Introduction
- Objectives
- Scope
- Vision
- Target Users

---

### 02_Business_Requirements.md

Defines all business requirements.

Contains:

- Functional Requirements
- Business Objectives
- User Responsibilities
- Inputs
- Outputs

---

### 03_Business_Rules.md

Defines all automation rules.

Examples:

- Daily Email Limit
- Employer Cooldown
- Duplicate Prevention
- Student Eligibility

---

### 04_System_Workflow.md

Defines the complete end-to-end business workflow.

Contains:

- User Journey
- Automation Flow
- Decision Points
- Inputs & Outputs

---

### 05_System_Architecture.md

Defines the overall architecture of the system.

Contains:

- Major Modules
- Component Interaction
- Data Flow
- Integration Overview

---

### 06_Module_Overview.md

Provides a summary of every business module.

Examples:

- Authentication
- Students
- Employers
- Gmail
- Email Templates
- Queue
- Workflow
- Dashboard

---

### 07_Development_Roadmap.md

Defines the implementation strategy.

Contains:

- Development Phases
- Milestones
- Sprint Order
- Future Roadmap

---

# 01_Functional_Design

Purpose

Defines **what every module should do**.

These documents describe module behavior without implementation details.

## Documents

### Student_Module.md

Student management functionality.

---

### Employer_Module.md

Employer management functionality.

---

### Gmail_Module.md

Student Gmail authorization workflow.

---

### Email_Template_Module.md

Email template creation and personalization.

---

### Automation_Module.md

Automation engine behavior.

---

### Queue_Module.md

Queue generation and processing.

---

### Workflow_Module.md

Student application workflow.

---

### Dashboard_Module.md

Dashboard widgets, reports and statistics.

---

# 02_Technical_Design

Purpose

Defines **how the system will be built**.

---

## Database

Contains

- ER Diagram
- Tables
- Relationships
- Constraints
- Indexes

---

## APIs

Contains

- Authentication APIs
- Student APIs
- Employer APIs
- Gmail APIs
- Automation APIs
- Dashboard APIs

---

## Architecture

Contains

- Frontend Architecture
- Backend Architecture
- Folder Structure
- Layered Architecture
- Service Architecture

---

## Workflows

Contains

- Sequence Diagram
- State Diagram
- Automation Flow
- Processing Flow

---

# 03_Development

Purpose

Contains implementation guidelines followed during development.

## Frontend

Frontend implementation notes.

---

## Backend

Backend implementation notes.

---

## Change_Log.md

Maintains project development history.

Tracks:

- New Features
- Improvements
- Refactoring
- Bug Fixes

---

# 04_Testing

Purpose

Contains all testing documentation.

---

## Test_Cases.md

Manual and automated test cases.

---

## Bug_Log.md

Tracks reported defects.

Contains:

- Bug ID
- Description
- Severity
- Priority
- Status

---

## Test_Report.md

Testing execution summary and final reports.

---

# 05_Deployment

Purpose

Contains deployment documentation.

---

## Deployment_Guide.md

Production deployment process.

---

## Environment.md

Environment variables and server configuration.

---

## Release_Notes.md

Version-wise release history.

---

# Current Progress

## Phase 0 — Project Planning

| Document | Status |
|-----------|--------|
| 00_Glossary.md | ✅ Completed |
| 01_Project_Overview.md | ✅ Completed |
| 02_Business_Requirements.md | ✅ Completed |
| 03_Business_Rules.md | ✅ Completed |
| 04_System_Workflow.md | ✅ Completed |
| 05_System_Architecture.md | ⏳ Pending |
| 06_Module_Overview.md | ⏳ Pending |
| 07_Development_Roadmap.md | ⏳ Pending |

---

# Upcoming Phases

## Phase 1

- Functional Module Design

## Phase 2

- Technical Design
- Database
- APIs
- Architecture
- Sequence Diagrams
- State Diagrams

## Phase 3

- Frontend Development
- Backend Development
- Coding Standards
- Change Log

## Phase 4

- Test Cases
- Bug Reports
- Test Reports

## Phase 5

- Deployment
- Environment Setup
- Release Notes

---

# Documentation Workflow

```
Business Idea

↓

Business Analysis

↓

Project Planning

↓

Functional Design

↓

Technical Design

↓

Development

↓

Testing

↓

Deployment

↓

Maintenance
```

---

# Documentation Rules

- Documentation is written before implementation.
- Business documents must not contain implementation details.
- Technical documents must follow approved business documents.
- Every document must include version information.
- Every document must be reviewed before implementation.
- Documentation should remain synchronized with the implementation.
- Major architectural changes must first be documented.

---

# Versioning Policy

| Version | Meaning |
|----------|----------|
| 1.0 | Initial Release |
| 1.1 | Minor Update |
| 2.0 | Major Revision |

---

# Approval Workflow

```
Draft

↓

Review

↓

Approved

↓

Implementation

↓

Maintenance
```

---

# Documentation Progress

| Phase | Progress |
|--------|-----------|
| 📋 Project Planning | 62% |
| 📑 Functional Design | 0% |
| 🏗 Technical Design | 0% |
| 💻 Development | 0% |
| 🧪 Testing | 0% |
| 🚀 Deployment | 0% |

---

# Current Project Status

Current Phase

**Phase 0 – Project Planning**

Current Version

**Documentation Structure v1.0**

Project Status

**Planning & Documentation**

---

# Notes

This documentation is the official reference for the VisaLiv Employer Outreach Automation CRM.

Any business, architectural, or workflow change must first be documented and reviewed before implementation begins.

This repository follows a **Documentation First → Development Second** approach to ensure maintainability, scalability, and enterprise-level software quality.