import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Mail, ArrowRight } from 'lucide-react';
import VisaLivIcon from './VisaLivIcon';

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-container">
        <div className="public-footer-grid">
          <div className="public-footer-brand-col">
            <div className="public-brand" style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo/logo.png" alt="VisaLiv CRM" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
            </div>
            <p className="public-footer-desc">
              VisaLiv CRM is a candidate placement and employer outreach management platform. 
              Connect your Google email accounts securely via OAuth to streamline email communications, 
              outreach tracking, and recruitment automation.
            </p>
          </div>

          <div className="public-footer-links-col">
            <h4 className="public-footer-heading">Navigation</h4>
            <ul className="public-footer-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms">Terms of Service</Link>
              </li>
              <li>
                <Link to="/dashboard">Go to Dashboard</Link>
              </li>
            </ul>
          </div>

          <div className="public-footer-links-col">
            <h4 className="public-footer-heading">Legal & Privacy</h4>
            <ul className="public-footer-links">
              <li>
                <Link to="/privacy-policy">
                  <ShieldCheck size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Google OAuth Scopes
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy#data-protection">
                  Data Security & Protection
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy#google-limited-use">
                  Google Limited Use Policy
                </Link>
              </li>
              <li>
                <Link to="/terms">
                  <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div className="public-footer-contact-col">
            <h4 className="public-footer-heading">Contact & Support</h4>
            <p className="public-footer-contact-item">
              <Mail size={16} />
              <span>support@visaliv.com</span>
            </p>
            <div style={{ marginTop: '16px' }}>
              <Link to="/dashboard" className="public-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                Open Dashboard <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        <div className="public-footer-bottom">
          <p>© {new Date().getFullYear()} VisaLiv CRM. All rights reserved.</p>
          <div className="public-footer-bottom-links">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <span className="dot">•</span>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
