import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PublicLayout from './components/PublicLayout';

import HomePage from './pages/HomePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';

import DashboardPage from './pages/DashboardPage';
import CandidatesPage from './pages/CandidatesPage';
import RealCandidatesPage from './pages/RealCandidatesPage';
import EmployersPage from './pages/EmployersPage';
import GmailAccountsPage from './pages/GmailAccountsPage';
import EmailDraftsPage from './pages/EmailDraftsPage';
import EmailLogsPage from './pages/EmailLogsPage';
import OutreachPage from './pages/OutreachPage';
import EmailTrackingPage from './pages/EmailTrackingPage';

import { ErrorBoundary } from './components/ErrorBoundary';
import './public.css';

function CrmLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} isCollapsed={isCollapsed} onClose={closeSidebar} />

      {/* Main Content Area */}
      <div className={`main-wrapper ${isCollapsed ? 'full-width' : ''}`}>
        {/* Top Header */}
        <Header onToggleSidebar={toggleSidebar} />

        {/* CRM Page View */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Unauthenticated Routes */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
      <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />

      {/* CRM Dashboard & Feature Routes */}
      <Route path="/dashboard" element={<CrmLayout><ErrorBoundary><DashboardPage /></ErrorBoundary></CrmLayout>} />
      <Route path="/candidates" element={<CrmLayout><ErrorBoundary><CandidatesPage /></ErrorBoundary></CrmLayout>} />
      <Route path="/real-candidates" element={<CrmLayout><ErrorBoundary><RealCandidatesPage /></ErrorBoundary></CrmLayout>} />
      <Route path="/employers" element={<CrmLayout><ErrorBoundary><EmployersPage /></ErrorBoundary></CrmLayout>} />
      <Route path="/gmail-accounts" element={<CrmLayout><ErrorBoundary><GmailAccountsPage /></ErrorBoundary></CrmLayout>} />
      <Route path="/email-drafts" element={<CrmLayout><ErrorBoundary><EmailDraftsPage /></ErrorBoundary></CrmLayout>} />
      <Route path="/email-tracking" element={<CrmLayout><ErrorBoundary><EmailTrackingPage /></ErrorBoundary></CrmLayout>} />
      <Route path="/email-logs" element={<CrmLayout><ErrorBoundary><EmailLogsPage /></ErrorBoundary></CrmLayout>} />
      <Route path="/outreach" element={<CrmLayout><ErrorBoundary><OutreachPage /></ErrorBoundary></CrmLayout>} />

      {/* Catch-all fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
