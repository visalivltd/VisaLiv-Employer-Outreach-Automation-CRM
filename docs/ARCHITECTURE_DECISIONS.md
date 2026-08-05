# Architecture Decisions

> Enterprise Architecture Decision Log

---

# Document Information

| Field | Value |
|--------|-------|
| Project | VisaLiv Employer Outreach Automation CRM |
| Document | Architecture Decisions |
| Version | 1.0 |
| Status | Active |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# Purpose

This document records important architectural decisions, assumptions, implementation recommendations, and deferred improvements identified during project planning and design.

Unlike Business Requirements or Functional Design documents, this file is a living document.

Its purpose is to capture architectural knowledge so future implementation decisions remain consistent.

---

# Status Legend

| Status | Meaning |
|---------|----------|
| Proposed | Idea identified but not reviewed |
| Approved | Accepted for future implementation |
| Deferred | Postponed for a later phase |
| Implemented | Already implemented |
| Rejected | Decision discarded |

---

# Decision Log

---

## ARCH-001

### Title

Separate Email History from Workflow History

### Phase

Technical Design

### Status

Approved

### Description

Maintain Email History and Workflow History as independent modules.

Email History tracks technical email delivery.

Workflow tracks the student's application lifecycle.

### Reason

Keeps responsibilities separated and supports future ATS functionality.

---

## ARCH-002

### Title

Queue Correlation ID

### Phase

Technical Design

### Status

Approved

### Description

Every automation execution should have a Correlation ID.

All queue items generated during the same automation run should reference that Correlation ID.

### Reason

Simplifies debugging and monitoring.

---

## ARCH-003

### Title

Centralized Placeholder Dictionary

### Phase

Technical Design

### Status

Approved

### Description

Maintain all supported template placeholders in one centralized definition.

Example

- Student Name
- Student Email
- Resume
- Current Date

### Reason

Improves consistency and simplifies future placeholder additions.

---

## ARCH-004

### Title

Automation Engine Internal Components

### Phase

Technical Design

### Status

Deferred

### Description

Split the Automation Engine into logical internal components.

- Validation Engine
- Selection Engine
- Queue Engine

### Reason

Improves maintainability without changing business behavior.

---

## ARCH-005

### Title

Separate Employer Status and Employer State

### Phase

Functional Design

### Status

Approved

### Description

Status represents Admin control.

State represents system lifecycle.

Example

Status

- Active
- Inactive

State

- Eligible
- Cooldown
- Selected

### Reason

Clear separation of business state and administrative state.

---

## ARCH-006

### Title

Separate Gmail Connection from Gmail Availability

### Phase

Functional Design

### Status

Approved

### Description

A Gmail account may be connected but temporarily unavailable.

Automation should check availability instead of connection alone.

### Reason

Supports expired authorizations and future health monitoring.

---

# Future Decisions

New architectural decisions should be recorded here before implementation whenever they significantly impact the system.

---

# Notes

This document is a living record.

Entries may be added, updated, or marked as implemented throughout the project lifecycle.

Business Requirements and Functional Design documents remain the official source of business behavior.

This document records architectural intent and implementation guidance.

---

# Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial Architecture Decision Log |