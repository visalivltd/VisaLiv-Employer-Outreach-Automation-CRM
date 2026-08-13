import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Send, 
  LayoutGrid, 
  Users, 
  Building2, 
  Mail, 
  FileText,
  FileSpreadsheet
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Candidates', path: '/candidates', icon: Users },
    { name: 'Employers', path: '/employers', icon: Building2 },
    { name: 'Gmail Accounts', path: '/gmail-accounts', icon: Mail },
    { name: 'Email Drafts', path: '/email-drafts', icon: FileText },
    { name: 'Outreach', path: '/outreach', icon: Send },
    { name: 'Email Logs', path: '/email-logs', icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Logo & Name */}
        <div className="sidebar-brand">
          <div className="brand-icon-wrapper">
            <Send className="w-7 h-7" size={26} strokeWidth={2.2} />
          </div>
          <span className="brand-text">VisaLiv CRM</span>
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
