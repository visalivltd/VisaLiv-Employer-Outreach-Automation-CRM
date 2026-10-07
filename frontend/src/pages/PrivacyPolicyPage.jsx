import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Server, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="public-page-wrapper">
      {/* Header Banner */}
      <section className="legal-header-section">
        <div className="public-container">
          <div className="legal-header-content">
            <div className="public-badge">
              <ShieldCheck size={14} />
              <span>Legal & Privacy Compliance</span>
            </div>
            <h1>Privacy Policy</h1>
            <p className="effective-date">
              <strong>App Name:</strong> VisaLiv CRM &nbsp;|&nbsp; <strong>Effective Date:</strong> October 1, 2026 &nbsp;|&nbsp; <strong>Last Updated:</strong> October 7, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Main Privacy Policy Body */}
      <section className="public-section bg-white">
        <div className="public-container">
          <div className="legal-body-layout">
            <aside className="legal-toc">
              <div className="toc-sticky">
                <h4>Table of Contents</h4>
                <ul>
                  <li><a href="#overview">1. Overview & Purpose</a></li>
                  <li><a href="#data-collection">2. Data We Collect</a></li>
                  <li><a href="#gmail-oauth">3. Gmail OAuth Access & Scopes</a></li>
                  <li><a href="#email-sync">4. Email Reading, Sending & Syncing</a></li>
                  <li><a href="#storage-security">5. Data Storage & Security</a></li>
                  <li><a href="#oauth-tokens">6. OAuth Tokens Handling</a></li>
                  <li><a href="#google-limited-use">7. Data Sharing & Limited Use</a></li>
                  <li><a href="#retention-deletion">8. Retention & Deletion</a></li>
                  <li><a href="#account-disconnection">9. Account Disconnection</a></li>
                  <li><a href="#contact-info">10. Contact Information</a></li>
                </ul>
              </div>
            </aside>

            <main className="legal-content">
              {/* Section 1 */}
              <div className="legal-block" id="overview">
                <h2>1. Overview & Purpose</h2>
                <p>
                  VisaLiv Ltd. ("VisaLiv", "we", "us", or "our") operates <strong>VisaLiv CRM</strong>, a specialized candidate and employer outreach management CRM designed to facilitate candidate recruitment, employer engagement, talent placement, and email communication tracking.
                </p>
                <p>
                  This Privacy Policy details how VisaLiv CRM collects, uses, stores, and protects personal data, candidate information, employer contacts, and email account data when users interact with our CRM platform or connect their Google email accounts via OAuth 2.0.
                </p>
              </div>

              {/* Section 2 */}
              <div className="legal-block" id="data-collection">
                <h2>2. Data We Collect</h2>
                <p>
                  To deliver recruitment automation and outreach services, VisaLiv CRM processes the following categories of data:
                </p>
                <ul>
                  <li>
                    <strong>Candidate & User Data:</strong> Candidate names, email addresses, phone numbers, CVs/resumes, job titles, placement preferences, and interaction notes entered into the CRM by users.
                  </li>
                  <li>
                    <strong>Employer & Contact Data:</strong> Target employer company names, contact person names, professional email addresses, job requirements, and outreach logs.
                  </li>
                  <li>
                    <strong>Connected Email Account Data:</strong> User email address, profile information, email draft content, sent outreach email logs, and incoming reply messages related to recruitment outreach.
                  </li>
                  <li>
                    <strong>Technical & Usage Logs:</strong> System audit logs, IP addresses, browser agent information, and timestamped API interactions for security and auditing purposes.
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="legal-block" id="gmail-oauth">
                <h2>3. Gmail OAuth Access & Scopes</h2>
                <p>
                  VisaLiv CRM integrates with Google OAuth 2.0 to allow authorized CRM users to connect their business Gmail or Google Workspace accounts. This authorization allows users to conduct recruitment outreach directly through their own email addresses.
                </p>
                <p>
                  When connecting a Google account, VisaLiv CRM requests access to the following specific Google API permissions (OAuth Scopes):
                </p>

                <div className="scope-box">
                  <div className="scope-item">
                    <code>https://www.googleapis.com/auth/gmail.send</code>
                    <p><strong>Purpose:</strong> Used exclusively to send candidate presentation and recruitment outreach emails to employers on behalf of the connected user.</p>
                  </div>

                  <div className="scope-item">
                    <code>https://www.googleapis.com/auth/gmail.readonly</code>
                    <p><strong>Purpose:</strong> Used to inspect incoming email replies from employers in response to outreach sent through VisaLiv CRM, allowing automatic synchronization of conversation threads within the CRM dashboard.</p>
                  </div>

                  <div className="scope-item">
                    <code>https://www.googleapis.com/auth/gmail.compose</code>
                    <p><strong>Purpose:</strong> Used to create and save email drafts within the user's connected Gmail account for review prior to dispatching.</p>
                  </div>

                  <div className="scope-item">
                    <code>https://www.googleapis.com/auth/userinfo.email</code> / <code>userinfo.profile</code>
                    <p><strong>Purpose:</strong> Used to identify the authenticated user's email address and profile name to verify account ownership within VisaLiv CRM.</p>
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div className="legal-block" id="email-sync">
                <h2>4. Email Reading, Sending & Synchronization</h2>
                <p>
                  VisaLiv CRM handles email data with strict scope isolation:
                </p>
                <ul>
                  <li>
                    <strong>Sending Emails:</strong> Emails are sent strictly when triggered by authorized users within the CRM (e.g., initiating outreach campaigns or sending manual candidate presentation messages).
                  </li>
                  <li>
                    <strong>Reading & Synchronization:</strong> Email reading is restricted solely to messages and reply threads initiated through or linked to VisaLiv CRM employer outreach. We inspect incoming messages to update outreach statuses (e.g. Replied, Interested, Not Interested).
                  </li>
                  <li>
                    <strong>No Unrelated Scanning:</strong> VisaLiv CRM does NOT read, scan, index, or store personal emails, unrelated inbox messages, financial communications, or confidential personal messages outside the scope of outreach threads.
                  </li>
                </ul>
              </div>

              {/* Section 5 */}
              <div className="legal-block" id="storage-security">
                <h2>5. Data Storage & Security Measures</h2>
                <p>
                  We implement robust technical and organizational security measures to protect user data against unauthorized access, loss, disclosure, or alteration:
                </p>
                <ul>
                  <li>
                    <strong>Encryption in Transit:</strong> All data transmitted between user browsers, VisaLiv CRM servers, and Google APIs is encrypted using TLS 1.3 / HTTPS.
                  </li>
                  <li>
                    <strong>Encryption at Rest:</strong> Database records, confidential files, and sensitive credentials are encrypted at rest using industry-standard AES-256 encryption.
                  </li>
                  <li>
                    <strong>Infrastructure Security:</strong> VisaLiv CRM is hosted on secure, containerized Google Cloud infrastructure with strict firewall rules, access logs, and role-based access control (RBAC).
                  </li>
                </ul>
              </div>

              {/* Section 6 */}
              <div className="legal-block" id="oauth-tokens">
                <h2>6. OAuth Tokens Handling</h2>
                <p>
                  When a user authenticates via Google OAuth 2.0:
                </p>
                <ul>
                  <li>
                    Google issues an <strong>access token</strong> and a <strong>refresh token</strong>.
                  </li>
                  <li>
                    These tokens are <strong>encrypted at rest</strong> in our secure backend database before storage.
                  </li>
                  <li>
                    Tokens are used exclusively by background synchronization routines to perform user-authorized actions (sending outreach and checking replies).
                  </li>
                  <li>
                    Tokens are never stored in plain text, never transmitted to browser clients, and never shared with any external third party.
                  </li>
                </ul>
              </div>

              {/* Section 7 */}
              <div className="legal-block highlighted-policy" id="google-limited-use">
                <div className="highlighted-header">
                  <ShieldCheck size={24} className="text-blue" />
                  <h3>7. Data Sharing & Google API Limited Use Compliance</h3>
                </div>
                <p>
                  <strong>VisaLiv CRM strictly complies with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</strong>
                </p>
                <div className="limited-use-rules">
                  <div className="rule-box">
                    <CheckCircle2 size={18} className="text-green" />
                    <p><strong>No Data Sale:</strong> We do NOT sell, rent, or trade user data or Gmail data to any third party.</p>
                  </div>
                  <div className="rule-box">
                    <CheckCircle2 size={18} className="text-green" />
                    <p><strong>No Advertising Use:</strong> Data obtained via Google Workspace APIs is NEVER used for serving advertisements, retargeting, or interest-based profiling.</p>
                  </div>
                  <div className="rule-box">
                    <CheckCircle2 size={18} className="text-green" />
                    <p><strong>No AI Model Training:</strong> Google Workspace user data is NEVER used to train, fine-tune, or improve generalized Artificial Intelligence (AI) or Machine Learning (ML) models.</p>
                  </div>
                  <div className="rule-box">
                    <CheckCircle2 size={18} className="text-green" />
                    <p><strong>Restricted Transfer:</strong> Data transfers are restricted strictly to facilitating user-requested candidate outreach services or complying with applicable law.</p>
                  </div>
                </div>
              </div>

              {/* Section 8 */}
              <div className="legal-block" id="retention-deletion">
                <h2>8. Data Retention & Deletion Policy</h2>
                <p>
                  VisaLiv CRM retains candidate records, employer logs, and email activity only for as long as necessary to fulfill recruitment automation purposes or meet legal and regulatory obligations.
                </p>
                <p>
                  <strong>User Data Deletion Rights:</strong> Users have the right to request full deletion of their account data, stored OAuth credentials, candidate records, and email logs. Upon receiving a deletion request, all associated tokens and synced records will be permanently purged from our primary databases within 30 days.
                </p>
              </div>

              {/* Section 9 */}
              <div className="legal-block" id="account-disconnection">
                <h2>9. Account Disconnection & Revoking Access</h2>
                <p>
                  Users maintain complete control over their connected Google email accounts:
                </p>
                <ul>
                  <li>
                    <strong>Within VisaLiv CRM:</strong> Navigate to the <em>Gmail Accounts</em> page and click "Disconnect" next to your email address. This immediately revokes stored tokens and stops all email synchronization.
                  </li>
                  <li>
                    <strong>Via Google Account Settings:</strong> You can revoke VisaLiv CRM’s access at any time by visiting your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account Security - Third-party apps with account access</a> page.
                  </li>
                </ul>
              </div>

              {/* Section 10 */}
              <div className="legal-block" id="contact-info">
                <h2>10. Contact Information</h2>
                <p>
                  If you have any questions, concerns, or requests regarding this Privacy Policy, Google OAuth data handling, or your personal data rights, please contact our Data Protection Officer:
                </p>
                <div className="contact-card font-mono">
                  <p><strong>VisaLiv Ltd. - Support Team</strong></p>
                  <p>Email: <a href="mailto:support@visaliv.com">support@visaliv.com</a></p>
                  <p>Application: VisaLiv CRM</p>
                  <p>Website: <a href="https://app.visaliv.com">https://app.visaliv.com</a></p>
                </div>
              </div>

              {/* Navigation Back */}
              <div className="legal-footer-nav">
                <Link to="/" className="public-btn-secondary">
                  &larr; Back to VisaLiv CRM Home
                </Link>
                <Link to="/terms" className="public-btn-primary">
                  View Terms of Service &rarr;
                </Link>
              </div>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
