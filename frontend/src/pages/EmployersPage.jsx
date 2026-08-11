import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  X,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

const emptyForm = {
  service_name: '',
  email: '',
  country: '',
  industry: '',
  service_website: '',
  is_active: true,
};

export default function EmployersPage() {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/employers`);

      if (!response.ok) {
        throw new Error('Failed to fetch employers');
      }

      const data = await response.json();
      setEmployers(data);
    } catch (err) {
      setError(err.message);
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
      service_name: employer.company_name || '',
      email: employer.email || '',
      country: employer.country || '',
      industry: employer.industry || '',
      service_website: employer.website || '',
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

      if (!form.service_name.trim()) {
        throw new Error('Service Name is required.');
      }

      if (!form.email.trim()) {
        throw new Error('Email is required.');
      }

      const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      if (!emailPattern.test(form.email.trim())) {
        throw new Error('Please enter a valid email address.');
      }

      if (form.service_website.trim()) {
        try {
          const url = new URL(form.service_website.trim());
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

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: form.service_name.trim(),
          email: form.email.trim(),
          country: form.country.trim() || null,
          industry: form.industry.trim() || null,
          website: form.service_website.trim() || null,
          is_active: form.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save employer');
      }

      if (isEditing) {
        setEmployers((prev) =>
          prev.map((employer) =>
            employer.id === data.id ? data : employer
          )
        );

        setSuccess('Employer updated successfully.');
      } else {
        setEmployers((prev) => [...prev, data]);

        setSuccess('Employer added successfully.');
      }

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

      const response = await fetch(
        `${API_URL}/employers/${employer.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_active: !employer.is_active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update status');
      }

      setEmployers((prev) =>
        prev.map((item) =>
          item.id === data.id ? data : item
        )
      );

      setSuccess(
        `${employer.company_name || '-'} is now ${
          data.is_active ? 'Active' : 'Inactive'
        }.`
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteEmployer = async (employer) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${employer.company_name || '-'}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response = await fetch(
        `${API_URL}/employers/${employer.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        let message = 'Failed to delete employer';

        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // 204 response has no JSON body
        }

        throw new Error(message);
      }

      setEmployers((prev) =>
        prev.filter((item) => item.id !== employer.id)
      );

      setSuccess('Employer deleted successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="content-container">

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          gap: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={25} color="#2563eb" />
          </div>

          <div>
            <h1 className="page-title">Employers</h1>
            <p className="page-subtitle">
              Manage services and target outreach employers.
            </p>
          </div>
        </div>

        <button
          onClick={openAddForm}
          style={primaryButtonStyle}
        >
          <Plus size={18} />
          Add Employer
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={errorStyle}>
          {error}
          <button
            onClick={() => setError('')}
            style={dismissButtonStyle}
          >
            ×
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={successStyle}>
          {success}
          <button
            onClick={() => setSuccess('')}
            style={dismissButtonStyle}
          >
            ×
          </button>
        </div>
      )}

      {/* Employers Card */}
      <div style={cardStyle}>

        <div
          style={{
            padding: '20px 22px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
            }}
          >
            All Employers
          </h2>

          <p
            style={{
              margin: '5px 0 0',
              color: '#64748b',
            }}
          >
            {employers.length} employers registered
          </p>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>
            Loading employers...
          </div>
        ) : employers.length === 0 ? (
          <div style={emptyStateStyle}>
            <Building2 size={36} color="#94a3b8" />

            <p
              style={{
                margin: '10px 0 0',
                color: '#64748b',
              }}
            >
              No employers found.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '1050px',
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Service Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Country</th>
                  <th style={thStyle}>Industry</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Service Website</th>
                  <th
                    style={{
                      ...thStyle,
                      textAlign: 'center',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {employers.map((employer) => (
                  <tr key={employer.id}>

                    <td style={tdStyle}>
                      #{employer.id}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      {employer.company_name || '-'}
                    </td>

                    <td style={tdStyle}>
                      {employer.email}
                    </td>

                    <td style={tdStyle}>
                      {employer.country || '-'}
                    </td>

                    <td style={tdStyle}>
                      {employer.industry || '-'}
                    </td>

                    {/* Status */}
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleStatus(employer)}
                        title="Click to change status"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 11px',
                          border: 'none',
                          borderRadius: '999px',
                          background: employer.is_active
                            ? '#ecfdf5'
                            : '#f1f5f9',
                          color: employer.is_active
                            ? '#047857'
                            : '#64748b',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <span>●</span>
                        {employer.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </button>
                    </td>

                    {/* Website */}
                    <td style={tdStyle}>
                      {employer.website ? (
                        <a
                          href={employer.website}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#2563eb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          Visit
                          <ExternalLink size={15} />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <button
                          onClick={() => openEditForm(employer)}
                          title="Edit employer"
                          style={iconButtonStyle}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => deleteEmployer(employer)}
                          title="Delete employer"
                          style={{
                            ...iconButtonStyle,
                            color: '#dc2626',
                            borderColor: '#fecaca',
                          }}
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

      {/* Add / Edit Modal */}
      {showForm && (
        <div
          style={modalOverlayStyle}
          onClick={closeForm}
        >
          <div
            style={modalStyle}
            onClick={(event) => event.stopPropagation()}
          >

            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '22px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    color: '#0f172a',
                  }}
                >
                  {editingEmployer
                    ? 'Edit Employer'
                    : 'Add Employer'}
                </h2>

                <p
                  style={{
                    margin: '6px 0 0',
                    color: '#64748b',
                    fontSize: '14px',
                  }}
                >
                  {editingEmployer
                    ? 'Update employer service details.'
                    : 'Add a new service for outreach.'}
                </p>
              </div>

              <button
                onClick={closeForm}
                style={closeButtonStyle}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <FormField
                label="Service Name"
                name="service_name"
                value={form.service_name}
                onChange={handleChange}
                placeholder="e.g. Visa Sponsorship Services"
                required
              />

              <FormField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="service@example.com"
                required
              />

              <FormField
                label="Country"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="India"
              />

              <FormField
                label="Industry"
                name="industry"
                value={form.industry}
                onChange={handleChange}
                placeholder="Technology"
              />

              <FormField
                label="Service Website"
                name="service_website"
                type="url"
                value={form.service_website}
                onChange={handleChange}
                placeholder="https://example.com"
              />

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '4px',
                  marginBottom: '22px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#2563eb',
                    cursor: 'pointer',
                  }}
                />
                Employer is Active
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '22px',
                }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    ...primaryButtonStyle,
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  {editingEmployer
                    ? 'Save Changes'
                    : 'Add Employer'}
                </button>
              </div>

            </form>
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
    <div style={{ marginBottom: '16px' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '7px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#334155',
        }}
      >
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '11px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          fontSize: '14px',
          outline: 'none',
        }}
      />
    </div>
  );
}