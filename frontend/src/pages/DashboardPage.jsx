import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Google / Gmail M Logo Component
function GmailLogoIcon() {
  return (
    <svg
      className="gmail-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
    >
      <path
        fill="#4285F4"
        d="M22 6v12a2 2 0 0 1-2 2h-2V9.5L12 14 6 9.5V20H4a2 2 0 0 1-2-2V6c0-1.7 1.9-2.7 3.3-1.7L12 9l6.7-4.7C20.1 3.3 22 4.3 22 6z"
      />
      <path
        fill="#34A853"
        d="M4 20h2V9.5L2 6.5V18a2 2 0 0 0 2 2z"
      />
      <path
        fill="#EA4335"
        d="M22 6.5l-4 3V20h2a2 2 0 0 0 2-2V6.5z"
      />
      <path
        fill="#FBBC04"
        d="M18 4.3l-6 4.2-6-4.2A2 2 0 0 0 3.3 6L12 12l8.7-6a2 2 0 0 0-2.7-1.7z"
      />
    </svg>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard`
        );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch dashboard data'
          );
        }

        const data = await response.json();

        setDashboard(data);
        setError('');
      } catch (err) {
        console.error(
          'Dashboard fetch error:',
          err
        );

        setError(
          'Failed to load dashboard data.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="content-container">
        <h1 className="page-title">
          Dashboard
        </h1>

        <p className="page-subtitle">
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="content-container">
        <h1 className="page-title">
          Dashboard
        </h1>

        <p className="page-subtitle">
          {error || 'Failed to load dashboard.'}
        </p>
      </div>
    );
  }

  const recentEmails =
    dashboard.recentEmails || [];

  /*
   * Daily outreach rule:
   * Each candidate can be assigned up to 5 employers per day.
   */
  const dailyTarget =
    dashboard.dailyTarget ??
    dashboard.totalCandidates * 5;

  /*
   * This field will come from backend once daily
   * sending statistics are implemented.
   *
   * We intentionally do NOT use total emailsSent here
   * because that is the historical total.
   */
  const emailsSentToday =
    dashboard.emailsSentToday ?? null;

  const remainingToday =
    emailsSentToday !== null
      ? Math.max(
          dailyTarget - emailsSentToday,
          0
        )
      : null;

  const progressPercentage =
    emailsSentToday !== null && dailyTarget > 0
      ? Math.min(
          (emailsSentToday / dailyTarget) * 100,
          100
        )
      : 0;

  return (
    <div className="content-container">

      {/* Page Title */}
      <h1 className="page-title">
        Dashboard
      </h1>

      <p className="page-subtitle">
        Welcome back, Admin!
      </p>

      {/* Summary Metric Cards */}
      <div className="summary-grid">

        {/* Total Candidates */}
        <div className="summary-card">
          <div className="summary-card-left">

            <div className="summary-icon-box blue">
              <Users
                size={24}
                strokeWidth={2.2}
              />
            </div>

            <div className="summary-info">
              <div className="summary-label">
                Total Candidates
              </div>

              <div className="summary-value blue">
                {dashboard.totalCandidates}
              </div>
            </div>

          </div>

          <div className="summary-watermark">
            <Users size={72} />
          </div>
        </div>

        {/* Total Employers */}
        <div className="summary-card">
          <div className="summary-card-left">

            <div className="summary-icon-box green">
              <Building2
                size={24}
                strokeWidth={2.2}
              />
            </div>

            <div className="summary-info">
              <div className="summary-label">
                Total Employers
              </div>

              <div className="summary-value green">
                {dashboard.totalEmployers}
              </div>
            </div>

          </div>

          <div className="summary-watermark">
            <Building2 size={72} />
          </div>
        </div>

        {/* Total Emails Sent */}
        <div className="summary-card">
          <div className="summary-card-left">

            <div className="summary-icon-box purple">
              <Mail
                size={24}
                strokeWidth={2.2}
              />
            </div>

            <div className="summary-info">
              <div className="summary-label">
                Emails Sent
              </div>

              <div className="summary-value purple">
                {dashboard.emailsSent}
              </div>
            </div>

          </div>

          <div className="summary-watermark">
            <Send size={72} />
          </div>
        </div>

        {/* Total Emails Received */}
        <div className="summary-card">
          <div className="summary-card-left">

            <div className="summary-icon-box orange">
              <Inbox
                size={24}
                strokeWidth={2.2}
              />
            </div>

            <div className="summary-info">
              <div className="summary-label">
                Total Emails Received
              </div>

              <div className="summary-value orange">
                {dashboard.totalEmailsReceived ?? dashboard.total_emails_received ?? 0}
              </div>
            </div>

          </div>

          <div className="summary-watermark">
            <Inbox size={72} />
          </div>
        </div>

      </div>

      {/* Daily Outreach Distribution */}
      {/* Daily Outreach Rules */}
      <div
        className="activity-card"
        style={{ marginTop: '24px' }}
      >
        <div className="activity-card-header">
          <div>
            <h2>
              Automated Outreach Rules
            </h2>

            <p
              style={{
                marginTop: '6px',
                marginBottom: 0,
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              Automated employer outreach governance & rules.
            </p>
          </div>
        </div>

        {/* Rules */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',
            gap: '12px',
            padding: '0 20px 20px 20px',
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '14px',
              borderRadius: '10px',
              background: '#eff6ff',
            }}
          >
            <Users
              size={19}
              style={{
                marginTop: '2px',
                flexShrink: 0,
                color: '#2563eb',
              }}
            />

            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '14px',
                  color: '#1e3a8a',
                }}
              >
                5 Employers / Candidate
              </strong>

              <span
                style={{
                  display: 'block',
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                Each candidate can be assigned
                up to 5 employers per day.
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '14px',
              borderRadius: '10px',
              background: '#ecfdf5',
            }}
          >
            <Clock3
              size={19}
              style={{
                marginTop: '2px',
                flexShrink: 0,
                color: '#059669',
              }}
            />

            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '14px',
                  color: '#065f46',
                }}
              >
                3-Day Employer Cooldown
              </strong>

              <span
                style={{
                  display: 'block',
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                Employer enters 3-day cooldown for all candidates after receiving successful outreach.
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '14px',
              borderRadius: '10px',
              background: '#fff7ed',
            }}
          >
            <ShieldCheck
              size={19}
              style={{
                marginTop: '2px',
                flexShrink: 0,
                color: '#ea580c',
              }}
            />

            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '14px',
                  color: '#9a3412',
                }}
              >
                No Duplicate Outreach
              </strong>

              <span
                style={{
                  display: 'block',
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                The same candidate can never email
                the same employer twice.
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Recent Email Activity */}
      <div
        className="activity-card"
        style={{ marginTop: '24px' }}
      >

        <div className="activity-card-header">
          <h2>
            Recent Email Activity
          </h2>
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
  );
}