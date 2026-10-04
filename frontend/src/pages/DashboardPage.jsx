import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Mail,
  Send,
  Inbox,
  ShieldCheck,
  Clock3,
  Target,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();

function GmailLogoIcon() {
  return (
    <svg className="gmail-icon" viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M22 6v12a2 2 0 0 1-2 2h-2V9.5L12 14 6 9.5V20H4a2 2 0 0 1-2-2V6c0-1.7 1.9-2.7 3.3-1.7L12 9l6.7-4.7C20.1 3.3 22 4.3 22 6z" />
      <path fill="#34A853" d="M4 20h2V9.5L2 6.5V18a2 2 0 0 0 2 2z" />
      <path fill="#EA4335" d="M22 6.5l-4 3V20h2a2 2 0 0 0 2-2V6.5z" />
      <path fill="#FBBC04" d="M18 4.3l-6 4.2-6-4.2A2 2 0 0 0 3.3 6L12 12l8.7-6a2 2 0 0 0-2.7-1.7z" />
    </svg>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getYesterdayStr = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  const [filterDate, setFilterDate] = useState(todayStr);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const url = filterDate
          ? `${API_BASE_URL}/dashboard?target_date=${filterDate}`
          : `${API_BASE_URL}/dashboard`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();

        setDashboard(data);
        setError('');
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [filterDate]);

  if (loading) {
    return (
      <div className="content-container">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="content-container">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{error || 'Failed to load dashboard.'}</p>
      </div>
    );
  }

  const recentEmails = dashboard.recentEmails || [];

  return (
    <div className="content-container">

      {/* Top Page Header & Live Date Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Dashboard
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
            Welcome back, Admin! Live real-time statistics & activity monitor.
          </p>
        </div>

        {/* Live Date Filter Controls with Highlighted Active State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <CalendarIcon size={18} color="#2563eb" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Filter Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '13px', color: '#0f172a', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          />
          <button
            onClick={() => setFilterDate(todayStr)}
            style={{
              border: filterDate === todayStr ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: filterDate === todayStr ? '#2563eb' : '#eff6ff',
              color: filterDate === todayStr ? '#ffffff' : '#2563eb',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Today
          </button>
          <button
            onClick={() => setFilterDate(yesterdayStr)}
            style={{
              border: filterDate === yesterdayStr ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: filterDate === yesterdayStr ? '#2563eb' : '#f8fafc',
              color: filterDate === yesterdayStr ? '#ffffff' : '#475569',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Yesterday
          </button>
          <button
            onClick={() => setFilterDate('')}
            style={{
              border: filterDate === '' ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: filterDate === '' ? '#2563eb' : '#f8fafc',
              color: filterDate === '' ? '#ffffff' : '#64748b',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            All Time
          </button>
        </div>
      </div>

      {/* 6 KPI Cards Grid */}
      <div className="kpi-grid-6">

        {/* Card 1: Total Students */}
        <div className="kpi-card blue">
          <div className="kpi-card-header">
            <div className="kpi-icon-circle">
              <Users size={22} strokeWidth={2.2} />
            </div>
            <div className="kpi-card-body">
              <span className="kpi-label">Total Students</span>
              <span className="kpi-value">{dashboard.totalCandidates ?? 0}</span>
            </div>
          </div>
          <div className="kpi-subtext green">
            ↑ {dashboard.candidatesThisMonth ?? 0} this month
          </div>
        </div>

        {/* Card 2: Total Employers */}
        <div className="kpi-card green">
          <div className="kpi-card-header">
            <div className="kpi-icon-circle">
              <Building2 size={22} strokeWidth={2.2} />
            </div>
            <div className="kpi-card-body">
              <span className="kpi-label">Total Employers</span>
              <span className="kpi-value">{(dashboard.totalEmployers ?? 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="kpi-subtext green">
            ↑ {dashboard.employersThisMonth ?? 0} this month
          </div>
        </div>

        {/* Card 3: Emails Sent Today */}
        <div className="kpi-card purple">
          <div className="kpi-card-header">
            <div className="kpi-icon-circle">
              <Send size={20} strokeWidth={2.2} />
            </div>
            <div className="kpi-card-body">
              <span className="kpi-label">{filterDate ? 'Emails Sent' : 'Emails Sent Today'}</span>
              <span className="kpi-value">
                {filterDate ? (dashboard.emailsSentOnDate ?? 0) : (dashboard.emailsSentToday ?? dashboard.emailsSent ?? 0)}
              </span>
            </div>
          </div>
          <div className="kpi-subtext green">
            ↑ 12% vs yesterday
          </div>
        </div>

        {/* Card 4: Pending Emails */}
        <div className="kpi-card amber">
          <div className="kpi-card-header">
            <div className="kpi-icon-circle">
              <Clock3 size={22} strokeWidth={2.2} />
            </div>
            <div className="kpi-card-body">
              <span className="kpi-label">Pending Emails</span>
              <span className="kpi-value">{dashboard.pendingEmails ?? 0}</span>
            </div>
          </div>
          <div className="kpi-subtext amber">
            ↓ 8 vs yesterday
          </div>
        </div>

        {/* Card 5: Failed Emails */}
        <div className="kpi-card red">
          <div className="kpi-card-header">
            <div className="kpi-icon-circle">
              <XCircle size={22} strokeWidth={2.2} />
            </div>
            <div className="kpi-card-body">
              <span className="kpi-label">Failed Emails</span>
              <span className="kpi-value">
                {filterDate ? (dashboard.emailsFailedOnDate ?? 0) : (dashboard.emailsFailed ?? 0)}
              </span>
            </div>
          </div>
          <div className="kpi-subtext red">
            ↓ 2 vs yesterday
          </div>
        </div>

        {/* Card 6: Success Rate */}
        <div className="kpi-card sky">
          <div className="kpi-card-header">
            <div className="kpi-icon-circle">
              <Mail size={22} strokeWidth={2.2} />
            </div>
            <div className="kpi-card-body">
              <span className="kpi-label">Success Rate</span>
              <span className="kpi-value">{dashboard.successRate ?? 100}%</span>
            </div>
          </div>
          <div className="kpi-subtext green">
            ↑ 1.2% vs yesterday
          </div>
        </div>

      </div>

      {/* Recent Email Activity Table (Full Width) */}
      <div style={{ marginTop: '24px' }}>
        <div className="activity-card" style={{ marginTop: 0 }}>
          <div className="activity-card-header">
            <h2>Recent Email Activity</h2>
          </div>

        <div className="table-responsive">
          <table className="data-table">

            <thead>
              <tr>
                <th>Student</th>
                <th>Employer</th>
                <th>Gmail Account</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>

            <tbody>

              {recentEmails.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: 'center',
                      padding: '30px',
                    }}
                  >
                    No email activity yet.
                  </td>
                </tr>
              ) : (
                recentEmails.map((email) => (

                  <tr key={email.id}>

                    {/* Student */}
                    <td>
                      <div className="student-cell">

                        <div className="student-avatar avatar-blue">
                          {email.studentInitial}
                        </div>

                        <span>
                          {email.studentName}
                        </span>

                      </div>
                    </td>

                    {/* Employer */}
                    <td>
                      {email.employer}
                    </td>

                    {/* Gmail Account */}
                    <td>
                      <div className="gmail-cell">

                        <GmailLogoIcon />

                        <div className="gmail-details">

                          <span className="gmail-name">
                            {email.gmailAccountEmail}
                          </span>

                        </div>

                      </div>
                    </td>

                    {/* Subject */}
                    <td>
                      {email.subject}
                    </td>

                    {/* Status */}
                    <td>
                      <span className="status-badge sent">
                        {email.status}
                      </span>
                    </td>

                    {/* Sent At */}
                    <td>
                      {email.sentAt
                        ? new Date(
                          email.sentAt
                        ).toLocaleString()
                        : '-'}
                    </td>

                  </tr>

                ))
              )}

            </tbody>

          </table>
        </div>

        <div className="activity-card-footer">
          <Link
            to="/email-logs"
            className="footer-link"
          >
            View all email logs
          </Link>
        </div>

      </div>

    </div>
    </div>
  );
}