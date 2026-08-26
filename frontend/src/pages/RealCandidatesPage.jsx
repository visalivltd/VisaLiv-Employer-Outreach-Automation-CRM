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
  FileText,
  Mail
} from 'lucide-react';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://visaliv-crm-backend-477131280275.asia-south2.run.app';
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const [systemAccount, setSystemAccount] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRealCand, setEditingRealCand] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // CRM Candidate Selection Helper States
  const [candSearchQuery, setCandSearchQuery] = useState('');
  const [candPasteText, setCandPasteText] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState('');

  const [deletingRealCand, setDeletingRealCand] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchRealCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/real-candidates`);
      if (!res.ok) throw new Error('Failed to fetch real candidates');
      const data = await res.json();
      setRealCandidates(data);
    } catch (err) {
      setError(err.message);
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

  const fetchSystemAccount = async () => {
    try {
      const res = await fetch(`${API_URL}/gmail-oauth/system-account`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.connected) {
          setSystemAccount(data.gmail_email || 'support@visaliv.com');
        } else {
          setSystemAccount(null);
        }
      }
    } catch {
      // ignore
    }
  };

  const connectSystemGmail = () => {
    window.location.href = `${API_URL}/gmail-oauth/connect-system`;
  };

  useEffect(() => {
    fetchRealCandidates();
    fetchCrmCandidates();
    fetchGmailAccounts();
    fetchSystemAccount();

    const handleFocus = () => {
      fetchRealCandidates();
      fetchCrmCandidates();
      fetchGmailAccounts();
      fetchSystemAccount();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const openAddModal = () => {
    setEditingRealCand(null);
    setForm(emptyForm);
    setCandSearchQuery('');
    setCandPasteText('');
    setPasteFeedback('');
    setError('');
    setShowFormModal(true);
  };

  const openEditModal = (rc) => {
    setEditingRealCand(rc);
    setForm({
      real_candidate_id: rc.real_candidate_id || '',
      name: rc.name || '',
      email: rc.email || '',
      candidate_ids: rc.linked_candidate_ids || [],
      summary_sender_gmail_account_id: rc.summary_sender_gmail_account_id || '',
      summary_template_subject: rc.summary_template_subject || emptyForm.summary_template_subject,
      summary_template_body: rc.summary_template_body || emptyForm.summary_template_body,
    });
    setCandSearchQuery('');
    setCandPasteText('');
    setPasteFeedback('');
    setError('');
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setShowFormModal(false);
    setEditingRealCand(null);
    setForm(emptyForm);
    setCandSearchQuery('');
    setCandPasteText('');
    setPasteFeedback('');
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

  const handlePasteAddEmails = () => {
    if (!candPasteText.trim()) return;
    const rawEmails = candPasteText
      .split(/[,;\s\n\r]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (rawEmails.length === 0) return;

    const currentSet = new Set(form.candidate_ids);
    let newlyAdded = 0;
    const notFound = [];

    rawEmails.forEach((emailStr) => {
      const match = crmCandidates.find(
        (c) =>
          (c.email || '').toLowerCase() === emailStr ||
          (c.gmail_account?.gmail_email || '').toLowerCase() === emailStr
      );
      if (match) {
        if (!currentSet.has(match.id)) {
          currentSet.add(match.id);
          newlyAdded++;
        }
      } else {
        if (!notFound.includes(emailStr)) {
          notFound.push(emailStr);
        }
      }
    });

    setForm((prev) => ({ ...prev, candidate_ids: Array.from(currentSet) }));
    setCandPasteText('');

    if (notFound.length > 0) {
      setPasteFeedback(`Added ${newlyAdded} candidate(s). Could not find CRM accounts for: ${notFound.join(', ')}`);
    } else {
      setPasteFeedback(`Successfully matched and added ${newlyAdded} candidate(s).`);
    }
  };

  const appendTagToBody = (tag) => {
    setForm((prev) => ({
      ...prev,
      summary_template_body: prev.summary_template_body + ' ' + tag,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and Personal Email are required.');
      return;
    }

    if (!EMAIL_REGEX.test(form.email.trim())) {
      setError('Please enter a valid personal email address.');
      return;
    }

    if (!form.candidate_ids || form.candidate_ids.length === 0) {
      setError('At least one linked CRM candidate is required.');
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
        real_candidate_id: form.real_candidate_id.trim() || (isEditing ? editingRealCand.real_candidate_id : `RC-${Date.now()}`),
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
      setError(err.message || 'Error generating preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredRealCandidates = realCandidates.filter((rc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rc.name.toLowerCase().includes(q) ||
      rc.email.toLowerCase().includes(q)
    );
  });

  const filteredCrmCandidates = crmCandidates.filter((cand) => {
    if (!candSearchQuery.trim()) return true;
    const q = candSearchQuery.toLowerCase();
    return (
      (cand.full_name || '').toLowerCase().includes(q) ||
      (cand.email || '').toLowerCase().includes(q) ||
      (cand.gmail_account?.gmail_email || '').toLowerCase().includes(q)
    );
  });

  const selectedCrmCandidates = crmCandidates.filter((c) =>
    form.candidate_ids.includes(c.id)
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            Real Candidates Management
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Manage client candidate profiles and configure daily application summary senders.
          </p>
        </div>

        <button
          onClick={openAddModal}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
          }}
        >
          <Plus size={18} /> Add Real Candidate
        </button>
      </div>

      {/* DEDICATED GLOBAL DAILY SUMMARY SENDER CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: systemAccount ? '#ecfdf5' : '#fef2f2',
            color: systemAccount ? '#059669' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Mail size={22} />
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Daily Summary Sender
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <span>{systemAccount || 'No sender account connected'}</span>
              {systemAccount ? (
                <span style={{ fontSize: '12px', color: '#059669', backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  ● Connected
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                  ● Disconnected
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={connectSystemGmail}
            style={{
              backgroundColor: systemAccount ? '#ffffff' : '#2563eb',
              color: systemAccount ? '#334155' : '#ffffff',
              border: systemAccount ? '1px solid #cbd5e1' : 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Send size={15} />
            {systemAccount ? 'Reconnect Gmail' : 'Connect Gmail'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Controls & Search */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search real candidates by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
              <th style={{ padding: '14px 16px' }}>DB ID</th>
              <th style={{ padding: '14px 16px' }}>Name</th>
              <th style={{ padding: '14px 16px' }}>Email</th>
              <th style={{ padding: '14px 16px' }}>Linked CRM Candidates</th>
              <th style={{ padding: '14px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading real candidates...</td>
              </tr>
            ) : filteredRealCandidates.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No real candidates found. Click "+ Add Real Candidate" to create one.
                </td>
              </tr>
            ) : (
              filteredRealCandidates.map((rc) => (
                <tr key={rc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: '500' }}>#{rc.id}</td>
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
              {/* Candidate Information Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#dc2626' }}>*</span>
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

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Personal Email <span style={{ color: '#dc2626' }}>*</span>
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
              </div>

              {/* Linked CRM Candidates Section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                    Linked CRM Candidate Accounts <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: form.candidate_ids.length > 0 ? '#16a34a' : '#dc2626' }}>
                    Selected: {form.candidate_ids.length}
                  </span>
                </div>

                {/* Instant Search Box */}
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search CRM candidates by name or email..."
                    value={candSearchQuery}
                    onChange={(e) => setCandSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Multi-Email Paste Input & Add Button */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <textarea
                      placeholder="Paste CRM candidate emails (comma, semicolon, newline, or space separated e.g. candidate1@gmail.com, candidate2@gmail.com)..."
                      value={candPasteText}
                      onChange={(e) => setCandPasteText(e.target.value)}
                      rows={2}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={handlePasteAddEmails}
                      style={{ padding: '0 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Add Emails
                    </button>
                  </div>
                  {pasteFeedback && (
                    <div style={{ fontSize: '12px', marginTop: '6px', color: pasteFeedback.includes('Could not find') ? '#b91c1c' : '#047857', fontWeight: '500' }}>
                      {pasteFeedback}
                    </div>
                  )}
                </div>

                {/* Candidate Checkbox List (Filtered) */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', maxHeight: '130px', overflowY: 'auto', backgroundColor: '#f8fafc', marginBottom: '12px' }}>
                  {filteredCrmCandidates.length === 0 ? (
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                      {candSearchQuery ? 'No matching CRM Candidates found.' : 'No CRM Candidates created yet.'}
                    </span>
                  ) : (
                    filteredCrmCandidates.map((cand) => {
                      const isChecked = form.candidate_ids.includes(cand.id);
                      return (
                        <label key={cand.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0', fontSize: '13px', color: '#1e293b', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCandidateSelection(cand.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>
                            <strong>{cand.full_name}</strong> ({cand.email}) — <span style={{ color: '#64748b', fontSize: '11px' }}>DB ID #{cand.id}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Selected Candidate Chips */}
                {selectedCrmCandidates.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                      Selected Accounts ({selectedCrmCandidates.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                      {selectedCrmCandidates.map((cand) => (
                        <span
                          key={cand.id}
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>✓ <strong>{cand.full_name}</strong> ({cand.email})</span>
                          <button
                            type="button"
                            onClick={() => toggleCandidateSelection(cand.id)}
                            style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', padding: 0, display: 'flex' }}
                            title="Remove linked candidate"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Application Summary Template Section */}
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
                    rows={6}
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
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0' }}>
              Are you sure you want to delete <strong>{deletingRealCand.name}</strong>? This will unlink all CRM candidates associated with this Real Candidate.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeletingRealCand(null)}
                disabled={deleting}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: '600' }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Summary Modal */}
      {previewData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Daily Application Summary Preview
              </h3>
              <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                <strong style={{ color: '#475569' }}>Recipient:</strong> <span style={{ color: '#0f172a' }}>{previewData.recipient_email}</span>
              </div>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                <strong style={{ color: '#475569' }}>Applications Today:</strong> <span style={{ color: '#059669', fontWeight: '700' }}>{previewData.applications_count}</span>
              </div>
              <div style={{ fontSize: '13px' }}>
                <strong style={{ color: '#475569' }}>Subject:</strong> <span style={{ color: '#0f172a', fontWeight: '600' }}>{previewData.subject}</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Email Body Rendered Preview:
              </label>
              <div style={{ whiteSpace: 'pre-wrap', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '14px', fontSize: '13px', fontFamily: 'sans-serif', color: '#1e293b', maxHeight: '300px', overflowY: 'auto' }}>
                {previewData.body}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
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
