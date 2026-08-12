import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function OutreachPage() {
  const [candidates, setCandidates] = useState([]);
  const [employers, setEmployers] = useState([]);

  const [candidateId, setCandidateId] = useState('');
  const [employerId, setEmployerId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [loadingData, setLoadingData] = useState(true);
  const [sending, setSending] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [candidateResponse, employerResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/candidates`),
            fetch(`${API_BASE_URL}/employers`),
          ]);

        if (!candidateResponse.ok) {
          throw new Error('Failed to fetch candidates');
        }

        if (!employerResponse.ok) {
          throw new Error('Failed to fetch employers');
        }

        const candidateData = await candidateResponse.json();
        const employerData = await employerResponse.json();

        setCandidates(candidateData);
        setEmployers(employerData);
      } catch (err) {
        console.error(err);
        setError('Failed to load candidates or employers.');
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  const handleSubmit = async (event) => {
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

    if (!subject.trim()) {
      setError('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      setError('Please enter the email body.');
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/outreach/send`,
        {
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
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Failed to send outreach email.'
        );
      }

      setMessage(
        data.message || 'Outreach email sent successfully.'
      );

      setSubject('');
      setBody('');
    } catch (err) {
      console.error('Outreach error:', err);
      setError(err.message || 'Failed to send outreach email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="content-container">
      <h1 className="page-title">Send Outreach</h1>

      <p className="page-subtitle">
        Send an outreach email to an employer using a connected
        candidate Gmail account.
      </p>

      {loadingData ? (
        <div className="placeholder-page">
          <p>Loading candidates and employers...</p>
        </div>
      ) : (
        <div className="outreach-card">
          <div className="outreach-card-header">
            <div>
              <h2 className="outreach-card-title">
                New Outreach Email
              </h2>

              <p className="outreach-card-subtitle">
                Select the student Gmail account and employer.
              </p>
            </div>

            <Send size={22} />
          </div>

          <form
            className="outreach-form"
            onSubmit={handleSubmit}
          >
            <div className="form-group">
              <label htmlFor="candidate">
                Candidate
              </label>

              <select
                id="candidate"
                value={candidateId}
                onChange={(event) =>
                  setCandidateId(event.target.value)
                }
              >
                <option value="">
                  Select candidate
                </option>

                {candidates.map((candidate) => (
                  <option
                    key={candidate.id}
                    value={candidate.id}
                  >
                    {candidate.full_name} — {candidate.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="employer">
                Employer
              </label>

              <select
                id="employer"
                value={employerId}
                onChange={(event) =>
                  setEmployerId(event.target.value)
                }
              >
                <option value="">
                  Select employer
                </option>

                {employers.map((employer) => (
                  <option
                    key={employer.id}
                    value={employer.id}
                  >
                    {employer.service_name} — {employer.email}
                  </option>
                ))}
              </select>
            </div>
            

            <div className="form-group">
              <label htmlFor="subject">
                Subject
              </label>

              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                placeholder="Enter email subject"
              />
            </div>

            <div className="form-group">
              <label htmlFor="body">
                Email Body
              </label>

              <textarea
                id="body"
                rows={10}
                value={body}
                onChange={(event) =>
                  setBody(event.target.value)
                }
                placeholder="Write your outreach email..."
              />
            </div>

            {error && (
              <div className="outreach-error">
                {error}
              </div>
            )}

            {message && (
              <div className="outreach-success">
                {message}
              </div>
            )}

            <div className="outreach-actions">
              <button
                type="submit"
                className="send-outreach-button"
                disabled={sending}
              >
                <Send size={16} />

                {sending
                  ? 'Sending...'
                  : 'Send Outreach'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}