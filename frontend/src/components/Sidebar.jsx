import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Send, 
  LayoutGrid, 
  Users, 
  UserCheck,
  Building2, 
  Mail, 
  FileText,
  FileSpreadsheet,
  Inbox
} from 'lucide-react';

import VisaLivIcon from './VisaLivIcon';

export default function Sidebar({ isOpen, isCollapsed, onClose }) {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Candidates', path: '/candidates', icon: Users },
    { name: 'Real Candidates', path: '/real-candidates', icon: UserCheck },
    { name: 'Employers', path: '/employers', icon: Building2 },
    { name: 'Gmail Accounts', path: '/gmail-accounts', icon: Mail },
    { name: 'Email Drafts', path: '/email-drafts', icon: FileText },
    { name: 'Outreach', path: '/outreach', icon: Send },
    { name: 'Email Tracking', path: '/email-tracking', icon: Inbox },
    { name: 'Email Logs', path: '/email-logs', icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand Logo & Name */}
        <div className="sidebar-brand">
          <div className="brand-logo-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            {isCollapsed ? (
              <img 
                src="/logo/icon.png" 
                alt="VisaLiv" 
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }} 
              />
            ) : (
              <>
                <img 
                  src="/logo/logo.png" 
                  alt="VisaLiv CRM" 
                  style={{ height: '50px', width: 'auto', objectFit: 'contain', maxWidth: '210px' }} 
                />
              </>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `nav-item ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <Icon className="nav-item-icon" size={20} strokeWidth={2} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
