import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Send, 
  LayoutGrid, 
  Users, 
  Briefcase,
  Building2, 
  Mail, 
  FileText,
  BarChart3,
  Inbox,
  Settings,
  User,
  Zap
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Candidates', path: '/candidates', icon: Users },
    { name: 'Employers', path: '/employers', icon: Building2 },
    { name: 'Jobs', path: '/real-candidates', icon: Briefcase },
    { name: 'Email Accounts', path: '/gmail-accounts', icon: Mail },
    { name: 'Email Tracking', path: '/email-tracking', icon: Inbox },
    { name: 'Templates', path: '/email-drafts', icon: FileText },
    { name: 'Automation', path: '/outreach', icon: Zap },
    { name: 'Reports', path: '/email-logs', icon: BarChart3 },
    { name: 'Settings', path: '/dashboard', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
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
        </div>

        {/* User Profile Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
            A
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '13px', lineHeight: '1.2' }}>Admin</div>
            <div style={{ color: '#94a3b8', fontSize: '11px', textOverflow: 'ellipsis', overflow: 'hidden', whitespace: 'nowrap' }}>admin@visaliv.com</div>
          </div>
        </div>
      </aside>
    </>
  );
}
