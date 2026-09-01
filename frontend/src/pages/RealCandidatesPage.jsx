import React, { useState, useEffect, useRef } from 'react';
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

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  const detail = error?.response?.data?.detail ?? error?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    try {
      return detail
        .map((item) => (typeof item === "string" ? item : item.msg || item.message || JSON.stringify(item)))
        .join(", ");
    } catch {
      return fallback;
    }
  }

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string") {
      return detail.message;
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return fallback;
};

const emptyForm = {
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

  // Row Selection & Batch Outreach State
  const [selectedRealCandIds, setSelectedRealCandIds] = useState(new Set());
  const [sendingOutreach, setSendingOutreach] = useState(false);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRealCand, setEditingRealCand] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Linked CRM Candidates search & paste state
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const [crmPasteText, setCrmPasteText] = useState('');
  const [crmPasteFeedback, setCrmPasteFeedback] = useState('');

  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [deletingRealCand, setDeletingRealCand] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [sendingSummaries, setSendingSummaries] = useState(false);

  const headerCheckboxRef = useRef(null);

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

  const [systemAccount, setSystemAccount] = useState(null);

  const fetchSystemAccount = async () => {
    try {
      const res = await fetch(`${API_URL}/gmail-oauth/system-account`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.connected) {
          setSystemAccount(data);
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

  const openCreateModal = () => {
    fetchCrmCandidates();
    fetchGmailAccounts();
    setEditingRealCand(null);
    setForm(emptyForm);
    setCrmSearchQuery('');
    setCrmPasteText('');
    setCrmPasteFeedback('');
    setError('');
    setSuccess('');
    setShowFormModal(true);
  };

  const openEditModal = (rc) => {
    fetchCrmCandidates();
    fetchGmailAccounts();
    setEditingRealCand(rc);
    setForm({
      name: rc.name || '',
      email: rc.email || '',
      candidate_ids: rc.linked_candidate_ids || [],
      summary_sender_gmail_account_id: rc.summary_sender_gmail_account_id ? String(rc.summary_sender_gmail_account_id) : '',
      summary_template_subject: rc.summary_template_subject || 'Application Update',
      summary_template_body: rc.summary_template_body || emptyForm.summary_template_body,
    });
    setCrmSearchQuery('');
    setCrmPasteText('');
    setCrmPasteFeedback('');
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

  const removeCandidateSelection = (candId) => {
    setForm((prev) => ({
      ...prev,
      candidate_ids: prev.candidate_ids.filter((id) => id !== candId),
    }));
  };

  const handlePasteAddCrmCandidates = () => {
    if (!crmPasteText.trim()) return;
    const rawEmails = crmPasteText
      .split(/[,;\s\n\r]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (rawEmails.length === 0) return;

    const currentSet = new Set(form.candidate_ids);
    let newlyAdded = 0;
    const notFound = [];

    rawEmails.forEach((emailStr) => {
      const match = crmCandidates.find(
        (cand) =>
          (cand.email || '').toLowerCase() === emailStr ||
          (cand.gmail_email || '').toLowerCase() === emailStr
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
    setCrmPasteText('');

    if (notFound.length > 0) {
      setCrmPasteFeedback(`Added ${newlyAdded} candidate(s). Not found: ${notFound.join(', ')}`);
    } else {
      setCrmPasteFeedback(`Added ${newlyAdded} candidate(s).`);
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
      setError('Name and Email are required.');
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
        const errorMsg = getErrorMessage({ detail: data.detail }, 'Failed to save Real Candidate');
        throw new Error(errorMsg);
      }

      setSuccess(isEditing ? 'Real Candidate updated successfully.' : 'Real Candidate created successfully.');
      closeFormModal();
      fetchRealCandidates();
    } catch (err) {
      setError(getErrorMessage(err, 'Error saving Real Candidate'));
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

  // Trigger Daily Summary Email for Selected Real Candidates
  const handleSendOutreachForSelected = async () => {
    if (selectedRealCandIds.size === 0) {
      setError('Please select at least one Real Candidate.');
      return;
    }

    try {
      setSendingOutreach(true);
      setError('');
      setSuccess('');

      const payload = {
        real_candidate_ids: Array.from(selectedRealCandIds),
        force: true,
      };

      const res = await fetch(`${API_URL}/real-candidates/send-daily-summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send daily summary');
      }

      const sentCount = data.sent_count ?? 0;
      const skippedCount = data.skipped_count ?? 0;
      const detailMsg = (data.details || [])
        .map((d) => (d.result?.reason ? `${d.name}: ${d.result.reason}` : (d.error ? `${d.name}: ${d.error}` : null)))
        .filter(Boolean)
        .join('; ');

      if (sentCount > 0) {
        setSuccess(`Daily Summary Email Sent Successfully from support@visaliv.com to ${sentCount} Real Candidate(s)!`);
      } else {
        setError(`Daily Summary Run Completed: 0 sent, ${skippedCount} skipped. ${detailMsg ? `Reason: ${detailMsg}` : ''}`);
      }

      setSelectedRealCandIds(new Set());
      fetchRealCandidates();
    } catch (err) {
      setError(err.message || 'Error sending daily summary for selected real candidates');
    } finally {
      setSendingOutreach(false);
    }
  };

  const filteredRealCandidates = realCandidates.filter((rc) => {
    const q = searchQuery.toLowerCase();
    return (
      rc.name.toLowerCase().includes(q) ||
      (rc.real_candidate_id || '').toLowerCase().includes(q) ||
      rc.email.toLowerCase().includes(q)
    );
  });

  const isAllSelected =
    filteredRealCandidates.length > 0 &&
    filteredRealCandidates.every((rc) => selectedRealCandIds.has(rc.id));

  const isSomeSelected =
    selectedRealCandIds.size > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRealCandIds(new Set());
    } else {
      const nextSet = new Set(selectedRealCandIds);
      filteredRealCandidates.forEach((rc) => nextSet.add(rc.id));
      setSelectedRealCandIds(nextSet);
    }
  };

  const handleToggleRow = (rcId) => {
    const nextSet = new Set(selectedRealCandIds);
    if (nextSet.has(rcId)) {
      nextSet.delete(rcId);
    } else {
      nextSet.add(rcId);
    }
    setSelectedRealCandIds(nextSet);
  };

  // Filtered CRM Candidates for Modal Search
  const filteredCrmCandidates = crmCandidates.filter((cand) => {
    if (!crmSearchQuery.trim()) return true;
    const q = crmSearchQuery.toLowerCase();
    const name = (cand.full_name || '').toLowerCase();
    const email = (cand.email || '').toLowerCase();
    const gmail = (cand.gmail_email || '').toLowerCase();
    return name.includes(q) || email.includes(q) || gmail.includes(q);
  });

  const selectedCrmCandidatesList = crmCandidates.filter((c) =>
    form.candidate_ids.includes(c.id)
  );

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

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Send Daily Summary Button for Selected Real Candidates */}
          <button
            onClick={handleSendOutreachForSelected}
            disabled={sendingOutreach || selectedRealCandIds.size === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: selectedRealCandIds.size > 0 ? '#16a34a' : '#cbd5e1',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              cursor: selectedRealCandIds.size > 0 && !sendingOutreach ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              opacity: sendingOutreach ? 0.7 : 1,
            }}
          >
            <Mail size={18} />
            {sendingOutreach ? 'Sending Summary...' : `Send Daily Summary (${selectedRealCandIds.size})`}
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

      {/* Daily Summary Sender Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            Daily Summary Sender
          </h2>
          {systemAccount ? (
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                {systemAccount.gmail_email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {systemAccount.connected !== false ? (
                  <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    ● Connected
                  </span>
                ) : (
                  <span style={{ color: '#d97706', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    ● Reauthorization Required
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>
                No sender account connected
              </div>
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0 0' }}>
            Single global system account used for all Real Candidate daily application summaries.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={connectSystemGmail}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: systemAccount ? '1px solid #cbd5e1' : 'none',
              backgroundColor: systemAccount ? '#ffffff' : '#2563eb',
              color: systemAccount ? '#2563eb' : '#ffffff',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <Mail size={15} />
            {systemAccount ? 'Reconnect Gmail' : 'Connect Gmail'}
          </button>
        </div>
      </div>

      {/* Search Filter & Selected Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by Name or Email..."
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

        {selectedRealCandIds.size > 0 && (
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: '6px' }}>
            Selected: {selectedRealCandIds.size} Real Candidate{selectedRealCandIds.size !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Data Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
              <th style={{ width: '40px', textAlign: 'center', padding: '14px 10px' }}>
                <input
                  type="checkbox"
                  ref={headerCheckboxRef}
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  disabled={filteredRealCandidates.length === 0}
                  style={{ cursor: 'pointer' }}
                />
              </th>
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
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading real candidates...</td>
              </tr>
            ) : filteredRealCandidates.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No real candidates found. Click "+ Add Real Candidate" to create one.
                </td>
              </tr>
            ) : (
              filteredRealCandidates.map((rc) => {
                const isSelected = selectedRealCandIds.has(rc.id);
                return (
                  <tr key={rc.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isSelected ? '#f0f9ff' : 'transparent' }}>
                    <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(rc.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
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
                );
              })
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

                <div>
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
              </div>

              {/* Linked CRM Candidates */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Linked CRM Candidate Accounts
                </label>

                {/* Instant Search Input */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search CRM candidates by name or email..."
                    value={crmSearchQuery}
                    onChange={(e) => setCrmSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Manual Email Paste Textarea & Add Button */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <textarea
                      placeholder="Enter or paste candidate emails (comma, semicolon, newline, or space separated)..."
                      value={crmPasteText}
                      onChange={(e) => setCrmPasteText(e.target.value)}
                      rows={2}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={handlePasteAddCrmCandidates}
                      style={{ padding: '0 12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Add Emails
                    </button>
                  </div>
                  {crmPasteFeedback && (
                    <div style={{ fontSize: '11px', marginTop: '4px', color: crmPasteFeedback.includes('Not found') ? '#b91c1c' : '#047857', fontWeight: 500 }}>
                      {crmPasteFeedback}
                    </div>
                  )}
                </div>

                {/* Search Results Dropdown List (Fast Cap 20) */}
                {crmSearchQuery.trim() && (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', maxHeight: '130px', overflowY: 'auto', backgroundColor: '#ffffff', marginBottom: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    {filteredCrmCandidates.length === 0 ? (
                      <div style={{ padding: '8px 10px', fontSize: '12px', color: '#94a3b8' }}>No matching CRM candidates found.</div>
                    ) : (
                      filteredCrmCandidates.slice(0, 20).map((cand) => {
                        const isChecked = form.candidate_ids.includes(cand.id);
                        return (
                          <div
                            key={cand.id}
                            onClick={() => toggleCandidateSelection(cand.id)}
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '12.5px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isChecked ? '#f0f9ff' : 'transparent' }}
                          >
                            <span>
                              <strong>{cand.full_name}</strong> — <span style={{ color: '#64748b' }}>{cand.email}</span>
                            </span>
                            {isChecked && (
                              <span style={{ color: '#0284c7', fontWeight: 700, fontSize: '11px' }}>✓ Selected</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Selected CRM Candidates Compact Chips */}
                {selectedCrmCandidatesList.length > 0 ? (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Selected Candidates ({selectedCrmCandidatesList.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto' }}>
                      {selectedCrmCandidatesList.map((cand) => (
                        <span
                          key={cand.id}
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>✓ <strong>{cand.full_name}</strong> ({cand.email})</span>
                          <button
                            type="button"
                            onClick={() => removeCandidateSelection(cand.id)}
                            style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', padding: 0, display: 'flex' }}
                            title="Remove candidate"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    No CRM candidates linked yet. Search or paste emails above.
                  </div>
                )}
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
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                        title={`Click to insert ${tag}`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={8}
                    value={form.summary_template_body}
                    onChange={(e) => setForm((prev) => ({ ...prev, summary_template_body: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : editingRealCand ? 'Update Real Candidate' : 'Create Real Candidate'}
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
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginTop: 0, marginBottom: '8px' }}>
              Delete Real Candidate?
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              Are you sure you want to delete <strong>{deletingRealCand.name}</strong> (#{deletingRealCand.id})? This will unlink their CRM candidate accounts, but will NOT delete the underlying candidates.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeletingRealCand(null)}
                disabled={deleting}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: '600', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Preview Modal */}
      {previewData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Daily Summary Preview
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {previewData.realCandName} ({previewData.realCandId})
                </span>
              </div>
              <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>To:</div>
              <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{previewData.recipient_email}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Subject:</div>
              <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {previewData.subject}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Body Preview:</div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '13px', color: '#334155', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, lineHeight: '1.5' }}>
                {previewData.body}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
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
