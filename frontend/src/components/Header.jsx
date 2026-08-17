import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, ChevronDown, Bell, Check, CheckCheck, RefreshCw, Mail, ExternalLink } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';
const POLLING_INTERVAL_MS = 30000; // 30 seconds polling

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const dropdownRef = useRef(null);
  const isSyncingRef = useRef(false);

  const loadNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        fetch(`${API_BASE_URL}/notifications`),
        fetch(`${API_BASE_URL}/notifications/unread-count`),
      ]);

      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data);
      }

      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.unread_count ?? 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const syncAndLoadNotifications = async () => {
    if (isSyncingRef.current) return;
    try {
      isSyncingRef.current = true;
      setSyncing(true);
      await fetch(`${API_BASE_URL}/notifications/sync`, { method: 'POST' });
      await loadNotifications();
    } catch (err) {
      console.error('Failed to sync notifications:', err);
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Initial sync & load
    syncAndLoadNotifications();

    // 30-second interval polling
    const intervalId = setInterval(() => {
      syncAndLoadNotifications();
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'POST',
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    setDropdownOpen(false);
    navigate('/email-logs');
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* NOTIFICATION BELL ICON & DROPDOWN */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            className="notification-bell-btn"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="Notifications"
            style={{
              position: 'relative',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: dropdownOpen ? '#1d4ed8' : '#475569',
              transition: 'all 0.2s ease',
            }}
          >
            <Bell size={20} strokeWidth={2} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  height: '18px',
                  minWidth: '18px',
                  borderRadius: '9px',
                  padding: '0 5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px #ffffff',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* DROPDOWN PANEL */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '360px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>Notifications</strong>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={syncAndLoadNotifications}
                    disabled={syncing}
                    title="Check for new replies"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: syncing ? 'not-allowed' : 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                  </button>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Items List */}
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    <Mail size={32} strokeWidth={1.5} style={{ marginBottom: '8px', opacity: 0.6 }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: n.is_read ? '#ffffff' : '#f0f9ff',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!n.is_read && (
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: '#0284c7',
                                display: 'inline-block',
                              }}
                            />
                          )}
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>
                            🔔 {n.title}
                          </span>
                        </div>

                        <span style={{ fontSize: '11px', color: '#94a3b8', whitespace: 'nowrap' }}>
                          {formatTime(n.created_at)}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600', marginBottom: '2px' }}>
                        {n.employer_name || n.employer_email || 'Employer Reply'}
                      </div>

                      {n.candidate_name && (
                        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '2px' }}>
                          Candidate: <strong>{n.candidate_name}</strong>
                        </div>
                      )}

                      {n.subject && (
                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                          {n.subject}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                        {!n.is_read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0284c7',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            <Check size={12} /> Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #f1f5f9',
                  textAlign: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/email-logs');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  View all in Email Logs <ExternalLink size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ADMIN PROFILE */}
        <div className="admin-profile">
          <div className="avatar-circle">
            <User size={18} strokeWidth={2.2} />
          </div>
          <span className="admin-name">Admin</span>
          <ChevronDown className="chevron-icon" size={16} strokeWidth={2} />
        </div>
      </div>
    </header>
  );
}
