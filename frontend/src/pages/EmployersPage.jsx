import React from 'react';
import { Building2 } from 'lucide-react';

export default function EmployersPage() {
  return (
    <div className="content-container">
      <h1 className="page-title">Employers</h1>
      <p className="page-subtitle">Manage corporate contacts and target outreach employers.</p>

      <div className="placeholder-page">
        <Building2 className="placeholder-icon" strokeWidth={1.5} />
        <h2 className="placeholder-title">Employers Directory</h2>
        <p className="placeholder-desc">
          Employer listings and company directory will be displayed here once APIs are integrated.
        </p>
      </div>
    </div>
  );
}
