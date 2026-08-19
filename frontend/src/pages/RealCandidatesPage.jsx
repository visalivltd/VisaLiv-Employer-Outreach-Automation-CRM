import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  X,
  FileText
} from 'lucide-react';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const emptyForm = {
  real_candidate_id: '',
  name: '',
  email: '',
  candidate_ids: [],
  summary_sender_gmail_account_id: '',
  summary_template_subject: 'Application Update',
  summary_template_body: `Dear {{candidate_name}},

We are pleased to inform you that we have successfully applied to the following employer(s) on your behalf on {{application_date}}:

{{employer_list}}

We will keep you updated on any further developments regarding your application.

Thank you for your trust in VisaLiv.

Kind regards,

VisaLiv Recruitment Team
support@visaliv.com
www.visaliv.com`,
};

export default function RealCandidatesPage() {
  const [realCandidates, setRealCandidates] = useState([]);
  const [crmCandidates, setCrmCandidates] = useState([]);
  const [gmailAccounts, setGmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRealCand, setEditingRealCand] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [deletingRealCand, setDeletingRealCand] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [sendingSummaries, setSendingSummaries] = useState(false);

  const fetchRealCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/real-candidates`);
      if (!res.ok) {
        let detailMsg = `HTTP Error ${res.status}: Failed to fetch real candidates`;
        try {
          const errData = await res.json();
          detailMsg = typeof errData.detail === 'string' ? errData.detail : detailMsg;
        } catch {
          // ignore
        }
        throw new Error(detailMsg);
      }
      const data = await res.json();
      setRealCandidates(data);
      setError('');
    } catch (err) {
      console.error('Fetch real candidates error:', err);
      setError(err.message || 'Failed to fetch real candidates');
    } finally {
      setLoading(false);
    }
  };

  const fetchCrmCandidates = async () => {
    try {
      const res = await fetch(`${API_URL}/candidates`);
      if (res.ok) {
        const data = await res.json();
        setCrmCandidates(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchGmailAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/gmail-accounts`);
      if (res.ok) {
        const data = await res.json();
        setGmailAccounts(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRealCandidates();
    fetchCrmCandidates();
    fetchGmailAccounts();

    const handleFocus = () => {
      fetchRealCandidates();
      fetchCrmCandidates();
      fetchGmailAccounts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const openCreateModal = () => {
    fetchCrmCandidates();
    fetchGmailAccounts();
    setEditingRealCand(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setShowFormModal(true);
  };

  const openEditModal = (rc) => {
    fetchCrmCandidates();
    fetchGmailAccounts();
    setEditingRealCand(rc);
    setForm({
      real_candidate_id: rc.real_candidate_id || '',
      name: rc.name || '',
      email: rc.email || '',
      candidate_ids: rc.linked_candidate_ids || [],
      summary_sender_gmail_account_id: rc.summary_sender_gmail_account_id ? String(rc.summary_sender_gmail_account_id) : '',
      summary_template_subject: rc.summary_template_subject || 'Application Update',
      summary_template_body: rc.summary_template_body || emptyForm.summary_template_body,
    });
    setError('');
    setSuccess('');
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setShowFormModal(false);
    setEditingRealCand(null);
    setForm(emptyForm);
  };

  const toggleCandidateSelection = (candId) => {
    setForm((prev) => {
      const exists = prev.candidate_ids.includes(candId);
      return {
        ...prev,
        candidate_ids: exists
          ? prev.candidate_ids.filter((id) => id !== candId)
          : [...prev.candidate_ids, candId],
      };
    });
  };

  const appendTagToBody = (tag) => {
    setForm((prev) => ({
      ...prev,
      summary_template_body: prev.summary_template_body + ' ' + tag,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.real_candidate_id.trim() || !form.name.trim() || !form.email.trim()) {
      setError('Real Candidate ID, Name, and Email are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const isEditing = Boolean(editingRealCand);
      const url = isEditing
        ? `${API_URL}/real-candidates/${editingRealCand.id}`
        : `${API_URL}/real-candidates`;

      const payload = {
        real_candidate_id: form.real_candidate_id.trim(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        candidate_ids: form.candidate_ids,
        summary_sender_gmail_account_id: form.summary_sender_gmail_account_id ? parseInt(form.summary_sender_gmail_account_id, 10) : null,
        summary_template_subject: form.summary_template_subject.trim() || null,
        summary_template_body: form.summary_template_body.trim() || null,
      };

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save Real Candidate');
      }

      setSuccess(isEditing ? 'Real Candidate updated successfully.' : 'Real Candidate created successfully.');
      closeFormModal();
      fetchRealCandidates();
    } catch (err) {
      setError(err.message || 'Error saving Real Candidate');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRealCand) return;
    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      const res = await fetch(`${API_URL}/real-candidates/${deletingRealCand.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete Real Candidate');
      }

      setSuccess('Real Candidate unlinked and deleted successfully.');
      setDeletingRealCand(null);
      fetchRealCandidates();
    } catch (err) {
      setError(err.message || 'Error deleting Real Candidate');
    } finally {
      setDeleting(false);
    }
  };

  const handlePreviewSummary = async (rc) => {
    try {
      setLoadingPreview(true);
      setError('');

      const res = await fetch(`${API_URL}/real-candidates/${rc.id}/preview-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to generate preview');
      }

      const data = await res.json();
      setPreviewData({ ...data, realCandName: rc.name, realCandId: rc.real_candidate_id });
    } catch (err) {
      setError(err.message || 'Error generating summary preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTriggerDailySummaries = async () => {
    try {
      setSendingSummaries(true);
      setError('');
      setSuccess('');

      const res = await fetch(`${API_URL}/real-candidates/send-daily-summaries`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to trigger daily summaries');
      }

      setSuccess(`Daily Summary Run Completed. Sent: ${data.sent_count}, Skipped/Up-to-date: ${data.skipped_count}`);
      fetchRealCandidates();
    } catch (err) {
      setError(err.message || 'Error triggering daily summaries');
    } finally {
      setSendingSummaries(false);
    }
  };

  const filteredRealCandidates = realCandidates.filter((rc) => {
    const q = searchQuery.toLowerCase();
    return (
      rc.name.toLowerCase().includes(q) ||
      rc.real_candidate_id.toLowerCase().includes(q) ||
      rc.email.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <UserCheck size={28} color="#2563eb" /> Real Candidates
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Manage real candidates (clients) and configure their daily application-summary email preferences.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleTriggerDailySummaries}
            disabled={sendingSummaries}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              cursor: sendingSummaries ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: sendingSummaries ? 0.7 : 1,
            }}
          >
            <Send size={18} />
            {sendingSummaries ? 'Sending Summaries...' : 'Send Daily Summaries Now'}
          </button>

          <button
            onClick={openCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <Plus size={18} /> Add Real Candidate
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '14px' }}>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} />
          <span style={{ fontSize: '14px' }}>{success}</span>
        </div>
      )}

      {/* Search Filter */}
      <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Search by Real Candidate ID, Name, Email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px 10px 40px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Data Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
              <th style={{ padding: '14px 16px' }}>DB ID</th>
              <th style={{ padding: '14px 16px' }}>Real Candidate ID</th>
              <th style={{ padding: '14px 16px' }}>Name</th>
              <th style={{ padding: '14px 16px' }}>Email</th>
              <th style={{ padding: '14px 16px' }}>Linked CRM Candidates</th>
              <th style={{ padding: '14px 16px' }}>Summary Sender Gmail</th>
              <th style={{ padding: '14px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading real candidates...</td>
              </tr>
            ) : filteredRealCandidates.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No real candidates found. Click "+ Add Real Candidate" to create one.
                </td>
              </tr>
            ) : (
              filteredRealCandidates.map((rc) => (
                <tr key={rc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: '500' }}>#{rc.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1e293b' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>
                      {rc.real_candidate_id}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>{rc.name}</td>
                  <td style={{ padding: '14px 16px', color: '#334155' }}>{rc.email}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {rc.linked_candidates && rc.linked_candidates.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {rc.linked_candidates.map((c) => (
                          <span key={c.id} style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid #cbd5e1' }}>
                            {c.full_name} (#{c.id})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>Unlinked</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>
                    {rc.summary_sender_gmail_email ? (
                      <span style={{ color: '#0369a1', fontWeight: '500' }}>{rc.summary_sender_gmail_email}</span>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>Auto / Default</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handlePreviewSummary(rc)}
                        title="Preview Summary"
                        style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                      >
                        <Eye size={15} /> Preview
                      </button>
                      <button
                        onClick={() => openEditModal(rc)}
                        title="Edit Real Candidate"
                        style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                      >
                        <Edit2 size={15} /> Edit
                      </button>
                      <button
                        onClick={() => setDeletingRealCand(rc)}
                        title="Delete Real Candidate"
                        style={{ background: 'none', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Form Modal */}
      {showFormModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {editingRealCand ? 'Edit Real Candidate' : 'Add Real Candidate'}
              </h2>
              <button onClick={closeFormModal} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Real Candidate ID <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RC-1001 or 10052"
                    value={form.real_candidate_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, real_candidate_id: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Solace Pamela Semanshia"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Real Candidate Personal Email <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. solace@example.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Linked CRM Candidates */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Linked CRM Candidate Accounts
                </label>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', maxHeight: '140px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                  {crmCandidates.length === 0 ? (
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>No CRM Candidates created yet.</span>
                  ) : (
                    crmCandidates.map((cand) => {
                      const isChecked = form.candidate_ids.includes(cand.id);
                      return (
                        <label key={cand.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', fontSize: '13px', color: '#1e293b', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCandidateSelection(cand.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>
                            <strong>{cand.full_name}</strong> ({cand.email}) — ID #{cand.id}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Summary Sender Gmail Account */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Summary Sender Gmail Account
                </label>
                <select
                  value={form.summary_sender_gmail_account_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, summary_sender_gmail_account_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#ffffff' }}
                >
                  <option value="">Auto-resolve (Automatic fallback if exactly 1 Gmail account exists)</option>
                  {gmailAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.gmail_email} (Account #{acc.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Daily Application Summary Template Config */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#2563eb" /> Daily Application Summary Template
                </h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={form.summary_template_subject}
                    onChange={(e) => setForm((prev) => ({ ...prev, summary_template_subject: e.target.value }))}
                    placeholder="Application Update"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Email Body Template
                  </label>

                  {/* Template Variable Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {[
                      '{{candidate_name}}',
                      '{{candidate_email}}',
                      '{{real_candidate_id}}',
                      '{{application_date}}',
                      '{{employer_list}}',
                      '{{application_count}}',
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendTagToBody(tag)}
                        style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={8}
                    value={form.summary_template_body}
                    onChange={(e) => setForm((prev) => ({ ...prev, summary_template_body: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={closeFormModal}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}
                >
                  {saving ? 'Saving...' : 'Save Real Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRealCand && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '450px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0' }}>
              Delete Real Candidate?
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to delete <strong>{deletingRealCand.name}</strong> ({deletingRealCand.real_candidate_id})?
              <br /><br />
              <em>Note: Linked CRM Candidates will be safely unlinked. CRM Candidates, Gmail accounts, email drafts, employers, and email logs will NOT be deleted.</em>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setDeletingRealCand(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: '600' }}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Summary Modal */}
      {previewData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={20} color="#0284c7" /> Live Daily Summary Preview — {previewData.realCandName} ({previewData.realCandId})
              </h3>
              <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', fontSize: '13px', color: '#334155' }}>
                <strong>To:</strong> {previewData.recipient_email}
              </div>
              <div style={{ marginBottom: '8px', fontSize: '13px', color: '#334155' }}>
                <strong>Subject:</strong> {previewData.subject}
              </div>
              <div style={{ fontSize: '13px', color: '#334155' }}>
                <strong>Applications Count:</strong> {previewData.applications_count} employer(s)
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Rendered Email Content Preview (VisaLiv HTML):
              </label>
              <iframe
                srcDoc={previewData.body}
                title="Daily Summary HTML Email Preview"
                style={{
                  width: '100%',
                  height: '450px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPreviewData(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: '600' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
