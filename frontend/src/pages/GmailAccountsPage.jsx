import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle, XCircle, Link as LinkIcon } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function GmailAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/gmail-accounts`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch Gmail accounts');
        }

        return response.json();
      })
      .then((data) => {
        setAccounts(data);
        setError('');
      })
      .catch((err) => {
        console.error('Gmail accounts fetch error:', err);
        setError('Failed to fetch Gmail accounts');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const connectGmail = (candidateId) => {
    window.location.href =
      `${API_BASE_URL}/gmail-oauth/connect/${candidateId}`;
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
        <p>{error}</p>
      )}

      {!loading && !error && accounts.length === 0 && (
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

      {!loading && !error && accounts.length > 0 && (
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
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    {account.id}
                  </td>

                  <td>
                    Candidate #{account.candidate_id}
                  </td>

                  <td>
                    <strong>
                      {account.gmail_email}
                    </strong>
                  </td>

                  <td>
                    {account.is_active ? (
                      <span>
                        <CheckCircle
                          size={16}
                          style={{
                            verticalAlign: 'middle',
                            marginRight: '6px',
                          }}
                        />
                        Connected
                      </span>
                    ) : (
                      <span>
                        <XCircle
                          size={16}
                          style={{
                            verticalAlign: 'middle',
                            marginRight: '6px',
                          }}
                        />
                        Inactive
                      </span>
                    )}
                  </td>

                  <td>
                    {account.connected_at
                      ? new Date(
                          account.connected_at
                        ).toLocaleString()
                      : '-'}
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        connectGmail(account.candidate_id)
                      }
                    >
                      <LinkIcon
                        size={15}
                        style={{
                          verticalAlign: 'middle',
                          marginRight: '5px',
                        }}
                      />
                      Reconnect
                    </button>
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