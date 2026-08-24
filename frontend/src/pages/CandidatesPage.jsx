import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  X,
  Mail,
  Check,
  UserPlus,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || !host.includes('run.app')) {
      return `${window.location.protocol}//${host}:8000`;
    }
  }
  return 'https://visaliv-crm-backend-477131280275.asia-south2.run.app';
};

const rawApiUrl = getApiUrl();
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  country: '',
  visa_type: '',
  cv_file_path: '',
  email_draft_id: '',
  is_active: true,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx'];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [availableDrafts, setAvailableDrafts] = useState([]);
  const [assigningDraftCandidate, setAssigningDraftCandidate] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [previewingDraftCandidate, setPreviewingDraftCandidate] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingCandidateModal, setDeletingCandidateModal] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Import Excel Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // ================= FETCH =================

  const fetchDrafts = async () => {
    try {
      const response = await fetch(`${API_URL}/email-drafts`);
      if (response.ok) {
        const data = await response.json();
        setAvailableDrafts(data);
      }
    } catch {
      // ignore draft fetch error
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/candidates`);

      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }

      const data = await response.json();
      setCandidates(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchDrafts();

    const handleFocus = () => {
      fetchCandidates();
      fetchDrafts();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // --- Excel Import Modal Flow ---

  const openImportModal = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setError('');
    setSuccess('');
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    if (importing) return;
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setError('');
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Only Excel files (.xlsx) are supported.');
      return;
    }

    setImportFile(file);
    setImportPreview(null);
    setImportResult(null);

    try {
      setPreviewLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/candidates/preview-import`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        let msg = data.detail || 'Failed to parse Excel file';
        if (res.status === 405 || msg === 'Method Not Allowed') {
          msg = 'Candidate import endpoint returned Method Not Allowed (405). Please ensure the backend server is running the updated candidates import code.';
        }
        throw new Error(msg);
      }

      setError('');
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
      setSuccess('');
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch(`${API_URL}/candidates/import`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        let msg = data.detail || 'Failed to import candidates';
        if (res.status === 405 || msg === 'Method Not Allowed') {
          msg = 'Candidate import endpoint returned Method Not Allowed (405). Please ensure the backend server is running the updated candidates import code.';
        }
        throw new Error(msg);
      }

      setError('');
      setImportResult(data);
      setSuccess(`Import completed! ${data.imported_count} candidates imported, ${data.skipped_duplicates_count} duplicates skipped.`);
      await fetchCandidates();
    } catch (err) {
      setError(err.message || 'Error executing import');
    } finally {
      setImporting(false);
    }
  };

  // ================= FORM =================

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openAddForm = () => {
    setError('');
    setSuccess('');
    setEditingCandidate(null);
    setForm({ ...emptyForm });
    setSelectedFile(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving || uploading) return;

    setShowForm(false);
    setEditingCandidate(null);
    setForm({ ...emptyForm });
    setSelectedFile(null);
    setError('');
  };

  // ================= VALIDATION =================

  const validateForm = () => {
    if (!form.full_name.trim()) {
      return 'Full name is required';
    }

    const email = form.email.trim();

    if (!email) {
      return 'Email is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    const phone = form.phone ? form.phone.trim() : '';

    if (phone) {
      const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

      if (!phoneRegex.test(phone)) {
        return 'Please enter a valid phone number';
      }
    }

    // New candidate must have CV.
    // Existing candidate can keep the existing CV.
    if (!editingCandidate && !selectedFile && !form.cv_file_path) {
      return 'Please upload a CV';
    }

    return '';
  };

  // ================= FILE =================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setError('');
    setSuccess('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = `.${file.name.split('.').pop().toLowerCase()}`;

    if (!ALLOWED_FILE_TYPES.includes(extension)) {
      event.target.value = '';
      setSelectedFile(null);

      setError(
        'Invalid CV format. Only PDF, DOC, and DOCX files are allowed.'
      );

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      event.target.value = '';
      setSelectedFile(null);

      setError('CV file must be 10 MB or smaller.');

      return;
    }

    setSelectedFile(file);
  };

  const uploadCV = async () => {
    if (!selectedFile) {
      return form.cv_file_path;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `${API_URL}/candidates/upload-cv`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Failed to upload CV'
        );
      }

      return data.file_path;
    } finally {
      setUploading(false);
    }
  };

  // ================= ADD / EDIT =================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      // Upload selected CV first.
      let cvFilePath = form.cv_file_path;

      if (selectedFile) {
        cvFilePath = await uploadCV();
      }

      if (!cvFilePath) {
        throw new Error('Please upload a CV');
      }

      const isEditing = Boolean(editingCandidate);

      const url = isEditing
        ? `${API_URL}/candidates/${editingCandidate.id}`
        : `${API_URL}/candidates`;

      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone ? form.phone.trim() || null : null,
        country: form.country ? form.country.trim() || null : null,
        visa_type: form.visa_type ? form.visa_type.trim() || null : null,
        cv_file_path: cvFilePath,
        email_draft_id: form.email_draft_id ? parseInt(form.email_draft_id, 10) : null,
        is_active: isEditing ? form.is_active : true,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          (isEditing
            ? 'Failed to update candidate'
            : 'Failed to create candidate')
        );
      }

      // Close form first.
      setShowForm(false);
      setEditingCandidate(null);
      setForm({ ...emptyForm });
      setSelectedFile(null);

      // Fresh database data.
      await fetchCandidates();

      setSuccess(
        isEditing
          ? 'Candidate updated successfully.'
          : 'Candidate added successfully.'
      );
    } catch (err) {
      setError(
        err.message ||
        (editingCandidate
          ? 'Failed to update candidate'
          : 'Failed to create candidate')
      );
    } finally {
      setSaving(false);
    }
  };

  // ================= EDIT =================

  const handleEdit = (candidate) => {
    setError('');
    setSuccess('');

    setEditingCandidate(candidate);

    setForm({
      full_name: candidate.full_name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      country: candidate.country || '',
      visa_type: candidate.visa_type || '',
      cv_file_path: candidate.cv_file_path || '',
      email_draft_id: candidate.email_draft_id || candidate.email_draft?.id || '',
      is_active: candidate.is_active ?? true,
    });

    setSelectedFile(null);
    setShowForm(true);
  };

  // ================= DELETE =================

  const handleDelete = (candidate) => {
    setError('');
    setSuccess('');
    setDeletingCandidateModal(candidate);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCandidateModal) return;
    const candidate = deletingCandidateModal;

    try {
      setDeletingId(candidate.id);
      setError('');
      setSuccess('');

      const response = await fetch(
        `${API_URL}/candidates/${candidate.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        let message = 'Failed to delete candidate';

        try {
          const data = await response.json();

          if (data.detail) {
            message = data.detail;
          }
        } catch {
          // Ignore JSON parsing error.
        }

        throw new Error(message);
      }

      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      setSuccess('Candidate deleted successfully.');
      setDeletingCandidateModal(null);
      await fetchCandidates();
      await fetchDrafts();
    } catch (err) {
      setError(
        err.message || 'Failed to delete candidate'
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ================= GMAIL =================

  const connectGmail = (candidateId) => {
    const oauthUrl =
      `${API_URL}/gmail-oauth/connect/${candidateId}`;

    window.open(
      oauthUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // ================= ASSIGN DRAFT =================

  const getDraftName = (candidate) => {
    if (!candidate) return null;
    const isVal = (v) => v && typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'none';

    if (isVal(candidate.email_draft?.draft_name)) return candidate.email_draft.draft_name;
    if (isVal(candidate.email_draft?.name)) return candidate.email_draft.name;
    if (isVal(candidate.email_draft_name)) return candidate.email_draft_name;
    if (isVal(candidate.email_draft?.attachment_filename)) return candidate.email_draft.attachment_filename;
    if (isVal(candidate.email_draft?.subject)) return candidate.email_draft.subject;

    const draftId = candidate.email_draft_id || candidate.email_draft?.id;
    if (draftId) {
      const match = availableDrafts.find((d) => String(d.id) === String(draftId));
      if (match) {
        if (isVal(match.name)) return match.name;
        if (isVal(match.attachment_filename)) return match.attachment_filename;
        if (isVal(match.subject)) return match.subject;
      }
      return `Draft #${draftId}`;
    }
    return null;
  };

  const openAssignDraftModal = (candidate) => {
    setAssigningDraftCandidate(candidate);
    const draftId = candidate.email_draft_id || candidate.email_draft?.id;
    setSelectedDraftId(draftId ? String(draftId) : '');
    setError('');
    setSuccess('');
  };

  const handleAssignDraftSubmit = async (e) => {
    e.preventDefault();
    if (!assigningDraftCandidate) return;

    try {
      setAssigning(true);
      setError('');
      setSuccess('');

      const draftId = selectedDraftId ? parseInt(selectedDraftId, 10) : null;

      const response = await fetch(
        `${API_URL}/candidates/${assigningDraftCandidate.id}/email-draft`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_draft_id: draftId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let msg = 'Failed to assign email draft';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        }
        throw new Error(msg);
      }

      setCandidates((prev) =>
        prev.map((c) => (c.id === data.id ? data : c))
      );

      setSuccess('Email draft assigned successfully.');
      setAssigningDraftCandidate(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveDraftSubmit = async () => {
    if (!assigningDraftCandidate) return;

    try {
      setAssigning(true);
      setError('');
      setSuccess('');

      const response = await fetch(
        `${API_URL}/candidates/${assigningDraftCandidate.id}/email-draft`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let msg = 'Failed to remove email draft';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        }
        throw new Error(msg);
      }

      setCandidates((prev) =>
        prev.map((c) => (c.id === data.id ? data : c))
      );

      setSuccess('Email draft removed successfully.');
      setAssigningDraftCandidate(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // ================= CV VIEW =================

  const openCV = (cvFilePath) => {
    if (!cvFilePath) {
      return;
    }

    const cvUrl = cvFilePath.startsWith('http')
      ? cvFilePath
      : `${API_URL}/${cvFilePath.replace(/^\/+/, '')}`;

    window.open(
      cvUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="content-container candidates-page">

      {/* ================= HEADER ================= */}

      <div className="candidates-header">

        <div className="page-heading-row">

          <div className="page-heading-icon">
            <Users size={22} />
          </div>

          <div>
            <h1 className="page-title">
              Candidates
            </h1>

            <p className="page-subtitle">
              Manage student candidates seeking visa
              sponsorship outreach.
            </p>
          </div>

        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={openImportModal}
            style={{
              padding: '11px 18px',
              border: '1px solid #2563eb',
              borderRadius: '8px',
              background: '#fff',
              color: '#2563eb',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <FileSpreadsheet size={18} />
            Import Excel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={openAddForm}
          >
            <Plus size={18} />
            Add Candidate
          </button>
        </div>

      </div>

      {/* ================= MESSAGES ================= */}

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success-alert">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* ================= ADD / EDIT FORM ================= */}

      {showForm && (
        <div className="candidate-form-card">

          <div className="form-card-header">

            <div className="form-card-title">

              <div className="form-icon">
                {editingCandidate ? (
                  <Pencil size={20} />
                ) : (
                  <UserPlus size={20} />
                )}
              </div>

              <div>
                <h2>
                  {editingCandidate
                    ? 'Edit Candidate'
                    : 'Add Candidate'}
                </h2>

                <p>
                  {editingCandidate
                    ? 'Update candidate profile information.'
                    : 'Create a new student candidate profile.'}
                </p>
              </div>

            </div>

            <button
              type="button"
              className="close-button"
              onClick={closeForm}
              disabled={saving || uploading}
            >
              <X size={20} />
            </button>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="candidate-form-grid">

              {/* FULL NAME */}

              <div className="form-field">
                <label>
                  Full Name <span className="required">*</span>
                </label>

                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Student full name"
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="form-field">
                <label>
                  Email <span className="required">*</span>
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="student@gmail.com"
                  required
                />
              </div>

              {/* PHONE */}

              <div className="form-field">
                <label>
                  Phone
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                />
              </div>

              {/* COUNTRY */}

              <div className="form-field">
                <label>
                  Country
                </label>

                <input
                  type="text"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  placeholder="India"
                />
              </div>

              {/* VISA */}

              <div className="form-field">
                <label>
                  Visa Type
                </label>

                <input
                  type="text"
                  name="visa_type"
                  value={form.visa_type}
                  onChange={handleChange}
                  placeholder="H1B / Work Visa"
                />
              </div>

              {/* EMAIL DRAFT */}

              <div className="form-field">
                <label>
                  Assigned Email Draft
                </label>

                <select
                  name="email_draft_id"
                  value={form.email_draft_id || ''}
                  onChange={handleChange}
                >
                  <option value="">No Draft</option>
                  {availableDrafts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.attachment_filename || d.subject || `Draft #${d.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* CV UPLOAD */}

              <div className="form-field">
                <label>
                  CV <span className="required">*</span>
                </label>

                <div className="cv-upload-box">

                  <label
                    htmlFor="candidate-cv"
                    className="upload-cv-button"
                  >
                    <Upload size={17} />
                    {selectedFile
                      ? 'Change CV'
                      : 'Upload CV'}
                  </label>

                  <input
                    id="candidate-cv"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    hidden
                  />

                  {selectedFile && (
                    <div className="selected-cv">
                      <FileText size={16} />

                      <span>
                        {selectedFile.name}
                      </span>
                    </div>
                  )}

                  {!selectedFile &&
                    form.cv_file_path && (
                      <div className="existing-cv">

                        <FileText size={16} />

                        <span>
                          Existing CV
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            openCV(form.cv_file_path)
                          }
                        >
                          View
                          <ExternalLink size={13} />
                        </button>

                      </div>
                    )}

                  <small>
                    PDF, DOC or DOCX • Maximum 10 MB
                  </small>

                </div>
              </div>

              {/* ACTIVE (Edit mode only) */}

              {editingCandidate && (
                <div className="form-field active-field">

                  <label>
                    Status
                  </label>

                  <label className="active-switch-row">

                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                    />

                    <span className="active-switch"></span>

                    <span className="active-switch-text">
                      {form.is_active
                        ? 'Active'
                        : 'Inactive'}
                    </span>

                  </label>

                </div>
              )}

            </div>

            {/* FORM ACTIONS */}

            <div className="form-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
                disabled={saving || uploading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving || uploading}
              >

                {saving || uploading ? (
                  <>
                    <span className="button-spinner"></span>
                    {uploading
                      ? 'Uploading CV...'
                      : 'Saving...'}
                  </>
                ) : editingCandidate ? (
                  <>
                    <Pencil size={17} />
                    Update Candidate
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    Save Candidate
                  </>
                )}

              </button>

            </div>

          </form>

        </div>
      )}

      {/* ================= TABLE ================= */}

      <div className="candidates-card">

        <div className="table-header">

          <div>
            <h2>All Candidates</h2>

            <p>
              {candidates.length} candidate
              {candidates.length !== 1 ? 's' : ''}
              {' '}registered
            </p>
          </div>

        </div>

        {loading ? (

          <div className="table-state">

            <div className="loading-spinner"></div>

            <span>
              Loading candidates...
            </span>

          </div>

        ) : candidates.length === 0 ? (

          <div className="table-state empty-state">

            <Users size={42} />

            <h3>
              No candidates yet
            </h3>

            <p>
              Add your first student candidate to get
              started.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={openAddForm}
            >
              <Plus size={18} />
              Add Candidate
            </button>

          </div>

        ) : (

          <div className="table-wrapper">

            <table className="crm-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Visa Type</th>
                  <th>Status</th>
                  <th>Gmail Account</th>
                  <th>Email Draft</th>
                  <th>CV</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {candidates.map((candidate, index) => (

                  <tr key={candidate.id}>

                    <td>
                      <span className="candidate-id">
                        #{index + 1}
                      </span>
                    </td>

                    <td>

                      <div className="candidate-name-cell">

                        <div className="candidate-avatar">
                          {candidate.full_name
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>

                        <div>

                          <strong>
                            {candidate.full_name}
                          </strong>

                          <span>
                            {candidate.phone || '-'}
                          </span>

                        </div>

                      </div>

                    </td>

                    <td>
                      <span className="email-text">
                        {candidate.email}
                      </span>
                    </td>

                    <td>
                      {candidate.country || '-'}
                    </td>

                    <td>
                      <span className="visa-badge">
                        {candidate.visa_type || '-'}
                      </span>
                    </td>

                    <td>

                      <span
                        className={
                          candidate.is_active
                            ? 'status-badge active'
                            : 'status-badge inactive'
                        }
                      >

                        <span className="status-dot"></span>

                        {candidate.is_active
                          ? 'Active'
                          : 'Inactive'}

                      </span>

                    </td>

                    <td>

                      {candidate.gmail_email ? (

                        <span className="status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Check size={13} strokeWidth={2.5} />
                          <span>Connected</span>
                        </span>

                      ) : (

                        <button
                          type="button"
                          className="connect-gmail-button"
                          onClick={() =>
                            connectGmail(candidate.id)
                          }
                        >
                          <Mail size={16} />
                          Connect Gmail
                        </button>

                      )}

                    </td>

                    <td>

                      {getDraftName(candidate) ? (

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: '500',
                              color: '#1e293b',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '160px',
                            }}
                            title={getDraftName(candidate)}
                          >
                            📄 {getDraftName(candidate)}
                          </span>
                          <button
                            type="button"
                            className="cv-button"
                            style={{
                              backgroundColor: '#eff6ff',
                              borderColor: '#bfdbfe',
                              color: '#1d4ed8',
                              padding: '4px 8px',
                              fontSize: '12px',
                              fontWeight: '600',
                              lineHeight: '1',
                            }}
                            onClick={() => setPreviewingDraftCandidate(candidate)}
                            title="View Assigned Draft"
                          >
                            View
                          </button>
                        </div>

                      ) : (

                        <span className="no-cv">No Draft</span>

                      )}

                    </td>

                    <td>

                      {candidate.cv_file_path ? (

                        <button
                          type="button"
                          className="cv-button"
                          onClick={() =>
                            openCV(
                              candidate.cv_file_path
                            )
                          }
                        >
                          <FileText size={15} />
                          View CV
                          <ExternalLink size={13} />
                        </button>

                      ) : (

                        <span className="no-cv">
                          No CV
                        </span>

                      )}

                    </td>

                    <td>

                      <div className="candidate-actions">

                        <button
                          type="button"
                          className="icon-action-button edit"
                          onClick={() =>
                            openAssignDraftModal(candidate)
                          }
                          title={getDraftName(candidate) || candidate.email_draft_id || candidate.email_draft ? "Change Email Draft" : "Assign Email Draft"}
                          style={{ color: '#2563eb' }}
                        >
                          <FileText size={16} />
                        </button>

                        <button
                          type="button"
                          className="icon-action-button edit"
                          onClick={() =>
                            handleEdit(candidate)
                          }
                          title="Edit candidate"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="icon-action-button delete"
                          onClick={() =>
                            handleDelete(candidate)
                          }
                          disabled={
                            deletingId === candidate.id
                          }
                          title="Delete candidate"
                        >
                          <Trash2 size={16} />
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

      {/* ASSIGN EMAIL DRAFT MODAL */}
      {assigningDraftCandidate && (
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
          zIndex: 999,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {(assigningDraftCandidate.email_draft_id || assigningDraftCandidate.email_draft) ? 'Change Email Draft' : 'Assign Email Draft'}
              </h3>
              <button
                onClick={() => setAssigningDraftCandidate(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignDraftSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Candidate:</span>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{assigningDraftCandidate.full_name}</span>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: 0 }}>
                    Email Draft
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningDraftCandidate(null);
                      window.location.href = '/email-drafts';
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    + Create New Draft
                  </button>
                </div>
                <select
                  value={selectedDraftId}
                  onChange={(e) => setSelectedDraftId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">No Draft</option>
                  {availableDrafts.map((d) => {
                    const isVal = (v) => v && typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'none';
                    const label = isVal(d.draft_name) ? d.draft_name : isVal(d.name) ? d.name : isVal(d.attachment_filename) ? `📄 ${d.attachment_filename}` : isVal(d.subject) ? d.subject : `Draft #${d.id}`;
                    return (
                      <option key={d.id} value={d.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {(assigningDraftCandidate.email_draft_id || assigningDraftCandidate.email_draft) && (
                    <button
                      type="button"
                      onClick={handleRemoveDraftSubmit}
                      disabled={assigning}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: assigning ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Remove Draft
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAssigningDraftCandidate(null)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: assigning ? 'not-allowed' : 'pointer',
                      opacity: assigning ? 0.7 : 1,
                    }}
                  >
                    {assigning ? 'Saving...' : 'Assign Draft'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAFT PREVIEW MODAL */}
      {previewingDraftCandidate && (
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
          zIndex: 999,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assigned Email Draft
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '2px 0 0 0' }}>
                  {previewingDraftCandidate.email_draft_name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewingDraftCandidate(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Candidate Name:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{previewingDraftCandidate.full_name}</span>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Candidate Email:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{previewingDraftCandidate.email}</span>
                </div>
              </div>

              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                  Draft Subject:
                </span>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>
                  {previewingDraftCandidate.email_draft_subject || 'No Subject'}
                </span>
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                whiteSpace: 'pre-wrap',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#334155',
                maxHeight: '300px',
                overflowY: 'auto',
              }}>
                {previewingDraftCandidate.email_draft_body || 'No Body Content'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={() => setPreviewingDraftCandidate(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingCandidateModal && (
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
          zIndex: 999,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', margin: 0 }}>
                Delete Candidate?
              </h3>
              <button
                onClick={() => setDeletingCandidateModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                Are you sure you want to permanently delete <strong style={{ color: '#0f172a' }}>"{deletingCandidateModal.full_name}"</strong>?
              </p>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
                This action cannot be undone.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setDeletingCandidateModal(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingId === deletingCandidateModal.id}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: deletingId === deletingCandidateModal.id ? 'not-allowed' : 'pointer',
                    opacity: deletingId === deletingCandidateModal.id ? 0.7 : 1,
                  }}
                >
                  {deletingId === deletingCandidateModal.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= IMPORT EXCEL MODAL ================= */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: '16px',
            padding: '26px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={24} color="#2563eb" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Import Candidates from Excel</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Upload a roster to batch-create candidates. Duplicates by email will be skipped.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                style={{
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
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* File Selection Box */}
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '16px' }}>
              <Upload size={32} color="#2563eb" style={{ marginBottom: '8px' }} />
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                {importFile ? importFile.name : 'Select or Drop Excel file (.xlsx)'}
              </p>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} id="candidate-excel-file-input" style={{ display: 'none' }} />
              <label htmlFor="candidate-excel-file-input" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                Browse Excel File
              </label>
            </div>

            {previewLoading && (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                Parsing candidate Excel roster...
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
                  {importPreview.invalid_rows_count > 0 && (
                    <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px' }}>
                      Invalid Rows: {importPreview.invalid_rows_count}
                    </span>
                  )}
                </div>

                {/* Preview Table */}
                <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                        <th style={{ padding: '10px' }}>#</th>
                        <th style={{ padding: '10px' }}>Candidate Name</th>
                        <th style={{ padding: '10px' }}>Email</th>
                        <th style={{ padding: '10px' }}>Country</th>
                        <th style={{ padding: '10px' }}>Visa Type</th>
                        <th style={{ padding: '10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row) => (
                        <tr key={row.row_number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', color: '#64748b' }}>{row.row_number}</td>
                          <td style={{ padding: '10px', fontWeight: '600', color: '#0f172a' }}>{row.full_name || '-'}</td>
                          <td style={{ padding: '10px' }}>
                            {row.email ? (
                              <span>{row.email}</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Email</span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>{row.country || '-'}</td>
                          <td style={{ padding: '10px' }}>{row.visa_type || '-'}</td>
                          <td style={{ padding: '10px' }}>
                            {row.status === 'Ready' && <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Ready</span>}
                            {row.status === 'Duplicate' && <span style={{ color: '#d97706', fontWeight: '600' }} title={row.status_reason}>⚠ Duplicate (Skipped)</span>}
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
                    Total: {importResult.total_rows} | Imported: {importResult.imported_count} | Skipped: {importResult.skipped_duplicates_count} | Invalid: {importResult.invalid_rows_count}
                  </div>
                  {importResult.details && importResult.details.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px', maxHeight: '100px', overflowY: 'auto' }}>
                      {importResult.details.map((d, i) => (
                        <div key={i} style={{ color: d.status === 'Invalid' ? '#dc2626' : '#d97706' }}>
                          Row {d.row_number}: {d.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={closeImportModal} style={{ padding: '9px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                {importResult ? 'Close' : 'Cancel'}
              </button>

              {importPreview && !importResult && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || importPreview.valid_count === 0}
                  style={{
                    padding: '9px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: importing || importPreview.valid_count === 0 ? 'not-allowed' : 'pointer',
                    opacity: importing || importPreview.valid_count === 0 ? 0.7 : 1,
                  }}
                >
                  {importing ? 'Importing Candidates...' : `Confirm & Import (${importPreview.valid_count} Candidates)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}