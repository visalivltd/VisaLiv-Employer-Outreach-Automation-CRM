import React from 'react';
import { FileText } from 'lucide-react';

export default function EmailLogsPage() {
  return (
    <div className="content-container">
      <h1 className="page-title">Email Logs</h1>
      <p className="page-subtitle">Complete historical logs of all automated outreach communications sent.</p>

      <div className="placeholder-page">
        <FileText className="placeholder-icon" strokeWidth={1.5} />
        <h2 className="placeholder-title">Outreach Email History</h2>
        <p className="placeholder-desc">
          Full detailed email logs and status histories will be shown here.
        </p>
      </div>
    </div>
  );
}
