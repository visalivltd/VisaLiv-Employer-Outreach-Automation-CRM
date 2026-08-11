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
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  country: '',
  visa_type: '',
  cv_file_path: '',
  is_active: true,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx'];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ================= FETCH =================

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
  }, []);

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

    const phone = form.phone.trim();

    if (!phone) {
      return 'Phone number is required';
    }

    const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

    if (!phoneRegex.test(phone)) {
      return 'Please enter a valid phone number';
    }

    if (!form.country.trim()) {
      return 'Country is required';
    }

    if (!form.visa_type.trim()) {
      return 'Visa type is required';
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
        phone: form.phone.trim(),
        country: form.country.trim(),
        visa_type: form.visa_type.trim(),
        cv_file_path: cvFilePath,
        is_active: form.is_active,
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
      is_active: candidate.is_active ?? true,
    });

    setSelectedFile(null);
    setShowForm(true);
  };

  // ================= DELETE =================

  const handleDelete = async (candidate) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${candidate.full_name}"?`
    );

    if (!confirmed) {
      return;
    }

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

      await fetchCandidates();

      setSuccess('Candidate deleted successfully.');
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

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Candidate
        </button>

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
                  Phone <span className="required">*</span>
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  required
                />
              </div>

              {/* COUNTRY */}

              <div className="form-field">
                <label>
                  Country <span className="required">*</span>
                </label>

                <input
                  type="text"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  placeholder="India"
                  required
                />
              </div>

              {/* VISA */}

              <div className="form-field">
                <label>
                  Visa Type <span className="required">*</span>
                </label>

                <input
                  type="text"
                  name="visa_type"
                  value={form.visa_type}
                  onChange={handleChange}
                  placeholder="H1B / Work Visa"
                  required
                />
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

              {/* ACTIVE */}

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
                  <th>CV</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {candidates.map((candidate) => (

                  <tr key={candidate.id}>

                    <td>
                      <span className="candidate-id">
                        #{candidate.id}
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

                        <div className="gmail-connected">

                          <Check size={15} />

                          <span>
                            {candidate.gmail_email}
                          </span>

                        </div>

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

    </div>
  );
}