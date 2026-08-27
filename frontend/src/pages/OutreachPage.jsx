import React, { useEffect, useState, useRef } from 'react';
import { Send, Target, Mail, Play, RefreshCw, CheckCircle2, XCircle, AlertCircle, Trash2, ChevronLeft, ChevronRight, User, Sliders } from 'lucide-react';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || !host.includes('run.app')) {
      return `${window.location.protocol}//${host}:8000`;
    }
  }
  return 'https://visaliv-crm-backend-477131280275.asia-south2.run.app';
};

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  const detail = error?.response?.data?.detail ?? error?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    try {
      return detail.map((item) => (typeof item === "string" ? item : item.msg || item.message || JSON.stringify(item))).join(", ");
    } catch {
      return fallback;
    }
  }
  if (detail && typeof detail === "object") {
    return detail.message || JSON.stringify(detail);
  }
  return error?.message || fallback;
};

export default function OutreachPage() {
  const [candidates, setCandidates] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [startingBatch, setStartingBatch] = useState(false);

  // Outreach Settings State
  const [settings, setSettings] = useState({
    max_emails_per_candidate_per_day: 5,
    min_gap_minutes: 60,
    enabled: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  
  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedCandidateFilter, setSelectedCandidateFilter] = useState(null);

  // Selected items stored as a Map (key -> item) across pages
  const [selectedItemsMap, setSelectedItemsMap] = useState(new Map());
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

  const loadSettings = async () => {
    try {
      setSettingsError('');
      const res = await fetch(`${getApiUrl()}/outreach/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSettingsError('');
      } else {
        const data = await res.json().catch(() => ({}));
        setSettingsError(getErrorMessage(data, 'Failed to load outreach settings from backend'));
      }
    } catch (err) {
      console.error('Failed to load outreach settings:', err);
      setSettingsError(err.message || 'Failed to connect to backend server');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess('');
    setSettingsError('');

    try {
      const res = await fetch(`${getApiUrl()}/outreach/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_emails_per_candidate_per_day: Number(settings.max_emails_per_candidate_per_day),
          min_gap_minutes: Number(settings.min_gap_minutes),
          enabled: Boolean(settings.enabled),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(getErrorMessage(data, 'Failed to update outreach settings'));

      setSettings(data);
      setSettingsSuccess('Outreach sending settings saved successfully!');
      setTimeout(() => setSettingsSuccess(''), 4000);

      if (previewData) {
        loadPreview(page, selectedCandidateFilter);
      }
    } catch (err) {
      setSettingsError(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [candRes, empRes, draftRes, dashRes] = await Promise.all([
        fetch(`${getApiUrl()}/candidates`),
        fetch(`${getApiUrl()}/employers`),
        fetch(`${getApiUrl()}/email-drafts`),
        fetch(`${getApiUrl()}/dashboard`),
        loadSettings(),
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

  const loadPreview = async (targetPage = page, targetCandId = selectedCandidateFilter) => {
    try {
      setLoadingPreview(true);
      setError('');
      let url = `${getApiUrl()}/outreach/preview?page=${targetPage}&page_size=${pageSize}`;
      if (targetCandId) {
        url += `&candidate_id=${targetCandId}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch outreach preview');
      const data = await res.json();
      setPreviewData(data);
      setPage(targetPage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil((previewData?.total || 0) / pageSize) || 1;
    if (newPage >= 1 && newPage <= totalPages) {
      loadPreview(newPage, selectedCandidateFilter);
    }
  };

  const handleCandidateFilter = (candId) => {
    const nextFilter = selectedCandidateFilter === candId ? null : candId;
    setSelectedCandidateFilter(nextFilter);
    setPage(1);
    loadPreview(1, nextFilter);
  };

  // Helper: Count selected items for a candidate in local selection map
  const getCandidateSelectedCount = (candId) => {
    let count = 0;
    for (const item of selectedItemsMap.values()) {
      if (item.candidate_id === candId) count++;
    }
    return count;
  };

  // Toggle individual row selection
  const handleToggleRow = (item) => {
    if (!item.eligible) return;

    const key = getItemKey(item);
    const nextMap = new Map(selectedItemsMap);

    if (nextMap.has(key)) {
      nextMap.delete(key);
      setError('');
    } else {
      const currentCandCount = getCandidateSelectedCount(item.candidate_id);
      if (currentCandCount >= 5) {
        setError(`Daily limit reached — maximum 5 employers per candidate/day. (${item.candidate_name} already has 5 selected)`);
        return;
      }
      setError('');
      nextMap.set(key, item);
    }
    setSelectedItemsMap(nextMap);
  };

  // Select all eligible items on current page
  const pageEligibleItems = previewData ? previewData.items.filter((i) => i.eligible) : [];

  const isAllPageSelected =
    pageEligibleItems.length > 0 &&
    pageEligibleItems.every((item) => selectedItemsMap.has(getItemKey(item)));

  const isSomePageSelected =
    pageEligibleItems.some((item) => selectedItemsMap.has(getItemKey(item))) &&
    !isAllPageSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomePageSelected;
    }
  }, [isSomePageSelected]);

  const handleToggleSelectAllPage = () => {
    setError('');
    const nextMap = new Map(selectedItemsMap);
    if (isAllPageSelected) {
      pageEligibleItems.forEach((item) => nextMap.delete(getItemKey(item)));
    } else {
      const candCounts = {};
      for (const item of nextMap.values()) {
        candCounts[item.candidate_id] = (candCounts[item.candidate_id] || 0) + 1;
      }
      pageEligibleItems.forEach((item) => {
        const key = getItemKey(item);
        const count = candCounts[item.candidate_id] || 0;
        if (count < 5 && !nextMap.has(key)) {
          nextMap.set(key, item);
          candCounts[item.candidate_id] = count + 1;
        }
      });
    }
    setSelectedItemsMap(nextMap);
  };

  const handleClearSelection = () => {
    setSelectedItemsMap(new Map());
    setError('');
  };

  const handleOpenConfirmModal = () => {
    if (selectedItemsMap.size === 0) {
      setError('Please select at least one eligible outreach email to send.');
      return;
    }
    setError('');
    setShowConfirmModal(true);
  };

  const handleConfirmBatchOutreach = async () => {
    const selectedItems = Array.from(selectedItemsMap.values());

    if (selectedItems.length === 0) {
      setError('No eligible candidate-employer pairings selected.');
      setShowConfirmModal(false);
      return;
    }

    try {
      setStartingBatch(true);
      setError('');
      setMessage('');

      const res = await fetch(`${getApiUrl()}/outreach/batch-send`, {
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

      setSelectedItemsMap(new Map());
      setShowConfirmModal(false);

      await loadData();
      await loadPreview(page, selectedCandidateFilter);
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
      const response = await fetch(`${getApiUrl()}/outreach/send`, {
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
  const selectedItemsList = Array.from(selectedItemsMap.values());
  const uniqueCandidates = Array.from(new Set(selectedItemsList.map((i) => i.candidate_name)));
  const uniqueEmployers = Array.from(new Set(selectedItemsList.map((i) => i.employer_name)));

  // Pagination metadata
  const totalCount = previewData?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIdx = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(page * pageSize, totalCount);

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
                {previewData ? (previewData.total_eligible ?? previewData.eligible_today).toLocaleString() : '—'}
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
                {dashboardStats?.emailsSentToday ?? previewData?.emails_sent_today ?? 0}
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
                {previewData ? (previewData.total_skipped ?? previewData.skipped_count).toLocaleString() : '—'}
              </div>
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>Blocked by rule engine</p>
        </div>
      </div>

      {error && <div className="outreach-error" style={{ marginBottom: '20px' }}>{error}</div>}
      {message && <div className="outreach-success" style={{ marginBottom: '20px' }}>{message}</div>}

      {/* OUTREACH SENDING SETTINGS CARD */}
      <div className="outreach-card" style={{ marginBottom: '28px' }}>
        <div className="outreach-card-header">
          <div>
            <h2 className="outreach-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={20} style={{ color: '#4f46e5' }} /> Outreach Sending Settings
            </h2>
            <p className="outreach-card-subtitle">
              Configure per-candidate daily email sending limits, minimum gap intervals, and automated outreach status.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: settings.enabled ? '#ecfdf5' : '#fef2f2',
              color: settings.enabled ? '#047857' : '#b91c1c',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: `1px solid ${settings.enabled ? '#a7f3d0' : '#fecaca'}`,
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: settings.enabled ? '#10b981' : '#ef4444' }} />
              {settings.enabled ? 'Automation Enabled' : 'Automation Disabled'}
            </span>
          </div>
        </div>

        {settingsError && <div className="outreach-error" style={{ marginBottom: '16px' }}>{settingsError}</div>}
        {settingsSuccess && <div className="outreach-success" style={{ marginBottom: '16px' }}>{settingsSuccess}</div>}

        <form onSubmit={handleSaveSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Emails per Candidate / Day
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.max_emails_per_candidate_per_day}
                onChange={(e) => setSettings({ ...settings, max_emails_per_candidate_per_day: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Default: 5 (Min 1, Max 20)
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Minimum Gap Between Emails
              </label>
              <select
                value={settings.min_gap_minutes}
                onChange={(e) => setSettings({ ...settings, min_gap_minutes: Number(e.target.value) })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour (60 mins)</option>
                <option value={120}>2 Hours (120 mins)</option>
                <option value={240}>4 Hours (240 mins)</option>
                <option value={360}>6 Hours (360 mins)</option>
              </select>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Spacing between emails for the same candidate
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                Automated Outreach Status
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500, color: settings.enabled ? '#0f172a' : '#64748b' }}>
                  {settings.enabled ? 'Enabled (Outreach active)' : 'Disabled (Sending paused)'}
                </span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#475569', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                ⚡ {settings.max_emails_per_candidate_per_day} emails/day limit per candidate
              </span>
              <span style={{ fontSize: '12.5px', color: '#475569', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                ⏱️ {settings.min_gap_minutes}m ({settings.min_gap_minutes >= 60 ? `${settings.min_gap_minutes / 60}h` : `${settings.min_gap_minutes}m`}) gap interval
              </span>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="primary-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px' }}
            >
              <Sliders size={15} />
              {savingSettings ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

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
            {selectedItemsMap.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="secondary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#dc2626', borderColor: '#fecaca' }}
              >
                <Trash2 size={15} /> Clear Selection ({selectedItemsMap.size})
              </button>
            )}

            <button
              type="button"
              onClick={() => loadPreview(page, selectedCandidateFilter)}
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
                disabled={startingBatch || selectedItemsMap.size === 0}
                className="primary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: selectedItemsMap.size > 0 ? '#16a34a' : '#cbd5e1' }}
              >
                <Play size={15} />
                {startingBatch ? 'Executing Batch...' : `Start Outreach (${selectedItemsMap.size})`}
              </button>
            )}
          </div>
        </div>

        {previewData ? (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #bfdbfe' }}>
                <CheckCircle2 size={14} /> Selected: {selectedItemsMap.size}
              </span>
              <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Target size={14} /> Eligible: {(previewData.total_eligible ?? previewData.eligible_today).toLocaleString()}
              </span>
              <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={14} /> Skipped: {(previewData.total_skipped ?? previewData.skipped_count).toLocaleString()}
              </span>
            </div>

            {/* CANDIDATE SUMMARY CHIPS */}
            {previewData.candidate_summaries && previewData.candidate_summaries.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>Filter Candidate:</span>
                <button
                  type="button"
                  onClick={() => handleCandidateFilter(null)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: selectedCandidateFilter === null ? '#4f46e5' : '#ffffff',
                    color: selectedCandidateFilter === null ? '#ffffff' : '#334155',
                    border: '1px solid',
                    borderColor: selectedCandidateFilter === null ? '#4f46e5' : '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  All Candidates
                </button>
                {previewData.candidate_summaries.map((s, idx) => {
                  const currentSelectedCount = getCandidateSelectedCount(s.candidate_id);
                  const isSelectedFilter = selectedCandidateFilter === s.candidate_id;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCandidateFilter(s.candidate_id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: isSelectedFilter ? '#4f46e5' : '#ffffff',
                        color: isSelectedFilter ? '#ffffff' : '#334155',
                        border: '1px solid',
                        borderColor: isSelectedFilter ? '#4f46e5' : '#cbd5e1',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <User size={13} /> {s.candidate_name} — <strong>{s.sent_today_count ?? 0}/{s.daily_limit ?? settings.max_emails_per_candidate_per_day} sent today</strong> | <strong>{currentSelectedCount}</strong> selected / {s.eligible_count} eligible
                    </button>
                  );
                })}
              </div>
            )}

            {/* TOP PAGINATION CONTROLS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                Showing <strong>{startIdx.toLocaleString()}–{endIdx.toLocaleString()}</strong> of <strong>{totalCount.toLocaleString()}</strong> records
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loadingPreview}
                  className="secondary-button"
                  style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span style={{ fontSize: '13px', color: '#64748b', padding: '0 4px' }}>
                  Page <strong>{page}</strong> of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || loadingPreview}
                  className="secondary-button"
                  style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="outreach-table-wrapper">
              <table className="outreach-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        ref={headerCheckboxRef}
                        checked={isAllPageSelected}
                        onChange={handleToggleSelectAllPage}
                        disabled={!previewData || pageEligibleItems.length === 0}
                        title={isAllPageSelected ? 'Deselect Page' : 'Select Eligible on this Page'}
                        style={{ cursor: pageEligibleItems.length > 0 ? 'pointer' : 'not-allowed' }}
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
                    const isSelected = selectedItemsMap.has(key);

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

            {/* BOTTOM PAGINATION CONTROLS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                Showing <strong>{startIdx.toLocaleString()}–{endIdx.toLocaleString()}</strong> of <strong>{totalCount.toLocaleString()}</strong> records
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loadingPreview}
                  className="secondary-button"
                  style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span style={{ fontSize: '13px', color: '#64748b', padding: '0 4px' }}>
                  Page <strong>{page}</strong> of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || loadingPreview}
                  className="secondary-button"
                  style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
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
              Send <strong>{selectedItemsMap.size}</strong> selected outreach email{selectedItemsMap.size !== 1 ? 's' : ''}?
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
                <strong style={{ color: '#16a34a', fontSize: '15px' }}>{selectedItemsMap.size} Emails</strong>
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