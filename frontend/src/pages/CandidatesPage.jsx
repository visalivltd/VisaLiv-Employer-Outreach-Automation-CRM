import React from 'react';
import { Users } from 'lucide-react';

export default function CandidatesPage() {
  return (
    <div className="content-container">
      <h1 className="page-title">Candidates</h1>
      <p className="page-subtitle">Manage student candidates seeking visa sponsorship outreach.</p>

      <div className="placeholder-page">
        <Users className="placeholder-icon" strokeWidth={1.5} />
        <h2 className="placeholder-title">Candidates Management</h2>
        <p className="placeholder-desc">
          Candidate records and profiles will be listed here once backend endpoints are connected.
        </p>
      </div>
    </div>
  );
}
