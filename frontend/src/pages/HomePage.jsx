import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Mail, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  ArrowRight,
  Inbox,
  Lock,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import VisaLivIcon from '../components/VisaLivIcon';

export default function HomePage() {
  return (
    <div className="public-page-wrapper">
      {/* Hero Section */}
      <section className="public-hero">
        <div className="public-container">
          <div className="public-hero-content">
            <div className="public-badge">
              <VisaLivIcon size={16} />
              <span>Recruitment & Outreach Management Platform</span>
            </div>

            <h1 className="public-hero-title">
              Streamline Candidate Placement & Employer Outreach with <span className="highlight">VisaLiv CRM</span>
            </h1>

            <p className="public-hero-subtitle">
              VisaLiv CRM is a dedicated candidate and employer outreach management CRM built to optimize talent placement, candidate management, and automated employer engagement. Connect your Google email accounts securely via OAuth for seamless email communication, reply synchronization, draft generation, and outreach tracking.
            </p>

            <div className="public-hero-actions">
              <Link to="/dashboard" className="public-btn-hero-primary">
                <span>Go to CRM Dashboard</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/privacy-policy" className="public-btn-hero-secondary">
                <ShieldCheck size={18} />
                <span>View Privacy Policy</span>
              </Link>
              <Link to="/terms" className="public-btn-hero-tertiary">
                <FileText size={18} />
                <span>Terms of Service</span>
              </Link>
            </div>

            <div className="public-trust-pills">
              <div className="trust-pill">
                <CheckCircle2 size={16} className="text-blue" />
                <span>Google OAuth 2.0 Integration</span>
              </div>
              <div className="trust-pill">
                <CheckCircle2 size={16} className="text-blue" />
                <span>Candidate Profile Management</span>
              </div>
              <div className="trust-pill">
                <CheckCircle2 size={16} className="text-blue" />
                <span>Employer Engagement & Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Purpose & Platform Overview Section */}
      <section className="public-section bg-white">
        <div className="public-container">
          <div className="section-header center">
            <span className="section-kicker">Purpose & Capabilities</span>
            <h2 className="section-title">What is VisaLiv CRM?</h2>
            <p className="section-description">
              VisaLiv CRM empowers recruitment teams and placement specialists to manage candidate records, coordinate employer contacts, and execute targeted email communications at scale.
            </p>
          </div>

          <div className="public-cards-grid">
            <div className="feature-card">
              <div className="feature-icon bg-blue-light text-blue">
                <Users size={26} />
              </div>
              <h3>Candidate Management</h3>
              <p>
                Maintain detailed profiles for candidates, complete with resume documents, job categories, placement status, and communication logs to streamline matching with employer requisitions.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon bg-green-light text-green">
                <Building2 size={26} />
              </div>
              <h3>Employer Outreach</h3>
              <p>
                Organize target employer organizations, key decision-maker contact details, hiring requirements, and candidate presentation pipelines in a unified workspace.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon bg-purple-light text-purple">
                <Mail size={26} />
              </div>
              <h3>Gmail OAuth Integration</h3>
              <p>
                Users can connect their business email accounts via Google OAuth 2.0 to send candidate outreach emails, compose drafts, and monitor replies directly through VisaLiv CRM.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon bg-amber-light text-amber">
                <Inbox size={26} />
              </div>
              <h3>Outreach & Reply Tracking</h3>
              <p>
                Track outreach progress, email logs, and incoming employer responses in real time with automatic notification alerts and detailed activity timelines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OAuth & Email Integration Deep Dive */}
      <section className="public-section bg-alt">
        <div className="public-container">
          <div className="oauth-explanation-box">
            <div className="oauth-info-left">
              <div className="badge-small">
                <Lock size={14} />
                <span>Google OAuth Verification & Privacy</span>
              </div>
              <h2>How Email Accounts & OAuth Work in VisaLiv CRM</h2>
              <p>
                To enable seamless recruitment communication, VisaLiv CRM allows authorized users to connect their Google Workspace or Gmail accounts using Google’s secure OAuth 2.0 protocol.
              </p>
              <ul className="oauth-feature-list">
                <li>
                  <CheckCircle2 size={18} className="list-icon" />
                  <div>
                    <strong>Email Communication & Outreach:</strong> Send personalized candidate presentation emails to target employers directly from your connected business email address.
                  </div>
                </li>
                <li>
                  <CheckCircle2 size={18} className="list-icon" />
                  <div>
                    <strong>Reply Synchronization & Tracking:</strong> Automatically sync and view employer responses to outreach emails to keep candidate placement status up to date.
                  </div>
                </li>
                <li>
                  <CheckCircle2 size={18} className="list-icon" />
                  <div>
                    <strong>Draft Management:</strong> Prepare outreach email drafts and sync them with your Gmail account for review before sending.
                  </div>
                </li>
                <li>
                  <CheckCircle2 size={18} className="list-icon" />
                  <div>
                    <strong>User-Controlled Access:</strong> Disconnect connected email accounts at any time directly from VisaLiv CRM or Google Security settings.
                  </div>
                </li>
              </ul>

              <div className="visible-links-block">
                <span className="block-label">Important Links & Policies:</span>
                <div className="links-row">
                  <Link to="/privacy-policy" className="policy-link-highlight">
                    <ShieldCheck size={16} />
                    <span>Read Privacy Policy (Google OAuth Scopes & Data Security)</span>
                  </Link>
                  <Link to="/terms" className="policy-link-highlight">
                    <FileCheck size={16} />
                    <span>Terms of Service</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="oauth-info-right">
              <div className="privacy-summary-card">
                <div className="card-header">
                  <ShieldCheck size={22} className="text-blue" />
                  <h3>Data Privacy Commitment</h3>
                </div>
                <p>
                  VisaLiv CRM adheres strictly to the <strong>Google API Services User Data Policy</strong>, including the <strong>Limited Use</strong> requirements.
                </p>
                <div className="privacy-points">
                  <div className="point-item">
                    <Lock size={14} />
                    <span>Tokens & credentials encrypted using industry-standard AES-256</span>
                  </div>
                  <div className="point-item">
                    <RefreshCw size={14} />
                    <span>Email reading restricted solely to outreach communication threads</span>
                  </div>
                  <div className="point-item">
                    <ShieldCheck size={14} />
                    <span>No data sold, shared for advertising, or used for AI model training</span>
                  </div>
                </div>
                <div className="card-footer">
                  <Link to="/privacy-policy" className="btn-full-policy">
                    Full Privacy Policy & OAuth Disclosures &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visible Legal Links Banner */}
      <section className="public-section bg-white border-top">
        <div className="public-container">
          <div className="legal-banner">
            <div className="banner-text">
              <h3>VisaLiv CRM Transparency & Compliance</h3>
              <p>
                For detailed disclosures on data collection, Google OAuth access, user rights, and terms of service, please consult our public legal documents below:
              </p>
            </div>
            <div className="banner-buttons">
              <Link to="/privacy-policy" className="public-btn-primary">
                <ShieldCheck size={18} />
                <span>Privacy Policy</span>
              </Link>
              <Link to="/terms" className="public-btn-secondary">
                <FileText size={18} />
                <span>Terms of Service</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
