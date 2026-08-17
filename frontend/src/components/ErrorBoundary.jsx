import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[EMAIL TRACKING ERROR BOUNDARY]', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 24px',
            maxWidth: '600px',
            margin: '40px auto',
            backgroundColor: '#ffffff',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(220, 38, 38, 0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            Something went wrong while loading Email Tracking
          </h2>

          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
            An unexpected error occurred. You can reload Email Tracking to recover the page state.
          </p>

          {this.state.error && (
            <div
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#dc2626',
                fontFamily: 'monospace',
                marginBottom: '24px',
                overflowX: 'auto',
              }}
            >
              {String(this.state.error.message || this.state.error)}
            </div>
          )}

          <button
            type="button"
            onClick={this.handleReload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            }}
          >
            <RefreshCw size={16} />
            Reload Email Tracking
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
