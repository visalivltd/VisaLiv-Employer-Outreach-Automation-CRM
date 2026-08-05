# 00. Glossary

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | Glossary |
| Version | 1.0 |
| Status | Draft |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# Purpose

This document defines the common business and technical terms used throughout the VisaLiv Employer Outreach Automation CRM project.

It ensures that all stakeholders, developers, testers, and future contributors have a common understanding of the terminology used within the system.

---

# Glossary

| Term | Definition |
|------|------------|
| **Admin** | The primary user of the CRM responsible for managing students, employers, email templates, Gmail connections, and automation. |
| **Student** | A candidate whose Gmail account is used to send job application emails to employers. Students do not log into the CRM during the MVP phase. |
| **Employer** | A company or recruiter that receives job application emails from students. |
| **Employer Database** | The collection of employer records uploaded into the CRM through Excel files. |
| **Resume (CV)** | The student's resume attached to every outgoing email. |
| **Gmail Connection** | The OAuth authorization that allows the CRM to send emails using the student's Gmail account. |
| **OAuth** | Google's secure authorization mechanism used to grant the CRM permission to send emails without storing the student's Gmail password. |
| **Email Template** | A predefined email format containing dynamic placeholders that are replaced with student-specific information before sending. |
| **Dynamic Variable** | A placeholder such as `{{student_name}}` that is automatically replaced with actual student information during email generation. |
| **Automation** | The complete process of selecting employers, generating emails, sending applications, and recording history without manual intervention. |
| **Scheduler** | The service responsible for running the daily automation process and initiating employer selection. |
| **Employer Selection Engine** | The business logic that selects eligible employers for each student while applying all business rules. |
| **Queue** | A temporary list of emails waiting to be sent by the Email Worker. |
| **Queue Item** | A single email task containing the student, employer, template, and sending status. |
| **Email Worker** | The background service responsible for sending queued emails through the Gmail API. |
| **Email History** | A permanent record of every email successfully sent by the system. |
| **Workflow** | The complete lifecycle of a student's job application, from sending the first email to future status updates. |
| **Business Rule** | A predefined condition that controls how the automation behaves. Example: A student can send only 5 emails per day. |
| **Cooldown Period** | The waiting period during which an employer cannot receive another application email from any student after being contacted. Current MVP: 3 days. |
| **Duplicate Prevention** | A rule ensuring that the same student never sends another email to the same employer. |
| **Eligible Employer** | An employer who satisfies all business rules and can receive a new application email. |
| **Active Student** | A student marked as active and eligible to participate in automation. |
| **Active Employer** | An employer record that is enabled for outreach. |
| **Dashboard** | The central overview page displaying automation statistics, queue information, recent activity, and system metrics. |
| **MVP (Minimum Viable Product)** | The first release of the CRM containing only the core automation features required to operate the outreach system. |

---

# Current Business Rules Reference

The following business rules are currently implemented in the MVP:

1. One student can send a maximum of **5 emails per day**.
2. A student will **never send another email to the same employer**.
3. An employer enters a **3-day cooldown** after receiving an email from any student.
4. Only **active students** participate in automation.
5. Only students with a **connected Gmail account** are eligible for automation.

---

# Notes

This glossary should be updated whenever a new business concept, module, or workflow is introduced into the project.

Every technical document in this repository should use the terminology defined in this glossary.