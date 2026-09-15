import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();

export default function EmailLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetch(`${API_BASE_URL}/email-logs`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch email logs');
        }

        return response.json();
      })
      .then((data) => {
        setLogs(data);
        setError('');
      })
      .catch((err) => {
        console.error('Email logs fetch error:', err);
        setError('Failed to fetch email logs');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const failedCount = logs.filter(l => l.status === 'failed' || l.status === 'Failed' || l.error_message).length;
  const sentCount = logs.filter(l => (l.status === 'sent' || l.status === 'Sent') && l.direction !== 'incoming').length;
  const incomingCount = logs.filter(l => l.direction === 'incoming').length;

  const filteredLogs = logs.filter((log) => {
    if (statusFilter === 'SENT') return (log.status === 'sent' || log.status === 'Sent') && log.direction !== 'incoming';
    if (statusFilter === 'FAILED') return log.status === 'failed' || log.status === 'Failed' || !!log.error_message;
    if (statusFilter === 'INCOMING') return log.direction === 'incoming';
    return true;
  });

  return (
    <div className="content-container">
      <h1 className="page-title">Email Logs</h1>

      <p className="page-subtitle">
        Complete historical logs of all automated outreach communications sent and failed delivery statuses.
      </p>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: statusFilter === 'ALL' ? '1px solid #4f46e5' : '1px solid #cbd5e1',
            backgroundColor: statusFilter === 'ALL' ? '#4f46e5' : '#ffffff',
            color: statusFilter === 'ALL' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          All Logs ({logs.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('SENT')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: statusFilter === 'SENT' ? '1px solid #16a34a' : '1px solid #cbd5e1',
            backgroundColor: statusFilter === 'SENT' ? '#16a34a' : '#ffffff',
            color: statusFilter === 'SENT' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ✓ Sent ({sentCount})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('FAILED')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: statusFilter === 'FAILED' ? '1px solid #dc2626' : '1px solid #cbd5e1',
            backgroundColor: statusFilter === 'FAILED' ? '#dc2626' : '#ffffff',
            color: statusFilter === 'FAILED' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ⚠️ Failed ({failedCount})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('INCOMING')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: statusFilter === 'INCOMING' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: statusFilter === 'INCOMING' ? '#0284c7' : '#ffffff',
            color: statusFilter === 'INCOMING' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          📥 Incoming Replies ({incomingCount})
        </button>
      </div>

      {loading && (
        <p>Loading email logs...</p>
      )}

      {error && (
        <p style={{ color: '#dc2626' }}>{error}</p>
      )}

      {!loading && !error && filteredLogs.length === 0 && (
        <div className="placeholder-page">
          <FileText
            className="placeholder-icon"
            strokeWidth={1.5}
          />

          <h2 className="placeholder-title">
            No Email Logs Found
          </h2>

          <p className="placeholder-desc">
            No logs match the selected status filter.
          </p>
        </div>
      )}

      {!loading && !error && filteredLogs.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Direction</th>
                <th>Candidate</th>
                <th>Employer</th>
                <th>Gmail Account</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Sent / Received At</th>
                <th>Error Reason</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>

                  <td>
                    {log.direction === 'incoming' ? (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 600, border: '1px solid #a7f3d0', display: 'inline-block' }}>
                        INCOMING / REPLY
                      </span>
                    ) : (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 600, border: '1px solid #bfdbfe', display: 'inline-block' }}>
                        OUTGOING
                      </span>
                    )}
                  </td>

                  <td>
                    <strong style={{ color: '#0f172a' }}>
                      {log.candidate_name || `Candidate #${log.candidate_id}`}
                    </strong>
                  </td>

                  <td>
                    <strong style={{ color: '#0f172a', display: 'block' }}>
                      {log.employer_name || `Employer #${log.employer_id}`}
                    </strong>
                    {log.employer_email && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {log.employer_email}
                      </span>
                    )}
                  </td>

                  <td>
                    <span style={{ fontSize: '12px', color: '#047857' }}>
                      {log.gmail_email || `Gmail #${log.gmail_account_id}`}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{log.subject}</span>
                    {log.gmail_message_id && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>
                        Msg ID: {log.gmail_message_id}
                      </span>
                    )}
                  </td>

                  <td>
                    {log.status === 'sent' || log.status === 'Sent' ? (
                      <span className="status-badge active">
                        <span className="status-dot"></span> Sent
                      </span>
                    ) : log.status === 'failed' || log.status === 'Failed' ? (
                      <span className="status-badge inactive">Failed</span>
                    ) : (
                      <span className="status-badge">{log.status}</span>
                    )}
                  </td>

                  <td>
                    {log.sent_at
                      ? new Date(log.sent_at).toLocaleString()
                      : log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                  </td>

                  <td>
                    {log.error_message ? (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '12px',
                        fontWeight: 500,
                        border: '1px solid #fecaca',
                        display: 'inline-block',
                        maxWidth: '280px',
                        wordBreak: 'break-word',
                      }}>
                        ⚠️ {log.error_message}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
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