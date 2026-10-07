import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldCheck, CheckCircle2, AlertTriangle, Scale, Mail } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="public-page-wrapper">
      {/* Header Banner */}
      <section className="legal-header-section">
        <div className="public-container">
          <div className="legal-header-content">
            <div className="public-badge">
              <FileText size={14} />
              <span>Terms & Conditions</span>
            </div>
            <h1>Terms of Service</h1>
            <p className="effective-date">
              <strong>App Name:</strong> VisaLiv CRM &nbsp;|&nbsp; <strong>Effective Date:</strong> October 1, 2026 &nbsp;|&nbsp; <strong>Last Updated:</strong> October 7, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Main Terms Body */}
      <section className="public-section bg-white">
        <div className="public-container">
          <div className="legal-body-layout">
            <aside className="legal-toc">
              <div className="toc-sticky">
                <h4>Table of Contents</h4>
                <ul>
                  <li><a href="#acceptance">1. Acceptance of Terms</a></li>
                  <li><a href="#service-description">2. Description of Service</a></li>
                  <li><a href="#user-accounts">3. User Accounts & Responsibilities</a></li>
                  <li><a href="#oauth-integration">4. Gmail OAuth & Third-Party Integration</a></li>
                  <li><a href="#acceptable-use">5. Acceptable Use & Anti-Spam Policy</a></li>
                  <li><a href="#intellectual-property">6. Intellectual Property</a></li>
                  <li><a href="#disclaimers-liability">7. Disclaimers & Limitation of Liability</a></li>
                  <li><a href="#termination">8. Account Termination & Disconnection</a></li>
                  <li><a href="#governing-law">9. Governing Law & Modifications</a></li>
                  <li><a href="#contact">10. Contact Information</a></li>
                </ul>
              </div>
            </aside>

            <main className="legal-content">
              {/* Section 1 */}
              <div className="legal-block" id="acceptance">
                <h2>1. Acceptance of Terms</h2>
                <p>
                  Welcome to <strong>VisaLiv CRM</strong> ("Service", "Application", or "Platform"), provided by VisaLiv Ltd. ("VisaLiv", "we", "us", or "our"). By accessing or using VisaLiv CRM, visiting <a href="https://app.visaliv.com">https://app.visaliv.com</a>, or connecting your email accounts via Google OAuth, you agree to be bound by these Terms of Service ("Terms") and our <Link to="/privacy-policy">Privacy Policy</Link>.
                </p>
                <p>
                  If you do not agree with any part of these Terms, you must not access or use VisaLiv CRM.
                </p>
              </div>

              {/* Section 2 */}
              <div className="legal-block" id="service-description">
                <h2>2. Description of Service</h2>
                <p>
                  VisaLiv CRM is a recruitment automation and outreach management platform designed to help placement specialists and recruiters manage candidate profiles, coordinate target employer communications, generate outreach email drafts, track email logs, and monitor employer replies using connected Google email accounts via Google OAuth 2.0.
                </p>
              </div>

              {/* Section 3 */}
              <div className="legal-block" id="user-accounts">
                <h2>3. User Accounts & Responsibilities</h2>
                <p>
                  As a user of VisaLiv CRM, you agree to:
                </p>
                <ul>
                  <li>Provide accurate, current, and complete information when setting up candidate profiles and employer records.</li>
                  <li>Maintain the confidentiality and security of your account credentials.</li>
                  <li>Ensure that you have proper authorization and lawful consent from candidates and employers prior to initiating recruitment communications.</li>
                  <li>Promptly notify VisaLiv of any unauthorized access or security breach involving your account.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="legal-block" id="oauth-integration">
                <h2>4. Gmail OAuth & Third-Party Integration</h2>
                <p>
                  VisaLiv CRM allows users to connect their Google Workspace or Gmail email accounts using Google OAuth 2.0. By authenticating your Google account with VisaLiv CRM:
                </p>
                <ul>
                  <li>You authorize VisaLiv CRM to send candidate presentation emails, create drafts, and read incoming outreach reply threads on your behalf.</li>
                  <li>You acknowledge that VisaLiv CRM's use of Google API data is subject to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a> and our <Link to="/privacy-policy">Privacy Policy</Link>.</li>
                  <li>You agree to abide by Google’s Terms of Service and Acceptable Use Policies when sending emails through your connected account.</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div className="legal-block" id="acceptable-use">
                <h2>5. Acceptable Use & Anti-Spam Policy</h2>
                <p>
                  VisaLiv CRM is built strictly for legitimate recruitment and candidate outreach. You agree NOT to use the Service to:
                </p>
                <ul>
                  <li>Send unsolicited bulk commercial messages (spam), phishing attempts, or deceptive emails.</li>
                  <li>Violate applicable anti-spam laws, including CAN-SPAM, GDPR, ePrivacy Directive, or CASL.</li>
                  <li>Upload, post, or transmit illegal, defamatory, harassing, abusive, or infringing content.</li>
                  <li>Attempt to compromise the security, integrity, or availability of the VisaLiv CRM platform or Google API services.</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div className="legal-block" id="intellectual-property">
                <h2>6. Intellectual Property Rights</h2>
                <p>
                  All rights, titles, and interests in and to VisaLiv CRM—including software, code, user interfaces, documentation, logos, branding, and designs—are and will remain the exclusive property of VisaLiv Ltd. and its licensors.
                </p>
              </div>

              {/* Section 7 */}
              <div className="legal-block" id="disclaimers-liability">
                <h2>7. Disclaimers & Limitation of Liability</h2>
                <p>
                  <strong>Service Provided "As Is":</strong> VisaLiv CRM is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied.
                </p>
                <p>
                  <strong>Limitation of Liability:</strong> To the maximum extent permitted by applicable law, VisaLiv Ltd. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data loss, or service interruptions resulting from third-party service modifications (such as Google API service updates).
                </p>
              </div>

              {/* Section 8 */}
              <div className="legal-block" id="termination">
                <h2>8. Account Termination & Disconnection</h2>
                <p>
                  You may stop using VisaLiv CRM and disconnect your Google OAuth email accounts at any time. VisaLiv reserves the right to suspend or terminate access to the Service for any user who violates these Terms or engages in unauthorized email practices.
                </p>
              </div>

              {/* Section 9 */}
              <div className="legal-block" id="governing-law">
                <h2>9. Governing Law & Modifications to Terms</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with applicable laws. VisaLiv reserves the right to modify these Terms at any time. Continued use of VisaLiv CRM after updated Terms are published constitutes acceptance of those changes.
                </p>
              </div>

              {/* Section 10 */}
              <div className="legal-block" id="contact">
                <h2>10. Contact Information</h2>
                <p>
                  For questions or legal notices regarding these Terms of Service, please contact:
                </p>
                <div className="contact-card font-mono">
                  <p><strong>VisaLiv Ltd. - Legal Department</strong></p>
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
                <Link to="/privacy-policy" className="public-btn-primary">
                  View Privacy Policy &rarr;
                </Link>
              </div>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
