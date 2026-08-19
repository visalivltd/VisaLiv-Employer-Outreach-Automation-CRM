import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
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


export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Top Header */}
        <Header onToggleSidebar={toggleSidebar} />

        {/* Page Routes */}
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/real-candidates" element={<RealCandidatesPage />} />
            <Route path="/employers" element={<EmployersPage />} />
            <Route path="/gmail-accounts" element={<GmailAccountsPage />} />
            <Route path="/email-drafts" element={<EmailDraftsPage />} />
            <Route path="/email-tracking" element={<ErrorBoundary><EmailTrackingPage /></ErrorBoundary>} />
            <Route path="/email-logs" element={<EmailLogsPage />} />
            <Route path="/outreach" element={<OutreachPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
