import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Upload,
  Paperclip,
  ExternalLink,
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

const emptyForm = {
  name: '',
  subject: '',
  body: '',
  attachment_filename: '',
  attachment_path: '',
  remove_attachment: false,
};

export default function EmailDraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const fileInputRef = useRef(null);

  const [viewingDraft, setViewingDraft] = useState(null);

  const [deletingDraft, setDeletingDraft] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/email-drafts`);

      if (!response.ok) {
        let detailMsg = 'Failed to fetch email drafts';
        try {
          const errData = await response.json();
          detailMsg = typeof errData.detail === 'string' ? errData.detail : detailMsg;
        } catch {
          // ignore
        }
        throw new Error(detailMsg);
      }

      const data = await response.json();
      setDrafts(data);
      setError('');
    } catch (err) {
      console.error('Fetch drafts error:', err);
      setError(err.message || 'Failed to fetch email drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const openCreateModal = () => {
    setEditingDraft(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setShowFormModal(true);
  };

  const openEditModal = (draft) => {
    setEditingDraft(draft);
    setForm({
      name: draft.name || '',
      subject: draft.subject || '',
      body: draft.body || '',
      attachment_filename: draft.attachment_filename || '',
      attachment_path: draft.attachment_path || '',
      remove_attachment: false,
    });
    setError('');
    setSuccess('');
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (uploadingAttachment || saving) return;
    setShowFormModal(false);
    setEditingDraft(null);
    setForm(emptyForm);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      setError('Only PDF, DOC, and DOCX files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Attachment file must be 10 MB or smaller.');
      return;
    }

    try {
      setUploadingAttachment(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/email-drafts/upload-attachment`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to upload attachment');
      }

      setForm((prev) => ({
        ...prev,
        attachment_filename: data.attachment_filename,
        attachment_path: data.attachment_path,
        remove_attachment: false,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = () => {
    setForm((prev) => ({
      ...prev,
      attachment_filename: '',
      attachment_path: '',
      remove_attachment: true,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const subject = form.subject.trim();
    const body = form.body.trim();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const isEditing = Boolean(editingDraft);
      const url = isEditing
        ? `${API_URL}/email-drafts/${editingDraft.id}`
        : `${API_URL}/email-drafts`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || null,
          subject: subject || null,
          body: body || null,
          attachment_filename: form.attachment_filename || null,
          attachment_path: form.attachment_path || null,
          remove_attachment: form.remove_attachment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let detail = 'Failed to save email draft';
        if (typeof data.detail === 'string') {
          detail = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          detail = data.detail[0].msg || detail;
        }
        throw new Error(detail);
      }

      setSuccess(
        isEditing
          ? 'Email draft updated successfully.'
          : 'Email draft created successfully.'
      );

      closeFormModal();
      fetchDrafts();
    } catch (err) {
      console.error('Save draft error:', err);
      setError(err.message || 'Failed to save email draft');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDraft) return;

    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      const response = await fetch(
        `${API_URL}/email-drafts/${deletingDraft.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        let message = 'Failed to delete email draft';
        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      setDrafts((prev) => prev.filter((d) => d.id !== deletingDraft.id));
      setSuccess('Email draft deleted successfully.');
      setDeletingDraft(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Email Drafts
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', margin: 0 }}>
            Create and manage reusable email templates for employer outreach.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <Plus size={18} strokeWidth={2.2} />
          Create Email Draft
        </button>
      </div>

      {/* Success / Error Banners */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          {success}
        </div>
      )}

      {/* Main Table Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Loading email drafts...
          </div>
        ) : drafts.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <FileText size={48} color="#94a3b8" strokeWidth={1.5} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#334155', margin: '0 0 6px 0' }}>
              No email drafts found
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Click "+ Create Email Draft" to create your first outreach template.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                <th style={{ padding: '14px 20px', width: '60px' }}>#</th>
                <th style={{ padding: '14px 20px' }}>Draft Name</th>
                <th style={{ padding: '14px 20px' }}>Subject</th>
                <th style={{ padding: '14px 20px' }}>Assigned Candidate</th>
                <th style={{ padding: '14px 20px', width: '180px' }}>Updated At</th>
                <th style={{ padding: '14px 20px', width: '160px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft, index) => (
                <tr
                  key={draft.id}
                  style={{
                    borderBottom: index === drafts.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <td style={{ padding: '14px 20px', color: '#64748b', fontWeight: '500' }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: '600', color: '#0f172a' }}>
                    {draft.name || (draft.attachment_filename ? `📄 ${draft.attachment_filename}` : (draft.subject || 'Untitled Draft'))}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#334155' }}>
                    {draft.subject || <span style={{ color: '#94a3b8' }}>(No Subject)</span>}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#334155' }}>
                    {draft.assigned_candidate_name ? (
                      <span style={{ fontWeight: '500', color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        👤 {draft.assigned_candidate_name}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '13px' }}>
                    {formatDate(draft.updated_at || draft.created_at)}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => setViewingDraft(draft)}
                        title="View Email Draft"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={15} />
                        View
                      </button>

                      <button
                        onClick={() => openEditModal(draft)}
                        title="Edit Email Draft"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#2563eb',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        onClick={() => setDeletingDraft(draft)}
                        title="Delete Email Draft"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE / EDIT DRAFT MODAL */}
      {showFormModal && (
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
            maxWidth: '640px',
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
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {editingDraft ? 'Edit Email Draft' : 'Create Email Draft'}
              </h2>
              <button
                onClick={closeFormModal}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Draft Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Visa Sponsorship Outreach"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Potential Visa Sponsorship Candidate"
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Email Body
                </label>
                <textarea
                  rows={6}
                  placeholder="Type your email template body here..."
                  value={form.body}
                  onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Attachment (Optional)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                />

                {form.attachment_filename ? (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={22} color="#2563eb" />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                          📄 {form.attachment_filename}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>PDF / DOC / DOCX</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAttachment}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#2563eb',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        disabled={uploadingAttachment}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '2px dashed #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={18} />
                    {uploadingAttachment ? 'Uploading attachment...' : '+ Upload PDF / DOC / DOCX'}
                  </button>
                )}
                <small style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  PDF, DOC or DOCX • Maximum 10 MB
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closeFormModal}
                  style={{
                    padding: '10px 18px',
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
                  disabled={saving || uploadingAttachment}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: (saving || uploadingAttachment) ? 'not-allowed' : 'pointer',
                    opacity: (saving || uploadingAttachment) ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DRAFT MODAL */}
      {viewingDraft && (
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
            maxWidth: '640px',
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
                  Email Draft Preview
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '2px 0 0 0' }}>
                  {viewingDraft.name}
                </h2>
              </div>
              <button
                onClick={() => setViewingDraft(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                  Subject:
                </span>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>
                  {viewingDraft.subject}
                </span>
              </div>

              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Attachment:
                </span>
                {viewingDraft.attachment_filename && viewingDraft.attachment_path ? (
                  <button
                    type="button"
                    onClick={() => {
                      const url = viewingDraft.attachment_path.startsWith('http')
                        ? viewingDraft.attachment_path
                        : `${API_URL}/${viewingDraft.attachment_path.replace(/^\/+/, '')}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    <FileText size={15} />
                    📄 {viewingDraft.attachment_filename}
                    <ExternalLink size={13} />
                  </button>
                ) : (
                  <span style={{ fontSize: '14px', color: '#94a3b8' }}>No attachment</span>
                )}
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
                maxHeight: '360px',
                overflowY: 'auto',
              }}>
                {viewingDraft.body}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={() => setViewingDraft(null)}
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

      {/* DELETE DRAFT MODAL */}
      {deletingDraft && (
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
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>
              Delete Email Draft?
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>"{deletingDraft.name}"</strong>? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setDeletingDraft(null)}
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
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
