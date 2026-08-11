import React from 'react';
import { Menu, User, ChevronDown } from 'lucide-react';

export default function Header({ onToggleSidebar }) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button 
          className="menu-toggle-btn" 
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="header-right">
        <div className="admin-profile">
          <div className="avatar-circle">
            <User size={18} strokeWidth={2.2} />
          </div>
          <span className="admin-name">Admin</span>
          <ChevronDown className="chevron-icon" size={16} strokeWidth={2} />
        </div>
      </div>
    </header>
  );
}
