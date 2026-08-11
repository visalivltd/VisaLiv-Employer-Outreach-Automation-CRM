import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Mail, 
  Send 
} from 'lucide-react';

// Google / Gmail M Logo Component matching the screenshot
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
  // Summary Metrics Data (placeholder for UI, structured to accept backend API data)
  const metrics = {
    totalCandidates: 60,
    totalEmployers: 25,
    emailsSent: 300,
  };

  // Mock Recent Email Activity Rows matching reference screenshot
  const recentEmails = [
    {
      id: 1,
      studentName: 'Anshika Sharma',
      studentInitial: 'A',
      avatarClass: 'avatar-blue',
      employer: 'ABC Technologies',
      gmailAccountName: 'Gmail Account 1',
      gmailAccountEmail: 'demo@gmail.com',
      subject: 'Collaboration Opportunity',
      status: 'Sent',
      sentAt: '21 May 2025, 10:30 AM',
    },
    {
      id: 2,
      studentName: 'Rahul Verma',
      studentInitial: 'R',
      avatarClass: 'avatar-green',
      employer: 'XYZ Solutions',
      gmailAccountName: 'Gmail Account 1',
      gmailAccountEmail: 'demo@gmail.com',
      subject: 'Partnership Proposal',
      status: 'Sent',
      sentAt: '21 May 2025, 09:45 AM',
    },
    {
      id: 3,
      studentName: 'Priya Singh',
      studentInitial: 'P',
      avatarClass: 'avatar-yellow',
      employer: 'Tech Global Inc.',
      gmailAccountName: 'Gmail Account 2',
      gmailAccountEmail: 'outreach@gmail.com',
      subject: 'Job Opportunities',
      status: 'Sent',
      sentAt: '20 May 2025, 04:15 PM',
    },
    {
      id: 4,
      studentName: 'Neha Patel',
      studentInitial: 'N',
      avatarClass: 'avatar-purple',
      employer: 'Innovate Pvt Ltd',
      gmailAccountName: 'Gmail Account 1',
      gmailAccountEmail: 'demo@gmail.com',
      subject: 'Work Visa Sponsorship',
      status: 'Sent',
      sentAt: '20 May 2025, 11:20 AM',
    },
    {
      id: 5,
      studentName: 'Vikram Joshi',
      studentInitial: 'V',
      avatarClass: 'avatar-pink',
      employer: 'Future Systems',
      gmailAccountName: 'Gmail Account 2',
      gmailAccountEmail: 'outreach@gmail.com',
      subject: 'Collaboration Opportunity',
      status: 'Sent',
      sentAt: '19 May 2025, 03:05 PM',
    },
  ];

  return (
    <div className="content-container">
      {/* Page Title & Welcome Subtitle */}
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Welcome back, Admin!</p>

      {/* Summary Metric Cards */}
      <div className="summary-grid">
        {/* Card 1: Total Candidates */}
        <div className="summary-card">
          <div className="summary-card-left">
            <div className="summary-icon-box blue">
              <Users size={24} strokeWidth={2.2} />
            </div>
            <div className="summary-info">
              <div className="summary-label">Total Candidates</div>
              <div className="summary-value blue">{metrics.totalCandidates}</div>
            </div>
          </div>
          <div className="summary-watermark">
            <Users size={72} />
          </div>
        </div>

        {/* Card 2: Total Employers */}
        <div className="summary-card">
          <div className="summary-card-left">
            <div className="summary-icon-box green">
              <Building2 size={24} strokeWidth={2.2} />
            </div>
            <div className="summary-info">
              <div className="summary-label">Total Employers</div>
              <div className="summary-value green">{metrics.totalEmployers}</div>
            </div>
          </div>
          <div className="summary-watermark">
            <Building2 size={72} />
          </div>
        </div>

        {/* Card 3: Emails Sent */}
        <div className="summary-card">
          <div className="summary-card-left">
            <div className="summary-icon-box purple">
              <Mail size={24} strokeWidth={2.2} />
            </div>
            <div className="summary-info">
              <div className="summary-label">Emails Sent</div>
              <div className="summary-value purple">{metrics.emailsSent}</div>
            </div>
          </div>
          <div className="summary-watermark">
            <Send size={72} />
          </div>
        </div>
      </div>

      {/* Recent Email Activity Section */}
      <div className="activity-card">
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
              {recentEmails.map((email) => (
                <tr key={email.id}>
                  <td>
                    <div className="student-cell">
                      <div className={`student-avatar ${email.avatarClass}`}>
                        {email.studentInitial}
                      </div>
                      <span>{email.studentName}</span>
                    </div>
                  </td>
                  <td>{email.employer}</td>
                  <td>
                    <div className="gmail-cell">
                      <GmailLogoIcon />
                      <div className="gmail-details">
                        <span className="gmail-name">{email.gmailAccountName}</span>
                        <span className="gmail-email">({email.gmailAccountEmail})</span>
                      </div>
                    </div>
                  </td>
                  <td>{email.subject}</td>
                  <td>
                    <span className="status-badge sent">{email.status}</span>
                  </td>
                  <td>{email.sentAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="activity-card-footer">
          <Link to="/email-logs" className="footer-link">
            View all email logs
          </Link>
        </div>
      </div>
    </div>
  );
}
