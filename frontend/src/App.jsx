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
            <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
            <Route path="/candidates" element={<ErrorBoundary><CandidatesPage /></ErrorBoundary>} />
            <Route path="/real-candidates" element={<ErrorBoundary><RealCandidatesPage /></ErrorBoundary>} />
            <Route path="/employers" element={<ErrorBoundary><EmployersPage /></ErrorBoundary>} />
            <Route path="/gmail-accounts" element={<ErrorBoundary><GmailAccountsPage /></ErrorBoundary>} />
            <Route path="/email-drafts" element={<ErrorBoundary><EmailDraftsPage /></ErrorBoundary>} />
            <Route path="/email-tracking" element={<ErrorBoundary><EmailTrackingPage /></ErrorBoundary>} />
            <Route path="/email-logs" element={<ErrorBoundary><EmailLogsPage /></ErrorBoundary>} />
            <Route path="/outreach" element={<ErrorBoundary><OutreachPage /></ErrorBoundary>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
