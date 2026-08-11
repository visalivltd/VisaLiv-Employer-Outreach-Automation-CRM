import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function EmailLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="content-container">
      <h1 className="page-title">Email Logs</h1>

      <p className="page-subtitle">
        Complete historical logs of all automated outreach communications sent.
      </p>

      {loading && (
        <p>Loading email logs...</p>
      )}

      {error && (
        <p>{error}</p>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="placeholder-page">
          <FileText
            className="placeholder-icon"
            strokeWidth={1.5}
          />

          <h2 className="placeholder-title">
            No Email Logs Found
          </h2>

          <p className="placeholder-desc">
            No outreach emails have been sent yet.
          </p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Candidate</th>
                <th>Employer</th>
                <th>Gmail Account</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Sent At</th>
                <th>Error</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>

                  <td>
                    Candidate #{log.candidate_id}
                  </td>

                  <td>
                    Employer #{log.employer_id}
                  </td>

                  <td>
                    Gmail #{log.gmail_account_id}
                  </td>

                  <td>
                    {log.subject}
                  </td>

                  <td>
                    {log.status}
                  </td>

                  <td>
                    {log.sent_at
                      ? new Date(log.sent_at).toLocaleString()
                      : '-'}
                  </td>

                  <td>
                    {log.error_message || '-'}
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