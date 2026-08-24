import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Mail,
  Inbox,
  Paperclip,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  CornerUpLeft,
  User,
  Users,
  MessageCircle,
  Flag,
  Calendar,
  Building2,
  Check,
  RotateCcw,
  Link as LinkIcon
} from 'lucide-react';

const API_BASE_URL = 'https://visaliv-crm-backend-477131280275.asia-south2.run.app';

export default function EmailTrackingPage() {
  const navigate = useNavigate();

  // Raw API State
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [gmailAccounts, setGmailAccounts] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // GLOBAL FILTER BAR STATE
  const [selectedCandidateId, setSelectedCandidateId] = useState('all');
  const [selectedGmailAccount, setSelectedGmailAccount] = useState('all');
  const [selectedConversationFilter, setSelectedConversationFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChip, setFilterChip] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Selected Conversation Key for Reading Pane
  const [selectedConversationKey, setSelectedConversationKey] = useState(null);

  // Collapsed / Expanded state for messages in the reading pane thread
  const [expandedMessageIds, setExpandedMessageIds] = useState(new Set());

  // COMPOSE MODAL STATE
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeFromCandId, setComposeFromCandId] = useState('');
  const [composeToEmail, setComposeToEmail] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachCv, setComposeAttachCv] = useState(true);
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState('');

  // INLINE REPLY EDITOR STATE (Inside Conversation Reading Pane)
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyAttachCv, setReplyAttachCv] = useState(true);
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState('');

  // Fetch all required CRM data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [logsRes, notifRes, accountsRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/email-logs`),
        fetch(`${API_BASE_URL}/notifications`),
        fetch(`${API_BASE_URL}/gmail-accounts`),
        fetch(`${API_BASE_URL}/employers`),
      ]);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setGmailAccounts(accountsData);
      }

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployers(empData);
      }

      setLastSynced(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      console.error('Email tracking fetch error:', err);
      setError('Failed to load email tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Toast Banner
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Sync Now & Refresh (PRESERVES ALL FILTERS)
  const handleRefreshKeepFilters = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      const res = await fetch(`${API_BASE_URL}/notifications/sync`, { method: 'POST' });
      const syncData = await res.json();
      await fetchData();
      if (syncData.message) {
        showToast(syncData.message);
      } else {
        showToast('Refreshed tracking data (filters preserved)');
      }
    } catch (err) {
      console.error('Failed to sync email replies:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Reset All Filters Action
  const handleResetFilters = () => {
    setSelectedCandidateId('all');
    setSelectedGmailAccount('all');
    setSelectedConversationFilter('all');
    setSelectedStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setFilterChip('all');
    setSortBy('newest');
    showToast('Filters reset to default');
  };

  // Group Email Logs into Conversations Threaded by (candidate_id, employer_id)
  const conversations = useMemo(() => {
    const unreadMap = new Map();
    notifications.forEach((n) => {
      if (!n.is_read) {
        if (n.gmail_message_id) unreadMap.set(n.gmail_message_id, n.id);
        if (n.email_log_id) unreadMap.set(n.email_log_id, n.id);
      }
    });

    const grouped = {};

    logs.forEach((log) => {
      const key = `${log.candidate_id}_${log.employer_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          candidate_id: log.candidate_id,
          candidate_name: log.candidate_name || `Candidate #${log.candidate_id}`,
          candidate_gmail: log.gmail_email || '',
          candidate_cv_path: log.candidate_cv_path || null,
          employer_id: log.employer_id,
          employer_name: log.employer_name || `Employer #${log.employer_id}`,
          employer_email: log.employer_email || '',
          messages: [],
          has_unread: false,
          unread_notification_ids: [],
          has_attachments: false,
        };
      }

      const notifId = unreadMap.get(log.gmail_message_id) || unreadMap.get(log.id);
      const isUnread = Boolean(notifId) || (log.direction === 'incoming' && log.status === 'received');

      if (isUnread) {
        grouped[key].has_unread = true;
        if (notifId) grouped[key].unread_notification_ids.push(notifId);
      }

      if (log.candidate_cv_path || log.error_message || log.gmail_message_id) {
        grouped[key].has_attachments = true;
      }

      grouped[key].messages.push(log);
    });

    const list = Object.values(grouped).map((conv) => {
      conv.messages.sort(
        (a, b) => new Date(a.created_at || a.sent_at) - new Date(b.created_at || b.sent_at)
      );

      const latestMessage = conv.messages[conv.messages.length - 1];
      const rawSubject = latestMessage?.subject || 'Application for Position';
      const cleanSubject = rawSubject.replace(/^(Re:\s*|Fwd:\s*)/i, '').trim();

      return {
        ...conv,
        latestMessage,
        subject: cleanSubject,
        lastTimestamp: latestMessage
          ? new Date(latestMessage.created_at || latestMessage.sent_at)
          : new Date(0),
        messageCount: conv.messages.length,
      };
    });

    return list;
  }, [logs, notifications]);

  // Derived Accounts List for Left Pane & Filters
  const accountsList = useMemo(() => {
    const map = {};

    gmailAccounts.forEach((acc) => {
      map[acc.candidate_id] = {
        candidate_id: acc.candidate_id,
        candidate_name: acc.candidate_name || `Candidate #${acc.candidate_id}`,
        gmail_email: acc.gmail_email,
        is_active: acc.is_active,
        conversationCount: 0,
        unreadCount: 0,
      };
    });

    conversations.forEach((c) => {
      if (!map[c.candidate_id]) {
        map[c.candidate_id] = {
          candidate_id: c.candidate_id,
          candidate_name: c.candidate_name,
          gmail_email: c.candidate_gmail,
          is_active: true,
          conversationCount: 0,
          unreadCount: 0,
        };
      }
      map[c.candidate_id].conversationCount += 1;
      if (c.has_unread) {
        map[c.candidate_id].unreadCount += 1;
      }
    });

    return Object.values(map);
  }, [gmailAccounts, conversations]);

  // FILTERED CONVERSATIONS WITH STRICT AND LOGIC
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // 1. Candidate Filter
    if (selectedCandidateId !== 'all') {
      result = result.filter(
        (c) => c.candidate_id === Number(selectedCandidateId)
      );
    }

    // 2. Gmail Account Filter
    if (selectedGmailAccount !== 'all') {
      result = result.filter(
        (c) => c.candidate_gmail.toLowerCase() === selectedGmailAccount.toLowerCase()
      );
    }

    // 3. Conversation Filter
    if (selectedConversationFilter !== 'all') {
      if (selectedConversationFilter === 'unread') {
        result = result.filter((c) => c.has_unread);
      } else if (selectedConversationFilter === 'read') {
        result = result.filter((c) => !c.has_unread);
      } else if (selectedConversationFilter === 'with_replies') {
        result = result.filter((c) => c.messageCount > 1 || c.messages.some(m => m.direction === 'incoming'));
      } else if (selectedConversationFilter === 'outgoing') {
        result = result.filter((c) => c.latestMessage?.direction === 'outgoing');
      } else if (selectedConversationFilter === 'incoming') {
        result = result.filter((c) => c.latestMessage?.direction === 'incoming');
      } else if (selectedConversationFilter === 'attachments') {
        result = result.filter((c) => c.has_attachments);
      }
    }

    // 4. Status Filter
    if (selectedStatusFilter !== 'all') {
      if (selectedStatusFilter === 'sent') {
        result = result.filter((c) => c.messages.some(m => m.status === 'sent' || m.status === 'Sent'));
      } else if (selectedStatusFilter === 'received') {
        result = result.filter((c) => c.messages.some(m => m.status === 'received' || m.direction === 'incoming'));
      } else if (selectedStatusFilter === 'failed') {
        result = result.filter((c) => c.messages.some(m => m.status === 'failed' || m.status === 'Failed'));
      } else if (selectedStatusFilter === 'unread') {
        result = result.filter((c) => c.has_unread);
      }
    }

    // 5. Middle Pane Filter Chips
    if (filterChip === 'incoming') {
      result = result.filter((c) => c.latestMessage?.direction === 'incoming');
    } else if (filterChip === 'outgoing') {
      result = result.filter((c) => c.latestMessage?.direction === 'outgoing');
    } else if (filterChip === 'unread') {
      result = result.filter((c) => c.has_unread);
    } else if (filterChip === 'attachments') {
      result = result.filter((c) => c.has_attachments);
    }

    // 6. Date Range Filter
    if (startDate) {
      const startMs = new Date(startDate).setHours(0, 0, 0, 0);
      result = result.filter((c) => c.lastTimestamp.getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).setHours(23, 59, 59, 999);
      result = result.filter((c) => c.lastTimestamp.getTime() <= endMs);
    }

    // 7. Search in Results
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.candidate_name.toLowerCase().includes(q) ||
          c.candidate_gmail.toLowerCase().includes(q) ||
          c.employer_name.toLowerCase().includes(q) ||
          c.employer_email.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.messages.some((m) =>
            (m.error_message || '').toLowerCase().includes(q)
          )
      );
    }

    // Sort conversations
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return b.lastTimestamp - a.lastTimestamp;
      } else {
        return a.lastTimestamp - b.lastTimestamp;
      }
    });

    return result;
  }, [
    conversations,
    selectedCandidateId,
    selectedGmailAccount,
    selectedConversationFilter,
    selectedStatusFilter,
    filterChip,
    startDate,
    endDate,
    searchQuery,
    sortBy,
  ]);

  // Check if any filter is active
  const isFiltered = useMemo(() => {
    return (
      selectedCandidateId !== 'all' ||
      selectedGmailAccount !== 'all' ||
      selectedConversationFilter !== 'all' ||
      selectedStatusFilter !== 'all' ||
      startDate !== '' ||
      endDate !== '' ||
      searchQuery !== '' ||
      filterChip !== 'all'
    );
  }, [
    selectedCandidateId,
    selectedGmailAccount,
    selectedConversationFilter,
    selectedStatusFilter,
    startDate,
    endDate,
    searchQuery,
    filterChip,
  ]);

  // Auto-select first conversation in filtered list
  useEffect(() => {
    if (filteredConversations.length > 0) {
      if (
        !selectedConversationKey ||
        !filteredConversations.some((c) => c.key === selectedConversationKey)
      ) {
        setSelectedConversationKey(filteredConversations[0].key);
      }
    } else {
      setSelectedConversationKey(null);
    }
  }, [filteredConversations, selectedConversationKey]);

  // Currently Selected Conversation
  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.key === selectedConversationKey) || null;
  }, [conversations, selectedConversationKey]);

  // Expand latest message by default & mark unread notifications as read
  useEffect(() => {
    setIsReplying(false);
    setReplyError('');
    setReplyBody('');

    if (selectedConversation && selectedConversation.messages.length > 0) {
      const latestMsg =
        selectedConversation.messages[
        selectedConversation.messages.length - 1
        ];
      const newSet = new Set();
      if (latestMsg?.id) {
        newSet.add(latestMsg.id);
      }
      setExpandedMessageIds(newSet);

      if (
        selectedConversation.has_unread &&
        selectedConversation.unread_notification_ids.length > 0
      ) {
        selectedConversation.unread_notification_ids.forEach(async (id) => {
          try {
            await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
              method: 'POST',
            });
          } catch (err) {
            console.error('Failed to mark notification read:', err);
          }
        });
      }
    }
  }, [selectedConversationKey]);

  const toggleMessageExpand = (msgId) => {
    setExpandedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  // Open Compose Modal
  const handleOpenCompose = () => {
    setComposeError('');
    setComposeToEmail('');
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachCv(true);

    if (selectedCandidateId !== 'all') {
      setComposeFromCandId(String(selectedCandidateId));
    } else if (accountsList.length > 0) {
      setComposeFromCandId(String(accountsList[0].candidate_id));
    } else {
      setComposeFromCandId('');
    }

    setIsComposeOpen(true);
  };

  // Handle Compose Modal Send Action
  const handleSendCompose = async (e) => {
    e.preventDefault();
    if (!composeFromCandId) {
      setComposeError('Please select a sender Candidate Gmail account.');
      return;
    }
    if (!composeToEmail || !composeToEmail.includes('@')) {
      setComposeError('Please enter a valid recipient email address.');
      return;
    }
    if (!composeSubject.trim()) {
      setComposeError('Please enter an email subject.');
      return;
    }
    if (!composeBody.trim()) {
      setComposeError('Please write an email message body.');
      return;
    }

    try {
      setComposeSending(true);
      setComposeError('');

      console.log('[EMAIL SEND DEBUG] Sending compose request:', {
        candidate_id: Number(composeFromCandId),
        to_email: composeToEmail.trim(),
        subject: composeSubject.trim(),
      });

      const response = await fetch(`${API_BASE_URL}/email-tracking/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: Number(composeFromCandId),
          to_email: composeToEmail.trim(),
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          attach_cv: composeAttachCv,
        }),
      });

      const data = await response.json().catch(() => ({}));

      console.log('[EMAIL SEND DEBUG] Send response:', response.status, data);

      if (!response.ok) {
        let errorMsg = 'Failed to send email';
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (data.detail && typeof data.detail.message === 'string') {
          errorMsg = data.detail.message;
        } else if (data.detail && typeof data.detail.detail === 'string') {
          errorMsg = data.detail.detail;
        } else if (typeof data.message === 'string') {
          errorMsg = data.message;
        }
        throw new Error(errorMsg);
      }

      setIsComposeOpen(false);
      setComposeBody('');
      setComposeSubject('');
      setComposeToEmail('');
      showToast('Email sent successfully');
      await fetchData();

      if (data && data.candidate_id && data.employer_id) {
        setSelectedConversationKey(`${data.candidate_id}_${data.employer_id}`);
      }
    } catch (err) {
      console.error('[EMAIL SEND DEBUG] Compose send error:', err);
      const rawMsg = err && typeof err.message === 'string' ? err.message : 'Failed to send email via Gmail API';
      setComposeError(rawMsg);
    } finally {
      setComposeSending(false);
    }
  };

  // Handle Inline Reply Send Action
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedConversation) return;

    if (!replyBody.trim()) {
      setReplyError('Please write your reply message.');
      return;
    }

    const latestMsg = selectedConversation.latestMessage;
    const threadId = latestMsg?.gmail_message_id || null;

    const rawSubject = selectedConversation.subject || 'Application Position';
    const replySubject = rawSubject.toLowerCase().startsWith('re:')
      ? rawSubject
      : `Re: ${rawSubject}`;

    try {
      setReplySending(true);
      setReplyError('');

      console.log('[EMAIL SEND DEBUG] Sending reply request:', {
        candidate_id: selectedConversation.candidate_id,
        employer_id: selectedConversation.employer_id,
        to_email: selectedConversation.employer_email,
        thread_id: threadId,
      });

      const response = await fetch(`${API_BASE_URL}/email-tracking/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: selectedConversation.candidate_id,
          employer_id: selectedConversation.employer_id,
          to_email: selectedConversation.employer_email,
          subject: replySubject,
          body: replyBody.trim(),
          thread_id: threadId,
          attach_cv: replyAttachCv,
        }),
      });

      const data = await response.json().catch(() => ({}));

      console.log('[EMAIL SEND DEBUG] Reply response:', response.status, data);

      if (!response.ok) {
        let errorMsg = 'Failed to send reply';
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (data.detail && typeof data.detail.message === 'string') {
          errorMsg = data.detail.message;
        } else if (data.detail && typeof data.detail.detail === 'string') {
          errorMsg = data.detail.detail;
        } else if (typeof data.message === 'string') {
          errorMsg = data.message;
        }
        throw new Error(errorMsg);
      }

      setIsReplying(false);
      setReplyBody('');
      showToast('Reply sent successfully');
      await fetchData();
    } catch (err) {
      console.error('[EMAIL SEND DEBUG] Reply send error:', err);
      const rawMsg = err && typeof err.message === 'string' ? err.message : 'Failed to send reply via Gmail API';
      setReplyError(rawMsg);
    } finally {
      setReplySending(false);
    }
  };

  // Total Metrics
  const totalConversationsCount = conversations.length;
  const activeSelectedCandidate = accountsList.find(
    (a) => String(a.candidate_id) === String(composeFromCandId)
  );

  const formatTimestamp = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    if (isToday) {
      return dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return dateObj.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const getCvFilename = (path, candName) => {
    if (path) {
      const clean = path.split('/').pop().split('\\').pop();
      if (clean && clean.endsWith('.pdf')) return clean;
    }
    return `${(candName || 'Candidate').replace(/\s+/g, '_')}_CV.pdf`;
  };

  // Reusable style for filter select dropdowns with left icon spacing
  const filterSelectStyleWithIcon = {
    width: '100%',
    padding: '7px 12px 7px 32px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    color: '#334155',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  };

  const filterInputDateStyleWithIcon = {
    width: '100%',
    padding: '6px 10px 6px 30px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    color: '#334155',
    backgroundColor: '#ffffff',
    outline: 'none',
  };

  const iconInInputStyle = {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    pointerEvents: 'none',
  };

  return (
    <div
      className="content-container"
      style={{ maxWidth: '100%', padding: '24px 28px 40px' }}
    >
      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '18px',
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Inbox size={28} className="text-blue-600" />
            Email Tracking
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            View, write, reply, and track emails across connected candidate Gmail accounts
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastSynced && (
            <span
              style={{
                fontSize: '13px',
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Clock size={14} /> Last synced: {lastSynced}
            </span>
          )}

          {/* COMPOSE EMAIL BUTTON */}
          <button
            type="button"
            onClick={handleOpenCompose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> Compose Email
          </button>
        </div>
      </div>

      {/* GLOBAL FILTER BAR WITH OUTLINE ICONS */}
      <div
        className="global-filter-bar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* 1. Candidate Filter with Users Outline Icon */}
        <div style={{ position: 'relative', minWidth: '160px', flex: '1 1 150px' }}>
          <Users size={14} style={iconInInputStyle} />
          <select
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            style={filterSelectStyleWithIcon}
          >
            <option value="all">All Candidates</option>
            {accountsList.map((acc) => (
              <option key={acc.candidate_id} value={acc.candidate_id}>
                {acc.candidate_name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Gmail Account Filter with Mail Outline Icon */}
        <div style={{ position: 'relative', minWidth: '170px', flex: '1 1 160px' }}>
          <Mail size={14} style={iconInInputStyle} />
          <select
            value={selectedGmailAccount}
            onChange={(e) => setSelectedGmailAccount(e.target.value)}
            style={filterSelectStyleWithIcon}
          >
            <option value="all">All Accounts</option>
            {accountsList.map((acc) => (
              <option key={acc.candidate_id} value={acc.gmail_email}>
                {acc.gmail_email}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Conversation Filter with MessageCircle Outline Icon */}
        <div style={{ position: 'relative', minWidth: '160px', flex: '1 1 150px' }}>
          <MessageCircle size={14} style={iconInInputStyle} />
          <select
            value={selectedConversationFilter}
            onChange={(e) => setSelectedConversationFilter(e.target.value)}
            style={filterSelectStyleWithIcon}
          >
            <option value="all">All Conversations</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="with_replies">With Replies</option>
            <option value="outgoing">Outgoing Only</option>
            <option value="incoming">Incoming / Replies</option>
            <option value="attachments">Has Attachments</option>
          </select>
        </div>

        {/* 4. Status Filter with Flag Outline Icon */}
        <div style={{ position: 'relative', minWidth: '130px', flex: '1 1 120px' }}>
          <Flag size={14} style={iconInInputStyle} />
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            style={filterSelectStyleWithIcon}
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="failed">Failed</option>
            <option value="unread">Unread</option>
          </select>
        </div>

        {/* 5. Date Range Filter with Calendar Outline Icons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: '240px',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Calendar size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
              style={filterInputDateStyleWithIcon}
            />
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
          <div style={{ position: 'relative', flex: 1 }}>
            <Calendar size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
              style={filterInputDateStyleWithIcon}
            />
          </div>
        </div>

        {/* 6. Search in Results with Magnifying Glass Outline Icon */}
        <div
          style={{
            position: 'relative',
            minWidth: '180px',
            flex: '2 1 180px',
          }}
        >
          <Search
            size={14}
            style={iconInInputStyle}
          />
          <input
            type="text"
            placeholder="Search in results..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#f8fafc',
            }}
          />
        </div>

        {/* 7. Refresh Outline Icon Button & Reset Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleRefreshKeepFilters}
            disabled={syncing || loading}
            title="Refresh data (preserves current filters)"
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw
              size={15}
              className={syncing || loading ? 'spin' : ''}
            />
          </button>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3-PANE OUTLOOK-STYLE LAYOUT */}
      <div
        className="email-tracking-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 360px 1fr',
          gap: '16px',
          height: 'calc(100vh - 240px)',
          minHeight: '640px',
        }}
      >
        {/* PANE 1: LEFT ACCOUNTS PANE */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
            }}
          >
            <h3
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              ACCOUNTS
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {/* All Mail Option */}
            <div
              onClick={() => setSelectedCandidateId('all')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor:
                  selectedCandidateId === 'all' ? '#eff6ff' : 'transparent',
                color: selectedCandidateId === 'all' ? '#1d4ed8' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <Inbox
                  size={18}
                  style={{
                    color: selectedCandidateId === 'all' ? '#2563eb' : '#64748b',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: selectedCandidateId === 'all' ? '600' : '500',
                  }}
                >
                  All Mail
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor:
                    selectedCandidateId === 'all' ? '#2563eb' : '#f1f5f9',
                  color: selectedCandidateId === 'all' ? '#ffffff' : '#64748b',
                }}
              >
                {totalConversationsCount}
              </span>
            </div>

            {/* Candidate Accounts Section Header */}
            <div
              style={{
                padding: '8px 12px 4px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#94a3b8',
                letterSpacing: '0.05em',
              }}
            >
              CANDIDATE ACCOUNTS
            </div>

            {accountsList.length === 0 ? (
              <div
                style={{
                  padding: '20px 12px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '12px',
                }}
              >
                No connected candidate Gmail accounts
              </div>
            ) : (
              accountsList.map((acc) => {
                const isSelected =
                  String(selectedCandidateId) === String(acc.candidate_id);
                return (
                  <div
                    key={acc.candidate_id}
                    onClick={() =>
                      setSelectedCandidateId(String(acc.candidate_id))
                    }
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      border: isSelected
                        ? '1px solid #bfdbfe'
                        : '1px solid transparent',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '2px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? '#2563eb' : '#cbd5e1',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(acc.candidate_name)}
                        </div>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: isSelected ? '#1e40af' : '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {acc.candidate_name}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {acc.unreadCount > 0 && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#ef4444',
                              display: 'inline-block',
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '1px 6px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b',
                          }}
                        >
                          {acc.conversationCount}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingLeft: '36px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {acc.gmail_email}
                      </span>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: acc.is_active
                            ? '#16a34a'
                            : '#94a3b8',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                        title={acc.is_active ? 'Connected' : 'Inactive'}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Account Footer Summary */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            <div style={{ fontWeight: '600', color: '#334155' }}>
              Total Conversations
            </div>
            <div>
              {totalConversationsCount} conversations across{' '}
              {accountsList.length} accounts
            </div>
          </div>
        </div>

        {/* PANE 2: MIDDLE CONVERSATION LIST PANE */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {/* Header & Filter Chips */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                All Emails
              </strong>
              <span
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: '500',
                }}
              >
                {filteredConversations.length} conversations
              </span>
            </div>

            {/* Filter Chips */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '2px',
              }}
            >
              {[
                { id: 'all', label: 'All' },
                { id: 'incoming', label: 'Incoming' },
                { id: 'outgoing', label: 'Outgoing' },
                { id: 'unread', label: 'Unread' },
                { id: 'attachments', label: 'Attachments' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterChip(chip.id)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    border: '1px solid',
                    borderColor:
                      filterChip === chip.id ? '#2563eb' : '#e2e8f0',
                    backgroundColor:
                      filterChip === chip.id ? '#2563eb' : '#ffffff',
                    color: filterChip === chip.id ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Thread List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}
              >
                <Mail
                  size={36}
                  strokeWidth={1.5}
                  style={{ marginBottom: '8px', opacity: 0.5 }}
                />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                  {conversations.length === 0
                    ? 'No email conversations yet'
                    : 'No conversations match your filters'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                  {conversations.length === 0
                    ? 'Use the "+ Compose Email" button to send an email to an employer.'
                    : 'Try adjusting your filter selections or search terms.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversationKey === conv.key;
                const latest = conv.latestMessage;
                const isIncoming = latest?.direction === 'incoming';

                return (
                  <div
                    key={conv.key}
                    onClick={() => setSelectedConversationKey(conv.key)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isSelected
                        ? '#f0f9ff'
                        : conv.has_unread
                          ? '#f8fafc'
                          : '#ffffff',
                      borderLeft: isSelected
                        ? '4px solid #2563eb'
                        : conv.has_unread
                          ? '4px solid #0284c7'
                          : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Top Header: Employer Name & Timestamp */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '3px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        {conv.has_unread && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#0284c7',
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontWeight: conv.has_unread ? '700' : '600',
                            fontSize: '13px',
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conv.employer_name}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                          fontWeight: '500',
                        }}
                      >
                        {formatTimestamp(conv.lastTimestamp)}
                      </span>
                    </div>

                    {/* Candidate Badge & Employer Email */}
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                        }}
                      >
                        {conv.candidate_name}
                      </span>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.employer_email}
                      </span>
                    </div>

                    {/* Subject Line */}
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: conv.has_unread ? '700' : '600',
                        color: '#1e293b',
                        marginBottom: '3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {conv.subject}
                    </div>

                    {/* Latest Message Preview */}
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '6px',
                      }}
                    >
                      {latest?.error_message ||
                        'Outreach email communication thread...'}
                    </div>

                    {/* Bottom Row: Badges & Thread Counter */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isIncoming ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#ecfdf5',
                              color: '#047857',
                              fontSize: '10px',
                              fontWeight: '700',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            <ArrowDownLeft size={10} /> INCOMING / REPLY
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '10px',
                              fontWeight: '700',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            <ArrowUpRight size={10} /> OUTGOING
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '10px',
                            color: '#64748b',
                            fontWeight: '600',
                          }}
                        >
                          {conv.messageCount}{' '}
                          {conv.messageCount === 1 ? 'msg' : 'messages'}
                        </span>
                      </div>

                      {conv.has_attachments && (
                        <Paperclip
                          size={13}
                          style={{ color: '#64748b' }}
                          title="Has attachment"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANE 3: RIGHT OUTLOOK-STYLE CONVERSATION VIEW & REPLY EDITOR */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {!selectedConversation ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                padding: '40px',
              }}
            >
              <Inbox
                size={48}
                strokeWidth={1.2}
                style={{ marginBottom: '12px', opacity: 0.4 }}
              />
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '4px',
                }}
              >
                Select a conversation
              </h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Choose an email thread from the middle list to view full messages,
                reply, or track details.
              </p>
            </div>
          ) : (
            <>
              {/* Header Bar */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#0f172a',
                      marginBottom: '4px',
                    }}
                  >
                    {selectedConversation.subject}
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      color: '#64748b',
                    }}
                  >
                    <span>
                      Employer:{' '}
                      <strong style={{ color: '#0f172a' }}>
                        {selectedConversation.employer_name}
                      </strong>{' '}
                      ({selectedConversation.employer_email})
                    </span>
                    <span>•</span>
                    <span>
                      Candidate:{' '}
                      <strong style={{ color: '#0f172a' }}>
                        {selectedConversation.candidate_name}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Gmail:{' '}
                      <strong style={{ color: '#047857' }}>
                        {selectedConversation.candidate_gmail}
                      </strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* INLINE REPLY TRIGGER BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplying((prev) => !prev);
                      setReplyError('');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    <CornerUpLeft size={14} /> Reply
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/email-logs')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#2563eb',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    View in Email Logs <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              {/* Message Cards Scrollable List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                }}
              >
                {(selectedConversation.messages || []).map((msg, index) => {
                  const isIncoming = msg.direction === 'incoming';
                  const isExpanded = expandedMessageIds.has(msg.id);

                  // Collapsed Header View
                  if (!isExpanded) {
                    return (
                      <div
                        key={msg.id || index}
                        onClick={() => toggleMessageExpand(msg.id)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '10px 16px',
                          marginBottom: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: isIncoming ? '#dcfce7' : '#e0f2fe',
                              color: isIncoming ? '#15803d' : '#1d4ed8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '11px',
                            }}
                          >
                            {isIncoming
                              ? getInitials(selectedConversation.employer_name)
                              : getInitials(selectedConversation.candidate_name)}
                          </div>

                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                            {isIncoming
                              ? selectedConversation.employer_name
                              : `You (${selectedConversation.candidate_name})`}
                          </strong>

                          {isIncoming ? (
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                fontSize: '10px',
                                fontWeight: '700',
                              }}
                            >
                              INCOMING / REPLY
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#e0f2fe',
                                color: '#1d4ed8',
                                fontSize: '10px',
                                fontWeight: '700',
                              }}
                            >
                              OUTGOING / SENT
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {msg.sent_at || msg.created_at
                              ? new Date(
                                msg.sent_at || msg.created_at
                              ).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              : ''}
                          </span>
                          <ChevronDown size={16} style={{ color: '#64748b' }} />
                        </div>
                      </div>
                    );
                  }

                  // Expanded Full Message View
                  return (
                    <div
                      key={msg.id || index}
                      style={{
                        backgroundColor: '#ffffff',
                        border: isIncoming
                          ? '1px solid #bbf7d0'
                          : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '18px 20px',
                        marginBottom: '14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      {/* Message Card Header */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleMessageExpand(msg.id)}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: isIncoming ? '#dcfce7' : '#e0f2fe',
                              color: isIncoming ? '#15803d' : '#1d4ed8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            {isIncoming
                              ? getInitials(selectedConversation.employer_name)
                              : getInitials(selectedConversation.candidate_name)}
                          </div>

                          <div>
                            <strong
                              style={{
                                fontSize: '14px',
                                color: '#0f172a',
                                display: 'block',
                              }}
                            >
                              {isIncoming
                                ? selectedConversation.employer_name
                                : `You (${selectedConversation.candidate_name})`}
                            </strong>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {isIncoming
                                ? msg.employer_email ||
                                selectedConversation.employer_email
                                : msg.gmail_email ||
                                selectedConversation.candidate_gmail}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <div style={{ textAlign: 'right' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#94a3b8',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            >
                              {msg.sent_at || msg.created_at
                                ? new Date(
                                  msg.sent_at || msg.created_at
                                ).toLocaleString([], {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                                : ''}
                            </span>

                            {isIncoming ? (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#dcfce7',
                                  color: '#15803d',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                }}
                              >
                                INCOMING / REPLY
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#e0f2fe',
                                  color: '#1d4ed8',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                }}
                              >
                                OUTGOING / SENT
                              </span>
                            )}
                          </div>

                          <ChevronUp size={16} style={{ color: '#64748b' }} />
                        </div>
                      </div>

                      {/* Message Body Content */}
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#334155',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-line',
                          paddingTop: '10px',
                          borderTop: '1px solid #f1f5f9',
                        }}
                      >
                        {msg.body ||
                          msg.snippet ||
                          msg.error_message ||
                          (isIncoming
                            ? `Application update for ${selectedConversation.candidate_name}.`
                            : `Outreach email sent for candidate ${selectedConversation.candidate_name}.`)}
                      </div>

                      {/* Attachments Section */}
                      {!isIncoming && (
                        <div
                          style={{
                            marginTop: '14px',
                            paddingTop: '12px',
                            borderTop: '1px dashed #e2e8f0',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#64748b',
                              marginBottom: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            ATTACHMENTS (1)
                          </div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#1e293b',
                            }}
                          >
                            <FileText size={16} style={{ color: '#2563eb' }} />
                            <span>
                              {getCvFilename(
                                selectedConversation.candidate_cv_path,
                                selectedConversation.candidate_name
                              )}
                            </span>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#e2e8f0',
                                color: '#475569',
                                fontSize: '10px',
                                fontWeight: '700',
                              }}
                            >
                              PDF
                            </span>

                            <a
                              href={
                                selectedConversation.candidate_cv_path
                                  ? `${API_BASE_URL}/${selectedConversation.candidate_cv_path}`
                                  : '#'
                              }
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: '#2563eb',
                                textDecoration: 'none',
                                marginLeft: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Download size={13} /> Open/Download
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Quick Reply Button on Card */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginTop: '12px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplying(true);
                            setReplyError('');
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
                          <CornerUpLeft size={13} /> Reply to message
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* INLINE REPLY EDITOR */}
                {isReplying && (
                  <form
                    onSubmit={handleSendReply}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '2px solid #2563eb',
                      borderRadius: '12px',
                      padding: '18px 20px',
                      marginTop: '10px',
                      marginBottom: '20px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CornerUpLeft size={16} style={{ color: '#2563eb' }} />
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          Replying to {selectedConversation.employer_name}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          ({selectedConversation.employer_email})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsReplying(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {replyError && (() => {
                      const replyErrStr = String(replyError || '');
                      const isScopeError =
                        replyErrStr.includes('GMAIL_SEND_SCOPE_MISSING') ||
                        replyErrStr.includes('insufficientPermissions') ||
                        replyErrStr.includes('403') ||
                        replyErrStr.includes('permission');

                      return (
                        <div
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            borderRadius: '8px',
                            fontSize: '13px',
                            marginBottom: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>
                              {isScopeError
                                ? 'Gmail sending permission is missing. Please reconnect this Gmail account to enable sending.'
                                : replyErrStr}
                            </span>
                          </div>

                          {isScopeError && (
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  const cid = selectedConversation?.candidate_id;
                                  if (cid) {
                                    window.open(`${API_BASE_URL}/gmail-oauth/connect/${cid}`, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 14px',
                                  backgroundColor: '#dc2626',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                <LinkIcon size={14} />
                                Reconnect Gmail Account
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div style={{ marginBottom: '12px', fontSize: '12px', color: '#475569' }}>
                      <strong>From Account:</strong> {selectedConversation.candidate_name} ({selectedConversation.candidate_gmail})
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <textarea
                        rows={4}
                        placeholder="Write your email reply..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={replyAttachCv}
                          onChange={(e) => setReplyAttachCv(e.target.checked)}
                        />
                        Attach Candidate CV ({getCvFilename(selectedConversation.candidate_cv_path, selectedConversation.candidate_name)})
                      </label>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setIsReplying(false)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={replySending}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: 'none',
                            cursor: replySending ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Send size={13} />
                          {replySending ? 'Sending Reply...' : 'Send Reply'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom Conversation Metadata Footer */}
              <div
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '12px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong>Thread Info:</strong> Candidate #
                  {selectedConversation.candidate_id} • Employer #
                  {selectedConversation.employer_id} •{' '}
                  {selectedConversation.messageCount} messages • Thread ID:{' '}
                  <code style={{ fontSize: '11px', color: '#0f172a' }}>
                    {selectedConversation.latestMessage?.gmail_message_id ||
                      'thread_auto'}
                  </code>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => navigate('/email-logs')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    View in Email Logs →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* COMPOSE EMAIL MODAL */}
      {isComposeOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '650px',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: '700',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: 0,
                }}
              >
                <Send size={18} style={{ color: '#2563eb' }} />
                Compose Email
              </h2>

              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={handleSendCompose}
              style={{ padding: '24px', overflowY: 'auto', flex: 1 }}
            >
              {composeError && (() => {
                const composeErrStr = String(composeError || '');
                const isScopeError =
                  composeErrStr.includes('GMAIL_SEND_SCOPE_MISSING') ||
                  composeErrStr.includes('insufficientPermissions') ||
                  composeErrStr.includes('403') ||
                  composeErrStr.includes('permission');

                return (
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: '8px',
                      fontSize: '13px',
                      marginBottom: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>
                        {isScopeError
                          ? 'Gmail sending permission is missing. Please reconnect this Gmail account to enable sending.'
                          : composeErrStr}
                      </span>
                    </div>

                    {isScopeError && (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            if (composeFromCandId) {
                              window.open(`${API_BASE_URL}/gmail-oauth/connect/${composeFromCandId}`, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          <LinkIcon size={14} />
                          Reconnect Gmail Account
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* From Account Selector */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  From (Connected Candidate Gmail Account) *
                </label>
                <select
                  value={composeFromCandId}
                  onChange={(e) => setComposeFromCandId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">Select Candidate Gmail Account...</option>
                  {accountsList.map((acc) => (
                    <option key={acc.candidate_id} value={acc.candidate_id}>
                      {acc.candidate_name} ({acc.gmail_email})
                    </option>
                  ))}
                </select>

                {activeSelectedCandidate && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <User size={14} />
                    <span>
                      Sending as{' '}
                      <strong>{activeSelectedCandidate.candidate_name}</strong> via{' '}
                      <code>{activeSelectedCandidate.gmail_email}</code>
                    </span>
                  </div>
                )}
              </div>

              {/* To Recipient Field with Employer Autocomplete */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  To (Employer Email Address) *
                </label>
                <input
                  type="email"
                  placeholder="e.g. hr@abchealthcare.com"
                  value={composeToEmail}
                  onChange={(e) => setComposeToEmail(e.target.value)}
                  list="employers-list-options"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <datalist id="employers-list-options">
                  {employers.map((emp) => (
                    <option key={emp.id} value={emp.email}>
                      {emp.service_name
                        ? `${emp.service_name} (${emp.email})`
                        : emp.email}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Subject Field */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Application for Healthcare Assistant Position"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Message Body Field */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Message *
                </label>
                <textarea
                  rows={6}
                  placeholder="Write your email body message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: '1.5',
                  }}
                />
              </div>

              {/* Attachments Checkbox */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={composeAttachCv}
                    onChange={(e) => setComposeAttachCv(e.target.checked)}
                  />
                  Attach candidate's uploaded CV file
                </label>
              </div>

              {/* Modal Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={composeSending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 22px',
                    borderRadius: '8px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: composeSending ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  <Send size={15} />
                  {composeSending ? 'Sending Email...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
