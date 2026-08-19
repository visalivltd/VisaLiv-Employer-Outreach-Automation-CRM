import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  FileSpreadsheet,
  X,
  ExternalLink,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const emptyForm = {
  service_name: '',
  email: '',
  country: '',
  industry: '',
  service_website: '',
  hr_email: '',
  recruitment_email: '',
  careers_email: '',
  manager_email: '',
  info_email: '',
  general_email: '',
  primary_email_type: 'Manual',
  is_active: true,
};

export default function EmployersPage() {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add / Edit Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Import Excel Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/employers`);

      if (!response.ok) {
        let detailMsg = 'Failed to fetch employers';
        try {
          const errData = await response.json();
          detailMsg = typeof errData.detail === 'string' ? errData.detail : detailMsg;
        } catch {
          // ignore
        }
        throw new Error(detailMsg);
      }

      const data = await response.json();
      setEmployers(data);
      setError('');
    } catch (err) {
      console.error('Fetch employers error:', err);
      setError(err.message || 'Failed to fetch employers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployers();
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  };

  const openAddForm = () => {
    setEditingEmployer(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const openEditForm = (employer) => {
    setEditingEmployer(employer);

    setForm({
      service_name: employer.service_name || '',
      email: employer.email || '',
      country: employer.country || '',
      industry: employer.industry || '',
      service_website: employer.service_website || '',
      hr_email: employer.hr_email || '',
      recruitment_email: employer.recruitment_email || '',
      careers_email: employer.careers_email || '',
      manager_email: employer.manager_email || '',
      info_email: employer.info_email || '',
      general_email: employer.general_email || '',
      primary_email_type: employer.primary_email_type || (employer.email ? 'Manual' : ''),
      is_active: employer.is_active ?? true,
    });

    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEmployer(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setSuccess('');

      const email = form.email ? form.email.trim() : null;

      if (email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          throw new Error('Please enter a valid email address.');
        }
      }

      const serviceWebsite = form.service_website ? form.service_website.trim() : '';
      if (serviceWebsite) {
        try {
          const url = new URL(serviceWebsite);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error();
          }
        } catch {
          throw new Error('Please enter a valid Service Website URL.');
        }
      }

      const isEditing = Boolean(editingEmployer);
      const url = isEditing
        ? `${API_URL}/employers/${editingEmployer.id}`
        : `${API_URL}/employers`;

      const payload = {
        service_name: form.service_name ? form.service_name.trim() || null : null,
        email: email || null,
        country: form.country ? form.country.trim() || null : null,
        industry: form.industry ? form.industry.trim() || null : null,
        service_website: serviceWebsite || null,
        hr_email: form.hr_email ? form.hr_email.trim() || null : null,
        recruitment_email: form.recruitment_email ? form.recruitment_email.trim() || null : null,
        careers_email: form.careers_email ? form.careers_email.trim() || null : null,
        manager_email: form.manager_email ? form.manager_email.trim() || null : null,
        info_email: form.info_email ? form.info_email.trim() || null : null,
        general_email: form.general_email ? form.general_email.trim() || null : null,
        primary_email_type: form.primary_email_type || (email ? 'Manual' : null),
        is_active: form.is_active,
      };

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        let detail = 'Failed to save employer';
        if (typeof data.detail === 'string') {
          detail = data.detail;
        } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
          detail = data.detail[0].msg;
        }
        throw new Error(detail);
      }

      setSuccess(isEditing ? 'Employer updated successfully.' : 'Employer added successfully.');
      closeForm();
      await fetchEmployers();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleStatus = async (employer) => {
    try {
      setError('');
      setSuccess('');

      const response = await fetch(`${API_URL}/employers/${employer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !employer.is_active }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to update status');

      setSuccess(`${employer.service_name || 'Employer'} is now ${data.is_active ? 'Active' : 'Inactive'}.`);
      await fetchEmployers();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteEmployer = async (employer) => {
    const label = employer.service_name || employer.email || 'this employer';
    if (!window.confirm(`Are you sure you want to delete "${label}"?`)) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch(`${API_URL}/employers/${employer.id}`, { method: 'DELETE' });

      if (!response.ok) {
        let message = 'Failed to delete employer';
        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      setSuccess('Employer deleted successfully.');
      await fetchEmployers();
    } catch (err) {
      setError(err.message);
    }
  };

  // --- Excel Import Modal Flow ---

  const openImportModal = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setError('');
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    if (importing) return;
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Only Excel files (.xlsx) are supported.');
      return;
    }

    setImportFile(file);
    setImportPreview(null);
    setImportResult(null);

    // Auto-generate preview
    try {
      setPreviewLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/employers/preview-import`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to parse Excel file');

      setImportPreview(data);
    } catch (err) {
      setError(err.message || 'Error parsing Excel file preview');
      setImportFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;

    try {
      setImporting(true);
      setError('');
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch(`${API_URL}/employers/import`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to import employers');

      setImportResult(data);
      setSuccess(`Import completed! ${data.imported_count} imported, ${data.skipped_duplicates_count} duplicates skipped.`);
      await fetchEmployers();
    } catch (err) {
      setError(err.message || 'Error executing import');
    } finally {
      setImporting(false);
    }
  };

  const renderEmailTypeBadge = (type) => {
    if (!type) return null;
    let bg = '#f1f5f9';
    let color = '#475569';
    if (type === 'HR') { bg = '#dbeafe'; color = '#1e40af'; }
    else if (type === 'Recruitment') { bg = '#dcfce7'; color = '#15803d'; }
    else if (type === 'Careers') { bg = '#fef3c7'; color = '#b45309'; }
    else if (type === 'Manager') { bg = '#fae8ff'; color = '#86198f'; }
    else if (type === 'Info') { bg = '#e0f2fe'; color = '#0369a1'; }
    else if (type === 'General') { bg = '#ffedd5'; color = '#c2410c'; }
    else if (type === 'Manual') { bg = '#e2e8f0'; color = '#334155'; }

    return (
      <span style={{ backgroundColor: bg, color: color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
        {type}
      </span>
    );
  };

  return (
    <div className="content-container">

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={25} color="#2563eb" />
          </div>

          <div>
            <h1 className="page-title">Employers</h1>
            <p className="page-subtitle">
              Manage target employers, priorities, and import Excel rosters.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={openImportModal} style={{ ...secondaryButtonStyle, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #2563eb', color: '#2563eb' }}>
            <FileSpreadsheet size={18} />
            Import Excel
          </button>

          <button onClick={openAddForm} style={primaryButtonStyle}>
            <Plus size={18} />
            Add Employer
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={errorStyle}>
          {error}
          <button onClick={() => setError('')} style={dismissButtonStyle}>×</button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={successStyle}>
          {success}
          <button onClick={() => setSuccess('')} style={dismissButtonStyle}>×</button>
        </div>
      )}

      {/* Employers Card */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>All Employers</h2>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px' }}>
              {employers.length} employers registered (Excel order preserved)
            </p>
          </div>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>Loading employers...</div>
        ) : employers.length === 0 ? (
          <div style={emptyStateStyle}>
            <Building2 size={36} color="#94a3b8" />
            <p style={{ margin: '10px 0 0', color: '#64748b' }}>No employers found. Click "+ Add Employer" or "Import Excel" to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Service Name</th>
                  <th style={thStyle}>Primary Outreach Email</th>
                  <th style={thStyle}>Email Type</th>
                  <th style={thStyle}>Country</th>
                  <th style={thStyle}>Industry</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Service Website</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {employers.map((employer, index) => (
                  <tr key={employer.id}>
                    <td style={tdStyle}>#{index + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>
                      {employer.service_name || '-'}
                    </td>
                    <td style={tdStyle}>
                      {employer.email ? (
                        <span style={{ fontWeight: '500', color: '#1e293b' }}>{employer.email}</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Email</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {renderEmailTypeBadge(employer.primary_email_type)}
                    </td>
                    <td style={tdStyle}>{employer.country || '-'}</td>
                    <td style={tdStyle}>{employer.industry || '-'}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleStatus(employer)}
                        title="Click to change status"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          border: 'none',
                          borderRadius: '999px',
                          background: employer.is_active ? '#ecfdf5' : '#f1f5f9',
                          color: employer.is_active ? '#047857' : '#64748b',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <span>●</span>
                        {employer.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={tdStyle}>
                      {employer.service_website ? (
                        <a
                          href={employer.service_website.startsWith('http') ? employer.service_website : `https://${employer.service_website}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontWeight: 500 }}
                        >
                          Visit <ExternalLink size={14} />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button onClick={() => openEditForm(employer)} title="Edit employer" style={iconButtonStyle}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deleteEmployer(employer)} title="Delete employer" style={{ ...iconButtonStyle, color: '#dc2626', borderColor: '#fecaca' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employer Modal */}
      {showForm && (
        <div style={modalOverlayStyle} onClick={closeForm}>
          <div style={{ ...modalStyle, maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
                  {editingEmployer ? 'Edit Employer' : 'Add Employer'}
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Configure service details and email priority selection.
                </p>
              </div>
              <button onClick={closeForm} style={closeButtonStyle}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <FormField label="Service Name" name="service_name" value={form.service_name} onChange={handleChange} placeholder="e.g. Penns Mount Residential Care" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormField label="Primary Outreach Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="hr@example.com" />
                <div>
                  <label style={{ display: 'block', marginBottom: '7px', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                    Primary Email Type
                  </label>
                  <select name="primary_email_type" value={form.primary_email_type} onChange={handleChange} style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#ffffff' }}>
                    <option value="Manual">Manual Override</option>
                    <option value="HR">HR Email</option>
                    <option value="Recruitment">Recruitment Email</option>
                    <option value="Careers">Careers Email</option>
                    <option value="Manager">Manager Email</option>
                    <option value="Info">Info Email</option>
                    <option value="General">General Email</option>
                  </select>
                </div>
              </div>

              {/* Email breakdown fields */}
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>
                  Email Breakdown Fields (Strict Priority Order: HR → Recruitment → Careers → Manager → Info → General)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <FormField label="HR Email" name="hr_email" type="email" value={form.hr_email} onChange={handleChange} placeholder="hr@company.com" />
                  <FormField label="Recruitment Email" name="recruitment_email" type="email" value={form.recruitment_email} onChange={handleChange} placeholder="jobs@company.com" />
                  <FormField label="Careers Email" name="careers_email" type="email" value={form.careers_email} onChange={handleChange} placeholder="careers@company.com" />
                  <FormField label="Manager Email" name="manager_email" type="email" value={form.manager_email} onChange={handleChange} placeholder="manager@company.com" />
                  <FormField label="Info Email" name="info_email" type="email" value={form.info_email} onChange={handleChange} placeholder="info@company.com" />
                  <FormField label="General Email" name="general_email" type="email" value={form.general_email} onChange={handleChange} placeholder="general@company.com" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormField label="Country" name="country" value={form.country} onChange={handleChange} placeholder="United Kingdom" />
                <FormField label="Industry" name="industry" value={form.industry} onChange={handleChange} placeholder="Healthcare" />
              </div>

              <FormField label="Service Website" name="service_website" type="url" value={form.service_website} onChange={handleChange} placeholder="https://example.com" />

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', marginBottom: '22px', fontSize: '14px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }} />
                Employer is Active
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                <button type="button" onClick={closeForm} style={secondaryButtonStyle}>Cancel</button>
                <button type="submit" style={{ ...primaryButtonStyle, flex: 1, justifyContent: 'center' }}>
                  {editingEmployer ? 'Save Changes' : 'Add Employer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div style={modalOverlayStyle} onClick={closeImportModal}>
          <div style={{ ...modalStyle, maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet color="#2563eb" size={24} /> Excel Employer Import
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Upload an Excel (.xlsx) file. System auto-selects primary email by priority: <strong>HR → Recruitment → Careers → Manager → Info → General</strong>.
                </p>
              </div>
              <button onClick={closeImportModal} style={closeButtonStyle}><X size={18} /></button>
            </div>

            {/* File Selection Box */}
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '16px' }}>
              <Upload size={32} color="#2563eb" style={{ marginBottom: '8px' }} />
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                {importFile ? importFile.name : 'Select or Drop Excel file (.xlsx)'}
              </p>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} id="excel-file-input" style={{ display: 'none' }} />
              <label htmlFor="excel-file-input" style={{ ...primaryButtonStyle, display: 'inline-flex', cursor: 'pointer', padding: '8px 16px', fontSize: '13px' }}>
                Browse Excel File
              </label>
            </div>

            {previewLoading && (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                Parsing and evaluating email priority...
              </div>
            )}

            {/* Preview Results Table */}
            {importPreview && !previewLoading && (
              <div>
                {/* Stats Summary Bar */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Total Rows: <strong>{importPreview.total_rows}</strong>
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px' }}>
                    Ready to Import: {importPreview.valid_count}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>
                    Duplicates Skipped: {importPreview.duplicate_count}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                    No Email: {importPreview.no_email_count}
                  </span>
                  {importPreview.invalid_rows_count > 0 && (
                    <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px' }}>
                      Invalid Rows: {importPreview.invalid_rows_count}
                    </span>
                  )}
                </div>

                {/* Preview Table */}
                <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', sticky: 'top', position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                        <th style={{ padding: '10px' }}>#</th>
                        <th style={{ padding: '10px' }}>Service Name</th>
                        <th style={{ padding: '10px' }}>Selected Primary Email</th>
                        <th style={{ padding: '10px' }}>Email Type</th>
                        <th style={{ padding: '10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row) => (
                        <tr key={row.row_number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', color: '#64748b' }}>{row.row_number}</td>
                          <td style={{ padding: '10px', fontWeight: '600', color: '#0f172a' }}>{row.service_name || '-'}</td>
                          <td style={{ padding: '10px' }}>
                            {row.primary_email ? (
                              <span>{row.primary_email}</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Email</span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>{renderEmailTypeBadge(row.primary_email_type)}</td>
                          <td style={{ padding: '10px' }}>
                            {row.status === 'Ready' && <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Ready</span>}
                            {row.status === 'Duplicate' && <span style={{ color: '#d97706', fontWeight: '600' }} title={row.status_reason}>⚠ Duplicate (Skipped)</span>}
                            {row.status === 'No Email' && <span style={{ color: '#475569', fontWeight: '500' }}>ℹ No Email (Imported)</span>}
                            {row.status === 'Invalid' && <span style={{ color: '#dc2626', fontWeight: '600' }} title={row.status_reason}>✕ Invalid</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Result Notification */}
            {importResult && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{importResult.message}</div>
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>
                    Total: {importResult.total_rows} | Imported: {importResult.imported_count} | Skipped: {importResult.skipped_duplicates_count} | No Email: {importResult.no_email_count}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={closeImportModal} style={secondaryButtonStyle}>
                {importResult ? 'Close' : 'Cancel'}
              </button>

              {importPreview && !importResult && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || (importPreview.valid_count === 0 && importPreview.no_email_count === 0)}
                  style={{ ...primaryButtonStyle, opacity: importing ? 0.7 : 1 }}
                >
                  {importing ? 'Importing Employers...' : `Confirm & Import (${importPreview.valid_count + importPreview.no_email_count} Rows)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


/* ---------- Styles ---------- */

const primaryButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '11px 18px',
  border: 'none',
  borderRadius: '8px',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const secondaryButtonStyle = {
  padding: '11px 18px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  background: '#fff',
  color: '#334155',
  fontWeight: 600,
  cursor: 'pointer',
};

const iconButtonStyle = {
  width: '34px',
  height: '34px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #cbd5e1',
  borderRadius: '7px',
  background: '#fff',
  color: '#2563eb',
  cursor: 'pointer',
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '14px',
  overflow: 'hidden',
};

const thStyle = {
  padding: '14px 18px',
  textAlign: 'left',
  fontSize: '13px',
  color: '#64748b',
  fontWeight: 600,
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '16px 18px',
  borderBottom: '1px solid #eef2f7',
  fontSize: '14px',
  color: '#334155',
  whiteSpace: 'nowrap',
};

const emptyStateStyle = {
  padding: '50px',
  textAlign: 'center',
  color: '#64748b',
};

const errorStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  marginBottom: '18px',
  borderRadius: '8px',
  background: '#fef2f2',
  color: '#dc2626',
  border: '1px solid #fecaca',
};

const successStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  marginBottom: '18px',
  borderRadius: '8px',
  background: '#ecfdf5',
  color: '#047857',
  border: '1px solid #a7f3d0',
};

const dismissButtonStyle = {
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  fontSize: '20px',
  cursor: 'pointer',
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
};

const modalStyle = {
  width: '100%',
  maxWidth: '520px',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: '16px',
  padding: '26px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
};

const closeButtonStyle = {
  border: 'none',
  background: '#f1f5f9',
  borderRadius: '8px',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#475569',
};


/* ---------- Form Field ---------- */

function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '9px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          fontSize: '13px',
          outline: 'none',
        }}
      />
    </div>
  );
}