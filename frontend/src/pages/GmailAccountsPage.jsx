import React from 'react';
import { Mail } from 'lucide-react';

export default function GmailAccountsPage() {
  return (
    <div className="content-container">
      <h1 className="page-title">Gmail Accounts</h1>
      <p className="page-subtitle">Configured Gmail accounts used for sending automated outreach emails.</p>

      <div className="placeholder-page">
        <Mail className="placeholder-icon" strokeWidth={1.5} />
        <h2 className="placeholder-title">Gmail Account Integration</h2>
        <p className="placeholder-desc">
          Connected Gmail accounts and sending quota statuses will be configured here.
        </p>
      </div>
    </div>
  );
}
