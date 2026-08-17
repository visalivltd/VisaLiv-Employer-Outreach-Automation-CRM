import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle, XCircle, AlertTriangle, Link as LinkIcon, Trash2, Check } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function GmailAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    console.log('[GMAIL ACCOUNTS UI] fetch started');
    setLoading(true);
    fetch(`${API_BASE_URL}/gmail-accounts`)
      .then(async (response) => {
        console.log('[GMAIL ACCOUNTS UI] response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch Gmail accounts (HTTP ${response.status})`);
        }
        const data = await response.json();
        console.log('[GMAIL ACCOUNTS UI] response received, item count:', Array.isArray(data) ? data.length : 'non-array');
        return data;
      })
      .then((data) => {
        const safeData = Array.isArray(data) ? data : (data?.accounts || []);
        console.log('[GMAIL ACCOUNTS UI] setting accounts:', safeData.length);
        setAccounts(safeData);
        setError('');
      })
      .catch((err) => {
        console.error('[GMAIL ACCOUNTS UI] fetch error:', err);
        setError(err.message || 'Failed to fetch Gmail accounts');
      })
      .finally(() => {
        console.log('[GMAIL ACCOUNTS UI] setting loading false');
        setLoading(false);
      });
  }, []);

  const connectGmail = (candidateId) => {
    window.open(
      `${API_BASE_URL}/gmail-oauth/connect/${candidateId}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const deleteAccount = async (account) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this Gmail account connection?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(account.id);
      setError('');
      setSuccess('');

      const response = await fetch(
        `${API_BASE_URL}/gmail-accounts/${account.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        let message = 'Failed to delete Gmail account';

        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // Ignore JSON parsing error on 204
        }

        throw new Error(message);
      }

      setAccounts((prev) =>
        prev.filter((item) => item.id !== account.id)
      );

      setSuccess('Gmail account deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete Gmail account');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="content-container">
      <h1 className="page-title">Gmail Accounts</h1>

      <p className="page-subtitle">
        Configured Gmail accounts used for sending automated outreach emails.
      </p>

      {loading && (
        <p>Loading Gmail accounts...</p>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '8px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} />
            {success}
          </span>
          <button type="button" onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <div className="placeholder-page">
          <Mail
            className="placeholder-icon"
            strokeWidth={1.5}
          />

          <h2 className="placeholder-title">
            No Gmail Accounts Connected
          </h2>

          <p className="placeholder-desc">
            Connect a Gmail account to send outreach emails.
          </p>
        </div>
      )}

      {!loading && accounts.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Candidate</th>
                <th>Gmail Account</th>
                <th>Status</th>
                <th>Connected At</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {accounts.map((account, index) => (
                <tr key={account.id}>
                  <td>
                    #{index + 1}
                  </td>

                  <td>
                    <strong>
                      {account.candidate_name || `Candidate #${account.candidate_id}`}
                    </strong>
                  </td>

                  <td>
                    <strong>
                      {account.gmail_email}
                    </strong>
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {account.is_active && account.has_read_scope !== false && account.has_send_scope !== false ? (
                        <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={15} />
                          Connected
                        </span>
                      ) : (
                        <span style={{ color: '#d97706', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={15} />
                          Reauthorization Required
                        </span>
                      )}

                      {account.has_read_scope !== false ? (
                        <span style={{ fontSize: '12px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ✓ Email sync enabled
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ⚠ Email sync permission required
                        </span>
                      )}

                      {account.has_send_scope !== false ? (
                        <span style={{ fontSize: '12px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ✓ Sending enabled
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ⚠ Sending permission required
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    {account.connected_at
                      ? new Date(
                          account.connected_at
                        ).toLocaleString()
                      : '-'}
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="reconnect-button"
                        onClick={() =>
                          connectGmail(account.candidate_id)
                        }
                        title="Reconnect Gmail account"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#2563eb',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <LinkIcon size={14} strokeWidth={2.2} />
                        <span>Reconnect Gmail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteAccount(account)}
                        disabled={deletingId === account.id}
                        title="Delete Gmail account"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                          transition: 'all 0.15s ease',
                          opacity: deletingId === account.id ? 0.6 : 1,
                        }}
                      >
                        <Trash2 size={14} strokeWidth={2.2} />
                        <span>Delete</span>
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
  );
}