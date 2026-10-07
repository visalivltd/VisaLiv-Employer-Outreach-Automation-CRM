import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send, LayoutGrid, ShieldCheck, FileText } from 'lucide-react';

export default function PublicNavbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="public-navbar">
      <div className="public-nav-container">
        <Link to="/" className="public-brand">
          <div className="public-brand-icon">
            <Send size={24} strokeWidth={2.2} />
          </div>
          <span className="public-brand-title">VisaLiv CRM</span>
        </Link>

        <nav className="public-nav-links">
          <Link 
            to="/" 
            className={`public-nav-link ${isActive('/') ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/privacy-policy" 
            className={`public-nav-link ${isActive('/privacy-policy') ? 'active' : ''}`}
          >
            <ShieldCheck size={16} style={{ display: 'inline', marginRight: '4px' }} />
            Privacy Policy
          </Link>
          <Link 
            to="/terms" 
            className={`public-nav-link ${isActive('/terms') ? 'active' : ''}`}
          >
            <FileText size={16} style={{ display: 'inline', marginRight: '4px' }} />
            Terms of Service
          </Link>
        </nav>

        <div className="public-nav-actions">
          <Link to="/dashboard" className="public-btn-primary">
            <LayoutGrid size={18} />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
