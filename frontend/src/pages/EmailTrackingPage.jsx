import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  ChevronRight,
  Download,
  Plus,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  CornerUpLeft,
  CornerUpRight,
  User,
  Users,
  Users2,
  MessageCircle,
  Flag,
  Calendar,
  Building2,
  Check,
  RotateCcw,
  Link as LinkIcon,
  Star,
  Trash2,
  Archive,
  SlidersHorizontal,
  Smile,
  Ban,
  MoreHorizontal,
  CheckSquare,
  Type,
  Bell,
  HelpCircle
} from 'lucide-react';

import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();

const actionButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#475569',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const headerTagStyle = (bg, color) => ({
  backgroundColor: bg,
  color: color,
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 700,
});

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

  // 3-Column Accordion & Folder State
  const [expandedCandidateId, setExpandedCandidateId] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [starredEmailIds, setStarredEmailIds] = useState(new Set());
  const [composerTab, setComposerTab] = useState('reply');

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

  // ATTACHMENT STATE & REFS
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [composeAttachments, setComposeAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const replyFormRef = useRef(null);
  const replyTextareaRef = useRef(null);

  // Auto Scroll & Focus when Reply opens
  useEffect(() => {
    if (isReplying) {
      setReplyAttachments([]);
      setTimeout(() => {
        replyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        replyTextareaRef.current?.focus();
      }, 50);
    }
  }, [isReplying]);

  // Attachment File Upload Helper (PDF, DOCX, Images, etc.)
  const handleFileUpload = async (e, isReply) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingAttachment(true);
    setError('');

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE_URL}/email-tracking/upload-attachment`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to upload file');

        const item = {
          filename: data.filename || file.name,
          file_path: data.file_path,
          size: data.size || file.size,
        };

        if (isReply) {
          setReplyAttachments((prev) => [...prev, item]);
        } else {
          setComposeAttachments((prev) => [...prev, item]);
        }
      } catch (err) {
        console.error('Attachment upload error:', err);
        showToast(`Attachment error: ${err.message}`);
      }
    }

    setUploadingAttachment(false);
    e.target.value = '';
  };

  const removeAttachment = (index, isReply) => {
    if (isReply) {
      setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
    } else {
      setComposeAttachments((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Fetch required email tracking data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [logsRes, notifRes, accountsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/email-logs`),
        fetch(`${API_BASE_URL}/notifications`),
        fetch(`${API_BASE_URL}/gmail-accounts`),
      ]);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(Array.isArray(logsData) ? logsData : []);
      }
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(Array.isArray(notifData) ? notifData : []);
      }
      if (accountsRes.ok) {
        const accData = await accountsRes.json();
        setGmailAccounts(Array.isArray(accData) ? accData : []);
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
      result = result.filter((c) => {
        const d = c.lastTimestamp instanceof Date ? c.lastTimestamp : new Date(c.lastTimestamp);
        return !isNaN(d.getTime()) && d.getTime() >= startMs;
      });
    }
    if (endDate) {
      const endMs = new Date(endDate).setHours(23, 59, 59, 999);
      result = result.filter((c) => {
        const d = c.lastTimestamp instanceof Date ? c.lastTimestamp : new Date(c.lastTimestamp);
        return !isNaN(d.getTime()) && d.getTime() <= endMs;
      });
    }

    // 7. Search in Results
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.candidate_name || '').toLowerCase().includes(q) ||
          (c.candidate_gmail || '').toLowerCase().includes(q) ||
          (c.employer_name || '').toLowerCase().includes(q) ||
          (c.employer_email || '').toLowerCase().includes(q) ||
          (c.subject || '').toLowerCase().includes(q) ||
          c.messages.some((m) =>
            (m.error_message || '').toLowerCase().includes(q)
          )
      );
    }

    // Sort conversations
    result.sort((a, b) => {
      const tA = (a.lastTimestamp instanceof Date ? a.lastTimestamp : new Date(a.lastTimestamp)).getTime() || 0;
      const tB = (b.lastTimestamp instanceof Date ? b.lastTimestamp : new Date(b.lastTimestamp)).getTime() || 0;
      if (sortBy === 'newest') {
        return tB - tA;
      } else {
        return tA - tB;
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

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.has_unread).length,
    [conversations]
  );
  const incomingCount = useMemo(
    () => conversations.filter((c) => c.latestMessage?.direction === 'incoming').length,
    [conversations]
  );
  const outgoingCount = useMemo(
    () => conversations.filter((c) => c.latestMessage?.direction === 'outgoing').length,
    [conversations]
  );

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
          custom_attachment_paths: composeAttachments.map((a) => a.file_path),
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
      setComposeAttachments([]);
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
          custom_attachment_paths: replyAttachments.map((a) => a.file_path),
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

  const formatTimestamp = (rawDate) => {
    if (!rawDate) return '';
    const dateObj = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (isNaN(dateObj.getTime())) return '';
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

  const stripHtmlTags = (str) => {
    if (!str) return '';
    return str
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

      {/* UNIFIED PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '14px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Mail size={22} color="#2563eb" />
            Email Tracking
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
            View, send, reply and track all candidate emails
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Sync Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            <span>
              <strong>Email sync active</strong>
            </span>
            <button
              type="button"
              onClick={fetchData}
              title="Sync Emails"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '2px', marginLeft: '4px' }}
            >
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCompose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Plus size={16} /> Compose Email
          </button>
        </div>
      </div>

      {/* 3-COLUMN MAIN CONTAINER */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: '620px', height: 'calc(100vh - 180px)' }}>

        {/* ================= COLUMN 1: CANDIDATES LIST PANE ================= */}
        <div style={{ width: '310px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Column 1 Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Candidates ({accountsList.length})
              </h3>
              <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <SlidersHorizontal size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={candidateSearchQuery}
                onChange={(e) => setCandidateSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%' }}
              />
            </div>
          </div>

          {/* Candidates Accordion List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {accountsList
              .filter((cand) =>
                candidateSearchQuery
                  ? cand.candidate_name.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
                    cand.gmail_email.toLowerCase().includes(candidateSearchQuery.toLowerCase())
                  : true
              )
              .map((cand) => {
                const isExpanded = expandedCandidateId === cand.candidate_id;
                const isSelectedCand = String(selectedCandidateId) === String(cand.candidate_id);

                return (
                  <div key={cand.candidate_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    {/* Candidate Header Item */}
                    <div
                      onClick={() => {
                        setExpandedCandidateId(isExpanded ? null : cand.candidate_id);
                        setSelectedCandidateId(cand.candidate_id);
                      }}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        background: isSelectedCand ? '#eff6ff' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span style={{ color: '#64748b' }}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>

                      {/* Avatar */}
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                        {getInitials(cand.candidate_name)}
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whitespace: 'nowrap' }}>{cand.candidate_name}</span>
                          <span style={{ fontSize: '11px', color: '#2563eb', background: '#dbeafe', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                            {cand.conversationCount || 0}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whitespace: 'nowrap' }}>{cand.gmail_email}</span>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                        </div>
                      </div>
                    </div>

                    {/* Sub-Folders List (When Expanded) */}
                    {isExpanded && (
                      <div style={{ paddingLeft: '42px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '6px', background: '#f8fafc' }}>
                        {[
                          { id: 'inbox', label: 'Inbox', icon: Inbox, count: cand.conversationCount || 0 },
                          { id: 'sent', label: 'Sent', icon: Send, count: null },
                          { id: 'junk', label: 'Junk Email', icon: Ban, count: null },
                          { id: 'drafts', label: 'Drafts', icon: FileText, count: null },
                          { id: 'deleted', label: 'Deleted Items', icon: Trash2, count: null },
                          { id: 'archive', label: 'Archive', icon: Archive, count: null },
                          { id: 'outbox', label: 'Outbox', icon: Send, count: null },
                          { id: 'scheduled', label: 'Scheduled', icon: Clock, count: null },
                        ].map((f) => {
                          const FIcon = f.icon;
                          const isFolderSelected = selectedFolder === f.id;
                          return (
                            <div
                              key={f.id}
                              onClick={() => setSelectedFolder(f.id)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                background: isFolderSelected ? '#dbeafe' : 'transparent',
                                color: isFolderSelected ? '#1e40af' : '#475569',
                                fontSize: '12px',
                                fontWeight: isFolderSelected ? 600 : 500,
                                marginBottom: '2px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FIcon size={14} color={isFolderSelected ? '#2563eb' : '#64748b'} />
                                <span>{f.label}</span>
                              </div>
                              {f.count !== null && (
                                <span style={{ fontSize: '11px', opacity: 0.8 }}>{f.count}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* ================= COLUMN 2: EMAILS THREADS LIST PANE ================= */}
        <div style={{ width: '370px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Column 2 Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Inbox ({filteredConversations.length})
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', outline: 'none', background: '#ffffff', color: '#475569' }}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>

                <button style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#64748b' }}>
                  <SlidersHorizontal size={14} />
                </button>
              </div>
            </div>

            {/* Filter Pills Bar */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${conversations.length})` },
                { id: 'unread', label: `Unread (${unreadCount})` },
                { id: 'incoming', label: `Incoming (${incomingCount})` },
                { id: 'outgoing', label: `Outgoing (${outgoingCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterChip(tab.id)}
                  style={{
                    border: filterChip === tab.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: filterChip === tab.id ? '#2563eb' : '#ffffff',
                    color: filterChip === tab.id ? '#ffffff' : '#475569',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Cards List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Inbox size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>No emails found in this folder</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelectedConv = conv.key === selectedConversationKey;
                const avatarColor = '#2563eb';

                return (
                  <div
                    key={conv.key}
                    onClick={() => setSelectedConversationKey(conv.key)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelectedConv ? '#eff6ff' : conv.has_unread ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input type="checkbox" style={{ marginTop: '3px', accentColor: '#2563eb' }} onClick={(e) => e.stopPropagation()} />

                      {/* Sender Avatar */}
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: avatarColor, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                        {getInitials(conv.employer_name)}
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: conv.has_unread ? 700 : 600, fontSize: '13px', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whitespace: 'nowrap' }}>
                            {conv.employer_name || 'Donotreply'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                            {formatTimestamp(conv.lastTimestamp)}
                          </span>
                        </div>

                        <div style={{ fontWeight: conv.has_unread ? 600 : 500, fontSize: '12px', color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whitespace: 'nowrap', marginBottom: '4px' }}>
                          {conv.subject}
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whitespace: 'nowrap', marginBottom: '6px' }}>
                          {stripHtmlTags(conv.latestMessage?.snippet || conv.latestMessage?.body) || 'No message content preview'}
                        </div>

                        {/* Tag Badges & Star */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            Employer
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStarredEmailIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(conv.key)) next.delete(conv.key);
                                else next.add(conv.key);
                                return next;
                              });
                            }}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: starredEmailIds.has(conv.key) ? '#f59e0b' : '#cbd5e1' }}
                          >
                            <Star size={14} fill={starredEmailIds.has(conv.key) ? '#f59e0b' : 'none'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUMN 3: EMAIL READING & RICH COMPOSER PANE ================= */}
        <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedConversation ? (
            <>
              {/* Top Toolbar */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setIsReplying(true)} style={actionButtonStyle}>
                    <CornerUpLeft size={15} /> Reply
                  </button>
                  <button onClick={() => setIsReplying(true)} style={actionButtonStyle}>
                    <Users2 size={15} /> Reply all
                  </button>
                  <button onClick={() => setIsReplying(true)} style={actionButtonStyle}>
                    <CornerUpRight size={15} /> Forward
                  </button>
                  <button style={actionButtonStyle}>
                    <Archive size={15} /> Archive
                  </button>
                  <button style={{ ...actionButtonStyle, color: '#dc2626' }}>
                    <Trash2 size={15} /> Delete
                  </button>
                  <button style={actionButtonStyle}>
                    <MoreHorizontal size={15} />
                  </button>
                </div>
              </div>

              {/* Email Subject & Category Header */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', lineHeight: '1.3' }}>
                    {selectedConversation.subject}
                  </h2>
                  <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1' }}>
                    <Star size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={headerTagStyle('#f1f5f9', '#475569')}>Inbox</span>
                  <span style={headerTagStyle('#dbeafe', '#1d4ed8')}>Employer</span>
                  <span style={headerTagStyle('#e0e7ff', '#4338ca')}>{selectedConversation.candidate_name}</span>
                </div>
              </div>

              {/* Message Body & Sender Info Scroll Container */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                
                {/* Sender Details Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>
                      {getInitials(selectedConversation.employer_name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                        {selectedConversation.employer_name} <span style={{ fontWeight: 400, color: '#64748b', fontSize: '12px' }}>&lt;{selectedConversation.employer_email}&gt;</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>to me ▾</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Thu, 5 Sep 2025, 10:47 AM
                  </div>
                </div>

                {/* Email Content Body */}
                <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.6', marginBottom: '24px' }}>
                  {selectedConversation.latestMessage?.body ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedConversation.latestMessage.body.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <div>
                      <p>Dear Candidate,</p>
                      <p>We are pleased to invite you to apply for the position at {selectedConversation.employer_name}.</p>
                      <p>Please click the link below to complete your application:</p>
                      <p><a href="#" style={{ color: '#2563eb' }}>https://visaliv.com/application-link</a></p>
                      <p>Kind regards,<br />{selectedConversation.employer_name} Recruitment Team</p>
                    </div>
                  )}
                </div>

                {/* Attachments Box */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
                    Attachments (1)
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '10px' }}>
                      PDF
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Job_Description.pdf</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>245 KB</div>
                    </div>
                    <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#475569', marginLeft: '12px' }}>
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Gmail-Style Rich Composer Pane */}
              <div style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '16px 20px' }}>
                
                {/* Composer Header Tabs */}
                <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => setComposerTab('reply')}
                    style={{ border: 'none', background: 'none', fontSize: '13px', fontWeight: 700, color: composerTab === 'reply' ? '#2563eb' : '#64748b', cursor: 'pointer', paddingBottom: '4px', borderBottom: composerTab === 'reply' ? '2px solid #2563eb' : 'none' }}
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => setComposerTab('forward')}
                    style={{ border: 'none', background: 'none', fontSize: '13px', fontWeight: 700, color: composerTab === 'forward' ? '#2563eb' : '#64748b', cursor: 'pointer', paddingBottom: '4px', borderBottom: composerTab === 'forward' ? '2px solid #2563eb' : 'none' }}
                  >
                    Forward
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  ref={replyTextareaRef}
                  rows={3}
                  placeholder="Write your reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', outline: 'none', resize: 'none', marginBottom: '12px' }}
                />

                {/* Composer Bottom Action Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Paperclip size={18} />
                      <input type="file" multiple onChange={(e) => handleFileUpload(e, true)} style={{ display: 'none' }} />
                    </label>
                    <Smile size={18} style={{ cursor: 'pointer' }} />
                    <LinkIcon size={18} style={{ cursor: 'pointer' }} />
                    <Type size={18} style={{ cursor: 'pointer' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={handleSendReply}
                      disabled={replySending}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 20px',
                        borderRadius: '8px 0 0 8px',
                        background: '#2563eb',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '13px',
                        border: 'none',
                        cursor: replySending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Send
                    </button>
                    <button
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '8px 8px',
                        borderRadius: '0 8px 8px 0',
                        background: '#1d4ed8',
                        color: '#ffffff',
                        border: 'none',
                        borderLeft: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8' }}>
              Select an email thread to read
            </div>
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

              {/* Attachments Section */}
              <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#334155',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={composeAttachCv}
                        onChange={(e) => setComposeAttachCv(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                      />
                      Attach candidate's uploaded CV file
                    </label>

                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid #2563eb',
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <Paperclip size={15} />
                      {uploadingAttachment ? 'Uploading File...' : 'Attach File (PDF, DOCX, Image)'}
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.txt"
                        onChange={(e) => handleFileUpload(e, false)}
                        style={{ display: 'none' }}
                        disabled={uploadingAttachment}
                      />
                    </label>
                  </div>
                </div>

                {/* Custom Uploaded Attachments List */}
                {composeAttachments.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {composeAttachments.map((att, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #93c5fd',
                          color: '#1e40af',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        <Paperclip size={13} />
                        {att.filename} ({Math.round(att.size / 1024)} KB)
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx, false)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: '0 2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
