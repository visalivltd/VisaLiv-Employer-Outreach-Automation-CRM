import React, { useEffect, useState, useRef } from 'react';
import { Send, Target, Mail, Play, RefreshCw, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function OutreachPage() {
  const [candidates, setCandidates] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [startingBatch, setStartingBatch] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [candidateId, setCandidateId] = useState('');
  const [employerId, setEmployerId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [loadingData, setLoadingData] = useState(true);
  const [sending, setSending] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const headerCheckboxRef = useRef(null);

  const getItemKey = (item) => `${item.candidate_id}_${item.employer_id}`;

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [candRes, empRes, draftRes, dashRes] = await Promise.all([
        fetch(`${API_BASE_URL}/candidates`),
        fetch(`${API_BASE_URL}/employers`),
        fetch(`${API_BASE_URL}/email-drafts`),
        fetch(`${API_BASE_URL}/dashboard`),
      ]);

      if (candRes.ok) setCandidates(await candRes.json());
      if (empRes.ok) setEmployers(await empRes.json());
      if (draftRes.ok) setDrafts(await draftRes.json());
      if (dashRes.ok) setDashboardStats(await dashRes.json());
    } catch (err) {
      console.error(err);
      setError('Failed to load outreach resources.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadPreview = async () => {
    try {
      setLoadingPreview(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/outreach/preview`);
      if (!res.ok) throw new Error('Failed to fetch outreach preview');
      const data = await res.json();
      setPreviewData(data);
      // Selection is 100% manual — start with empty selection
      setSelectedKeys(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Helper: Count selected items for a specific candidate
  const getCandidateSelectedCount = (candId, currentSelectedKeys = selectedKeys) => {
    if (!previewData || !previewData.items) return 0;
    return previewData.items.filter(
      (i) => i.candidate_id === candId && currentSelectedKeys.has(getItemKey(i))
    ).length;
  };

  // Toggle individual row selection
  const handleToggleRow = (item) => {
    if (!item.eligible) return;

    const key = getItemKey(item);
    const nextKeys = new Set(selectedKeys);

    if (nextKeys.has(key)) {
      nextKeys.delete(key);
      setError('');
    } else {
      const currentCandCount = getCandidateSelectedCount(item.candidate_id, nextKeys);
      if (currentCandCount >= 5) {
        setError(`Daily limit reached — maximum 5 employers per candidate/day. (${item.candidate_name} already has 5 selected)`);
        return;
      }
      setError('');
      nextKeys.add(key);
    }
    setSelectedKeys(nextKeys);
  };

  // Select all eligible items (up to 5 per candidate limit)
  const eligibleItems = previewData ? previewData.items.filter((i) => i.eligible) : [];

  const getMaxSelectableKeys = () => {
    const maxKeys = new Set();
    const candCounts = {};
    eligibleItems.forEach((item) => {
      const count = candCounts[item.candidate_id] || 0;
      if (count < 5) {
        maxKeys.add(getItemKey(item));
        candCounts[item.candidate_id] = count + 1;
      }
    });
    return maxKeys;
  };

  const maxSelectableKeys = getMaxSelectableKeys();

  const isAllSelected =
    eligibleItems.length > 0 &&
    maxSelectableKeys.size > 0 &&
    Array.from(maxSelectableKeys).every((k) => selectedKeys.has(k));

  const isSomeSelected = selectedKeys.size > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    setError('');
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(maxSelectableKeys);
    }
  };

  const handleClearSelection = () => {
    setSelectedKeys(new Set());
    setError('');
  };

  const handleOpenConfirmModal = () => {
    if (selectedKeys.size === 0) {
      setError('Please select at least one eligible outreach email to send.');
      return;
    }
    setError('');
    setShowConfirmModal(true);
  };

  const handleConfirmBatchOutreach = async () => {
    if (!previewData || !previewData.items) return;

    const selectedItems = previewData.items.filter((item) =>
      selectedKeys.has(getItemKey(item))
    );

    if (selectedItems.length === 0) {
      setError('No eligible candidate-employer pairings selected.');
      setShowConfirmModal(false);
      return;
    }

    try {
      setStartingBatch(true);
      setError('');
      setMessage('');

      const res = await fetch(`${API_BASE_URL}/outreach/batch-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedItems),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Batch outreach request failed');

      const sentCount = data.sent_count ?? data.sent ?? 0;
      const failedCount = data.failed_count ?? data.failed ?? 0;
      const skippedCount = data.skipped_count ?? data.skipped ?? 0;

      const failedDetails = (data.details || []).filter((d) => d.status === 'failed');

      if (failedCount > 0 && failedDetails.length > 0) {
        const errorReasons = failedDetails
          .map((d) => d.error || 'Unknown error')
          .join('; ');
        setError(`Email failed: ${errorReasons}`);
      }

      if (sentCount > 0) {
        setMessage(
          `Batch Outreach Complete: ${sentCount} sent successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}.`
        );
      } else if (failedCount === 0 && skippedCount > 0) {
        setMessage(`Batch Outreach Complete: 0 sent, ${skippedCount} skipped.`);
      }

      setSelectedKeys(new Set());
      setShowConfirmModal(false);

      await loadData();
      await loadPreview();
    } catch (err) {
      if (err.name === 'TypeError' || (err.message && err.message.includes('fetch'))) {
        setError('Failed to fetch: Network or server unreachable.');
      } else {
        setError(err.message || 'Failed to execute batch outreach');
      }
    } finally {
      setStartingBatch(false);
    }
  };

  const handleCandidateChange = (selectedId) => {
    setCandidateId(selectedId);
    const cand = candidates.find((c) => String(c.id) === String(selectedId));
    if (cand && cand.email_draft_id) {
      setDraftId(String(cand.email_draft_id));
      if (cand.email_draft_subject) setSubject(cand.email_draft_subject);
      if (cand.email_draft_body) setBody(cand.email_draft_body);
    }
  };

  const handleDraftChange = (selectedDraftId) => {
    setDraftId(selectedDraftId);
    const selectedDraft = drafts.find((d) => String(d.id) === String(selectedDraftId));
    if (selectedDraft) {
      setSubject(selectedDraft.subject || '');
      setBody(selectedDraft.body || '');
    }
  };

  const handleSingleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!candidateId) {
      setError('Please select a candidate.');
      return;
    }
    if (!employerId) {
      setError('Please select an employer.');
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/outreach/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          candidate_id: Number(candidateId),
          employer_id: Number(employerId),
          subject: subject.trim(),
          body: body.trim(),
          draft_id: draftId ? Number(draftId) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to send outreach email.');

      setMessage(data.message || 'Outreach email sent successfully.');
      setSubject('');
      setBody('');
      setDraftId('');
      await loadData();
    } catch (err) {
      console.error('Outreach error:', err);
      setError(err.message || 'Failed to send outreach email.');
    } finally {
      setSending(false);
    }
  };

  // Details for Confirmation Modal
  const selectedItemsList = previewData
    ? previewData.items.filter((item) => selectedKeys.has(getItemKey(item)))
    : [];

  const uniqueCandidates = Array.from(
    new Set(selectedItemsList.map((i) => i.candidate_name))
  );

  const uniqueEmployers = Array.from(
    new Set(selectedItemsList.map((i) => i.employer_name))
  );

  return (
    <div className="content-container full-width-page">
      <h1 className="page-title">Automated Employer Outreach</h1>
      <p className="page-subtitle">
        Execute and monitor rule-based automated employer outreach campaigns.
      </p>

      {/* TOP DYNAMIC STATS BANNER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        width: '100%',
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Target size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Eligible Today</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                {previewData ? previewData.eligible_today : '—'}
              </div>
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>Eligible candidate-employer pairs</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Emails Sent Today</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
                {dashboardStats?.emailsSentToday ?? 0}
              </div>
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>Confirmed via Gmail API</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <XCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Skipped / Ineligible</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>
                {previewData ? previewData.skipped_count : '—'}
              </div>
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>Blocked by rule engine</p>
        </div>
      </div>

      {error && <div className="outreach-error" style={{ marginBottom: '20px' }}>{error}</div>}
      {message && <div className="outreach-success" style={{ marginBottom: '20px' }}>{message}</div>}

      {/* AUTOMATED OUTREACH CAMPAIGN CARD */}
      <div className="outreach-card" style={{ marginBottom: '28px' }}>
        <div className="outreach-card-header">
          <div>
            <h2 className="outreach-card-title">Outreach Queue & Preview</h2>
            <p className="outreach-card-subtitle">
              Inspect and manually select candidate-employer pairings for today's outreach campaign.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {selectedKeys.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="secondary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#dc2626', borderColor: '#fecaca' }}
              >
                <Trash2 size={15} /> Clear Selection ({selectedKeys.size})
              </button>
            )}

            <button
              type="button"
              onClick={loadPreview}
              disabled={loadingPreview}
              className="secondary-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} className={loadingPreview ? 'spin' : ''} />
              {loadingPreview ? 'Checking...' : 'Preview Outreach'}
            </button>

            {previewData && (
              <button
                type="button"
                onClick={handleOpenConfirmModal}
                disabled={startingBatch || selectedKeys.size === 0}
                className="primary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: selectedKeys.size > 0 ? '#16a34a' : '#cbd5e1' }}
              >
                <Play size={15} />
                {startingBatch ? 'Executing Batch...' : `Start Outreach (${selectedKeys.size})`}
              </button>
            )}
          </div>
        </div>

        {previewData ? (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #bfdbfe' }}>
                <CheckCircle2 size={14} /> Selected: {selectedKeys.size}
              </span>
              <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Target size={14} /> Eligible: {previewData.eligible_today}
              </span>
              <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={14} /> Skipped: {previewData.skipped_count}
              </span>
            </div>

            {previewData.candidate_summaries && previewData.candidate_summaries.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {previewData.candidate_summaries.map((s, idx) => {
                  const currentSelectedCount = getCandidateSelectedCount(s.candidate_id);
                  return (
                    <span key={idx} style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '12px', fontWeight: '500' }}>
                      👤 {s.candidate_name} — <strong>{currentSelectedCount}</strong> selected / {s.eligible_count} eligible
                    </span>
                  );
                })}
              </div>
            )}

            <div className="outreach-table-wrapper">
              <table className="outreach-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        ref={headerCheckboxRef}
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        disabled={!previewData || eligibleItems.length === 0}
                        title={isAllSelected ? 'Deselect All' : 'Select All Eligible (Max 5 per candidate)'}
                        style={{ cursor: eligibleItems.length > 0 ? 'pointer' : 'not-allowed' }}
                      />
                    </th>
                    <th style={{ width: '18%' }}>Candidate</th>
                    <th style={{ width: '20%' }}>Email Draft</th>
                    <th style={{ width: '10%' }}>CV</th>
                    <th style={{ width: '20%' }}>Target Employer</th>
                    <th style={{ width: '28%' }}>Status / Rule Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.items.map((item, idx) => {
                    const key = getItemKey(item);
                    const isSelected = selectedKeys.has(key);

                    return (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor: isSelected ? '#eff6ff' : undefined,
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!item.eligible}
                            onChange={() => handleToggleRow(item)}
                            title={!item.eligible ? item.reason : (isSelected ? 'Selected for outreach' : 'Click to select')}
                            style={{ cursor: item.eligible ? 'pointer' : 'not-allowed' }}
                          />
                        </td>
                        <td>
                          <strong style={{ color: '#0f172a', display: 'block', fontSize: '13.5px', lineHeight: '1.3' }}>
                            {item.candidate_name}
                          </strong>
                          {item.gmail_account ? (
                            <span style={{ fontSize: '12px', color: '#047857', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>
                              ✓ {item.gmail_account}
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#dc2626', display: 'block', marginTop: '2px' }}>
                              ✕ No Gmail
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {item.email_draft ? (
                            <span style={{ color: '#334155', fontWeight: '500', display: 'inline-block', wordBreak: 'break-word' }} title={item.email_draft}>
                              📄 {item.email_draft}
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', fontSize: '12px' }}>✕ No Draft</span>
                          )}
                        </td>
                        <td>
                          {item.cv_file_path ? (
                            <span className="visa-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                              ✓ Attached
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', fontSize: '12px' }}>✕ Missing</span>
                          )}
                        </td>
                        <td>
                          <strong style={{ color: '#0f172a', display: 'block', fontSize: '13.5px', lineHeight: '1.3' }}>
                            {item.employer_name}
                          </strong>
                          <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>
                            {item.employer_email}
                          </span>
                        </td>
                        <td>
                          {item.eligible ? (
                            <span className="status-badge active">
                              <span className="status-dot"></span> Ready
                            </span>
                          ) : (
                            <span className="status-badge inactive" style={{ whiteSpace: 'normal', lineHeight: '1.4', display: 'inline-flex', alignItems: 'flex-start', gap: '5px', textAlign: 'left' }}>
                              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>{item.reason}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            Click <strong>Preview Outreach</strong> to inspect ready candidate campaign queues against rule restrictions before sending.
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', color: '#0f172a', fontWeight: 700 }}>
              Confirm Outreach Campaign
            </h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>
              Send <strong>{selectedKeys.size}</strong> selected outreach email{selectedKeys.size !== 1 ? 's' : ''}?
            </p>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Candidates Involved ({uniqueCandidates.length}):</span>
                <strong style={{ color: '#1e293b' }}>{uniqueCandidates.join(', ')}</strong>
              </div>
              <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Unique Employers ({uniqueEmployers.length}):</span>
                <strong style={{ color: '#1e293b' }}>{uniqueEmployers.join(', ')}</strong>
              </div>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Total Emails to Send:</span>
                <strong style={{ color: '#16a34a', fontSize: '15px' }}>{selectedKeys.size} Emails</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowConfirmModal(false)}
                disabled={startingBatch}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ backgroundColor: '#16a34a' }}
                onClick={handleConfirmBatchOutreach}
                disabled={startingBatch}
              >
                {startingBatch ? 'Executing Batch...' : 'Confirm & Send Outreach'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE MANUAL OUTREACH FORM */}
      <div className="outreach-card">
        <div className="outreach-card-header">
          <div>
            <h2 className="outreach-card-title">Single Outreach Email</h2>
            <p className="outreach-card-subtitle">
              Send an individual outreach email to a specific employer.
            </p>
          </div>
          <Send size={20} />
        </div>

        <form className="outreach-form" onSubmit={handleSingleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="candidate">Candidate</label>
              <select
                id="candidate"
                value={candidateId}
                onChange={(e) => handleCandidateChange(e.target.value)}
              >
                <option value="">Select candidate</option>
                {candidates.filter((c) => c.is_active !== false).map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name} — {candidate.email}
                    {candidate.email_draft_name ? ` (Draft: ${candidate.email_draft_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="employer">Employer</label>
              <select
                id="employer"
                value={employerId}
                onChange={(e) => setEmployerId(e.target.value)}
              >
                <option value="">Select employer</option>
                {employers.map((employer) => (
                  <option key={employer.id} value={employer.id}>
                    {employer.service_name || employer.company_name || 'Employer'} — {employer.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="draft">Email Draft Template</label>
            <select
              id="draft"
              value={draftId}
              onChange={(e) => handleDraftChange(e.target.value)}
            >
              <option value="">Select draft (or use candidate default)</option>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.attachment_filename || d.subject || `Draft #${d.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
            />
          </div>

          <div className="form-group">
            <label htmlFor="body">Email Body</label>
            <textarea
              id="body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your outreach email..."
            />
          </div>

          <div className="outreach-actions">
            <button type="submit" className="send-outreach-button" disabled={sending}>
              <Send size={16} />
              {sending ? 'Sending...' : 'Send Outreach'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}