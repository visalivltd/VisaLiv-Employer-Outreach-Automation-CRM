import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  FileSpreadsheet,
  X,
  ExternalLink,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  Mail,
  Users,
  LayoutGrid,
  Check,
} from 'lucide-react';

import { getApiUrl } from '../config/api';

const rawApiUrl = getApiUrl();
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const emptyForm = {
  service_name: '',
  email: '',
  country: '',
  industry: '',
  service_website: '',
  hr_email: '',
  recruitment_email: '',
  careers_email: '',
  manager_email: '',
  info_email: '',
  general_email: '',
  primary_email_type: 'Manual',
  is_active: true,
};

const INITIAL_DOMAINS = [
  { id: 'Healthcare', label: 'Healthcare', icon: '❤️', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', description: 'Medical & Healthcare Services', isActive: true },
  { id: 'IT / Software', label: 'IT / Software', icon: '</>', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', description: 'Technology & Software Engineering', isActive: true },
  { id: 'Electrical / Trades', label: 'Electrical / Trades', icon: '🔧', color: '#d97706', bg: '#fffbe6', border: '#fde68a', description: 'Electrical, Plumbing & Skilled Trades', isActive: true },
  { id: 'Hospitality', label: 'Hospitality', icon: '🏠', color: '#b45309', bg: '#fef3c7', border: '#fde68a', description: 'Hotels, Catering & Food Services', isActive: true },
  { id: 'Construction', label: 'Construction', icon: '🏗️', color: '#ea580c', bg: '#ffedd5', border: '#fed7aa', description: 'Building & Infrastructure Construction', isActive: true },
  { id: 'Finance', label: 'Finance', icon: '📈', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', description: 'Banking, Accounting & Financial Services', isActive: true },
  { id: 'Other', label: 'Other', icon: '💬', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', description: 'Uncategorized or General Industries', isActive: true },
];

const COLOR_PALETTE = [
  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', name: 'Blue' },
  { color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', name: 'Pink' },
  { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', name: 'Green' },
  { color: '#eab308', bg: '#fefce8', border: '#fef08a', name: 'Yellow' },
  { color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', name: 'Purple' },
  { color: '#ea580c', bg: '#ffedd5', border: '#fed7aa', name: 'Orange' },
  { color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', name: 'Cyan' },
  { color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', name: 'Grey' },
];

const ICON_OPTIONS = [
  { label: 'Briefcase (Default)', icon: '💼' },
  { label: 'Heart / Healthcare', icon: '❤️' },
  { label: 'Code / IT', icon: '</>' },
  { label: 'Wrench / Trades', icon: '🔧' },
  { label: 'Hospitality / Building', icon: '🏠' },
  { label: 'Construction / Helmet', icon: '🏗️' },
  { label: 'Finance / Chart', icon: '📈' },
  { label: 'Shield / Security', icon: '🔒' },
  { label: 'Truck / Logistics', icon: '🚚' },
  { label: 'Dots / Other', icon: '💬' },
];

const getEmployerDomain = (emp) => {
  if (emp && emp.industry) return emp.industry;
  return 'Healthcare';
};

export default function EmployersPage() {
  const [employers, setEmployers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('All Domains');
  const [importTargetDomain, setImportTargetDomain] = useState('Healthcare');
  const pageSize = 50;

  // Manage Domains State
  const [managedDomains, setManagedDomains] = useState(() => {
    try {
      const saved = localStorage.getItem('visaliv_managed_domains');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_DOMAINS;
  });

  const [showManageDomainsModal, setShowManageDomainsModal] = useState(false);
  const [editingDomainId, setEditingDomainId] = useState(null);
  const [domainNameInput, setDomainNameInput] = useState('');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState('💼');
  const [domainDescInput, setDomainDescInput] = useState('');
  const [domainSearchQuery, setDomainSearchQuery] = useState('');

  // Persist managed domains to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('visaliv_managed_domains', JSON.stringify(managedDomains));
    } catch {
      // ignore
    }
  }, [managedDomains]);

  // Full domains list formatted for UI
  const domainsList = useMemo(() => {
    const activeCustom = managedDomains.filter((d) => d.isActive !== false);
    return [
      { id: 'All Domains', label: 'All Domains', icon: null },
      ...activeCustom,
    ];
  }, [managedDomains]);

  const handleSaveDomain = (e) => {
    e.preventDefault();
    if (!domainNameInput.trim()) return;

    const cleanName = domainNameInput.trim();
    const colorObj = COLOR_PALETTE[selectedColorIdx] || COLOR_PALETTE[0];

    if (editingDomainId) {
      setManagedDomains((prev) =>
        prev.map((d) => {
          if (d.id === editingDomainId) {
            return {
              ...d,
              label: cleanName,
              color: colorObj.color,
              bg: colorObj.bg,
              border: colorObj.border,
              icon: selectedIcon,
              description: domainDescInput.trim(),
            };
          }
          return d;
        })
      );
      setEditingDomainId(null);
    } else {
      if (managedDomains.some((d) => d.id.toLowerCase() === cleanName.toLowerCase())) {
        alert(`Domain "${cleanName}" already exists!`);
        return;
      }
      const newDomain = {
        id: cleanName,
        label: cleanName,
        icon: selectedIcon,
        color: colorObj.color,
        bg: colorObj.bg,
        border: colorObj.border,
        description: domainDescInput.trim(),
        isActive: true,
      };
      setManagedDomains((prev) => [...prev, newDomain]);
    }

    setDomainNameInput('');
    setSelectedColorIdx(0);
    setSelectedIcon('💼');
    setDomainDescInput('');
  };

  const handleEditDomainClick = (domain) => {
    setEditingDomainId(domain.id);
    setDomainNameInput(domain.label);
    const colorIdx = COLOR_PALETTE.findIndex((c) => c.color === domain.color);
    setSelectedColorIdx(colorIdx >= 0 ? colorIdx : 0);
    setSelectedIcon(domain.icon || '💼');
    setDomainDescInput(domain.description || '');
  };

  const handleToggleDomainStatus = (domainId) => {
    setManagedDomains((prev) =>
      prev.map((d) => (d.id === domainId ? { ...d, isActive: !d.isActive } : d))
    );
  };

  const handleDeleteDomain = (domain) => {
    const employerCount = domainCounts[domain.id] || 0;
    if (employerCount > 0) {
      if (!window.confirm(`Warning: Domain "${domain.label}" has ${employerCount} employer(s) assigned to it. Are you sure you want to delete this domain?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete domain "${domain.label}"?`)) return;
    }

    setManagedDomains((prev) => prev.filter((d) => d.id !== domain.id));
    if (editingDomainId === domain.id) {
      setEditingDomainId(null);
      setDomainNameInput('');
      setDomainDescInput('');
    }
  };

  const handleCancelDomainEdit = () => {
    setEditingDomainId(null);
    setDomainNameInput('');
    setSelectedColorIdx(0);
    setSelectedIcon('💼');
    setDomainDescInput('');
  };

  const domainCounts = useMemo(() => {
    const counts = { 'All Domains': employers.length };
    domainsList.forEach((d) => {
      if (d.id !== 'All Domains') counts[d.id] = 0;
    });

    employers.forEach((emp) => {
      const domain = getEmployerDomain(emp);
      if (counts[domain] !== undefined) {
        counts[domain] += 1;
      } else {
        counts['Other'] = (counts['Other'] || 0) + 1;
      }
    });
    return counts;
  }, [employers, domainsList]);

  const filteredEmployers = useMemo(() => {
    let list = employers;
    if (selectedDomainFilter !== 'All Domains') {
      list = list.filter((emp) => getEmployerDomain(emp) === selectedDomainFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (emp) =>
        (emp.service_name && emp.service_name.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.industry && emp.industry.toLowerCase().includes(q))
    );
  }, [employers, selectedDomainFilter, searchQuery]);

  const totalPages = Math.ceil(filteredEmployers.length / pageSize) || 1;

  const paginatedEmployers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployers.slice(start, start + pageSize);
  }, [filteredEmployers, currentPage, pageSize]);

  // Bulk Selection State
  const [selectedEmployerIds, setSelectedEmployerIds] = useState(new Set());

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedEmployers.map((emp) => emp.id);
      setSelectedEmployerIds((prev) => new Set([...prev, ...pageIds]));
    } else {
      const pageIds = new Set(paginatedEmployers.map((emp) => emp.id));
      setSelectedEmployerIds((prev) => new Set([...prev].filter((id) => !pageIds.has(id))));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedEmployerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedEmployerIds);
    const count = ids.length;
    if (count === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${count} selected employer(s)?`)) return;

    try {
      setError('');
      setSuccess('');

      let successCount = 0;

      // Try bulk-delete API first
      try {
        const response = await fetch(`${API_URL}/employers/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employer_ids: ids }),
        });

        if (response.ok) {
          const data = await response.json();
          successCount = data.deleted_count || count;
        }
      } catch {
        // fallback below if bulk API unavailable
      }

      // Fallback: parallel delete if bulk endpoint fails/405
      if (successCount === 0) {
        const results = await Promise.allSettled(
          ids.map((id) => fetch(`${API_URL}/employers/${id}`, { method: 'DELETE' }))
        );
        successCount = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
      }

      setSuccess(`Successfully deleted ${successCount} employer(s).`);
      setSelectedEmployerIds(new Set());
      await fetchEmployers();
    } catch (err) {
      setError(err.message || 'Failed to delete employers');
    }
  };

  // Add / Edit Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Import Excel Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      setError('');

      const [empRes, dashRes] = await Promise.all([
        fetch(`${API_URL}/employers`),
        fetch(`${API_URL}/dashboard`).catch(() => null),
      ]);

      if (!empRes.ok) {
        let detailMsg = 'Failed to fetch employers';
        try {
          const errData = await empRes.json();
          detailMsg = typeof errData.detail === 'string' ? errData.detail : detailMsg;
        } catch {
          // ignore
        }
        throw new Error(detailMsg);
      }

      const data = await empRes.json();
      setEmployers(Array.isArray(data) ? data : []);

      if (dashRes && dashRes.ok) {
        const dashData = await dashRes.json();
        setDashboardStats(dashData);
      }
      setError('');
    } catch (err) {
      console.error('Fetch employers error:', err);
      setError(err.message || 'Failed to fetch employers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployers();
  }, []);

  const kpiTotalEmployers = employers.length > 0 ? employers.length : (dashboardStats?.totalEmployers ?? 0);
  const kpiDomains = useMemo(() => {
    const industries = new Set(employers.map((e) => getEmployerDomain(e)).filter(Boolean));
    return industries.size > 0 ? industries.size : 1;
  }, [employers]);
  const kpiOutreachSent = dashboardStats?.emailsSent ?? dashboardStats?.emails_sent ?? 0;
  const kpiActiveEmployers = useMemo(() => {
    return employers.filter((e) => e.is_active !== false).length;
  }, [employers]);
  const kpiResponses = dashboardStats?.totalEmailsReceived ?? dashboardStats?.total_emails_received ?? 0;

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
      service_name: employer.service_name || '',
      email: employer.email || '',
      country: employer.country || '',
      industry: employer.industry || '',
      service_website: employer.service_website || '',
      hr_email: employer.hr_email || '',
      recruitment_email: employer.recruitment_email || '',
      careers_email: employer.careers_email || '',
      manager_email: employer.manager_email || '',
      info_email: employer.info_email || '',
      general_email: employer.general_email || '',
      primary_email_type: employer.primary_email_type || (employer.email ? 'Manual' : ''),
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

      const email = form.email ? form.email.trim() : null;

      if (email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          throw new Error('Please enter a valid email address.');
        }
      }

      const serviceWebsite = form.service_website ? form.service_website.trim() : '';
      if (serviceWebsite) {
        try {
          const url = new URL(serviceWebsite);
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

      const payload = {
        service_name: form.service_name ? form.service_name.trim() || null : null,
        email: email || null,
        country: form.country ? form.country.trim() || null : null,
        industry: form.industry ? form.industry.trim() || null : null,
        service_website: serviceWebsite || null,
        hr_email: form.hr_email ? form.hr_email.trim() || null : null,
        recruitment_email: form.recruitment_email ? form.recruitment_email.trim() || null : null,
        careers_email: form.careers_email ? form.careers_email.trim() || null : null,
        manager_email: form.manager_email ? form.manager_email.trim() || null : null,
        info_email: form.info_email ? form.info_email.trim() || null : null,
        general_email: form.general_email ? form.general_email.trim() || null : null,
        primary_email_type: form.primary_email_type || (email ? 'Manual' : null),
        is_active: form.is_active,
      };

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        let detail = 'Failed to save employer';
        if (typeof data.detail === 'string') {
          detail = data.detail;
        } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
          detail = data.detail[0].msg;
        }
        throw new Error(detail);
      }

      setSuccess(isEditing ? 'Employer updated successfully.' : 'Employer added successfully.');
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

      const response = await fetch(`${API_URL}/employers/${employer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !employer.is_active }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to update status');

      setSuccess(`${employer.service_name || 'Employer'} is now ${data.is_active ? 'Active' : 'Inactive'}.`);
      await fetchEmployers();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteEmployer = async (employer) => {
    const label = employer.service_name || employer.email || 'this employer';
    if (!window.confirm(`Are you sure you want to delete "${label}"?`)) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch(`${API_URL}/employers/${employer.id}`, { method: 'DELETE' });

      if (!response.ok) {
        let message = 'Failed to delete employer';
        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      setSuccess('Employer deleted successfully.');
      await fetchEmployers();
    } catch (err) {
      setError(err.message);
    }
  };

  // --- Excel Import Modal Flow ---

  const openImportModal = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportTargetDomain('Healthcare');
    setError('');
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    if (importing) return;
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Only Excel files (.xlsx) are supported.');
      return;
    }

    setImportFile(file);
    setImportPreview(null);
    setImportResult(null);

    // Auto-generate preview
    try {
      setPreviewLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/employers/preview-import`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to parse Excel file');

      setImportPreview(data);
    } catch (err) {
      setError(err.message || 'Error parsing Excel file preview');
      setImportFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;

    try {
      setImporting(true);
      setError('');
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch(`${API_URL}/employers/import?domain=${encodeURIComponent(importTargetDomain)}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to import employers');

      setImportResult(data);
      setSuccess(`Import completed! ${data.imported_count} imported, ${data.skipped_duplicates_count} duplicates skipped.`);
      await fetchEmployers();
    } catch (err) {
      setError(err.message || 'Error executing import');
    } finally {
      setImporting(false);
    }
  };

  const renderDomainBadge = (domainName) => {
    const domInfo = managedDomains.find((d) => d.id === domainName) || {
      label: domainName || 'Healthcare',
      icon: '❤️',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fca5a5',
    };

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 9px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: domInfo.bg,
        color: domInfo.color,
        border: `1px solid ${domInfo.border}`,
        whiteSpace: 'nowrap',
      }}>
        {domInfo.icon && <span>{domInfo.icon}</span>}
        <span>{domInfo.label}</span>
      </span>
    );
  };

  const renderEmailTypeBadge = (type) => {
    if (!type) return null;
    let bg = '#f1f5f9';
    let color = '#475569';
    if (type === 'HR') { bg = '#dbeafe'; color = '#1e40af'; }
    else if (type === 'Recruitment') { bg = '#dcfce7'; color = '#15803d'; }
    else if (type === 'Careers') { bg = '#fef3c7'; color = '#b45309'; }
    else if (type === 'Manager') { bg = '#fae8ff'; color = '#86198f'; }
    else if (type === 'Info') { bg = '#e0f2fe'; color = '#0369a1'; }
    else if (type === 'General') { bg = '#ffedd5'; color = '#c2410c'; }
    else if (type === 'Manual') { bg = '#e2e8f0'; color = '#334155'; }

    return (
      <span style={{ backgroundColor: bg, color: color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
        {type}
      </span>
    );
  };

  return (
    <div className="content-container full-width-page">

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={25} color="#2563eb" />
          </div>

          <div>
            <h1 className="page-title">Employers</h1>
            <p className="page-subtitle">
              Manage target employers, priorities, and import Excel rosters.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={openImportModal} style={{ ...secondaryButtonStyle, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #2563eb', color: '#2563eb' }}>
            <FileSpreadsheet size={18} />
            Import Excel
          </button>

          <button onClick={openAddForm} style={primaryButtonStyle}>
            <Plus size={18} />
            Add Employer
          </button>
        </div>
      </div>

      {/* TOP 5 KPI CARDS BANNER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        width: '100%',
      }}>
        {/* Card 1: Total Employers */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>
              {kpiTotalEmployers.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>Total Employers</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>Across all domains</div>
          </div>
        </div>

        {/* Card 2: Domains */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>
              {kpiDomains.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>Domains</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>Active industries</div>
          </div>
        </div>

        {/* Card 3: Outreach Sent */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#faf5ff', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send size={22} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>
              {kpiOutreachSent.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>Outreach Sent</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>Total emails sent</div>
          </div>
        </div>

        {/* Card 4: Active Employers */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>
              {kpiActiveEmployers.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>Active Employers</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>Currently enabled</div>
          </div>
        </div>

        {/* Card 5: Responses */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={22} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>
              {kpiResponses.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>Responses</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>Total replies received</div>
          </div>
        </div>
      </div>

      {/* DOMAIN FILTER CHIPS BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {domainsList.map((item) => {
          const isSelected = selectedDomainFilter === item.id;
          const count = domainCounts[item.id] || 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedDomainFilter(item.id);
                setCurrentPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: isSelected ? '700' : '600',
                border: '1px solid',
                borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                color: isSelected ? '#ffffff' : '#334155',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
              }}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
              <span style={{
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                color: isSelected ? '#ffffff' : '#475569',
              }}>
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowManageDomainsModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            border: '1px dashed #2563eb',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Manage or add Domain categories"
        >
          <Plus size={15} /> Add Domain
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={errorStyle}>
          {error}
          <button onClick={() => setError('')} style={dismissButtonStyle}>×</button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={successStyle}>
          {success}
          <button onClick={() => setSuccess('')} style={dismissButtonStyle}>×</button>
        </div>
      )}

      {/* Employers Card */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>All Employers</h2>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px' }}>
              {filteredEmployers.length} of {employers.length} employers showing
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedEmployerIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={15} />
                Delete Selected ({selectedEmployerIds.size})
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search name, email, industry..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '220px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>Loading employers...</div>
        ) : filteredEmployers.length === 0 ? (
          <div style={emptyStateStyle}>
            <Building2 size={36} color="#94a3b8" />
            <p style={{ margin: '10px 0 0', color: '#64748b' }}>
              {searchQuery ? `No employers found matching "${searchQuery}".` : 'No employers found. Click "+ Add Employer" or "Import Excel" to get started.'}
            </p>
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={
                          paginatedEmployers.length > 0 &&
                          paginatedEmployers.every((emp) => selectedEmployerIds.has(emp.id))
                        }
                        onChange={handleSelectAll}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Employer Name</th>
                    <th style={thStyle}>Primary Email</th>
                    <th style={thStyle}>Email Type</th>
                    <th style={thStyle}>Domain</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Service Website</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedEmployers.map((employer, index) => {
                    const globalIdx = (currentPage - 1) * pageSize + index + 1;
                    const isSelected = selectedEmployerIds.has(employer.id);
                    return (
                      <tr key={employer.id} style={{ background: isSelected ? '#eff6ff' : 'transparent' }}>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(employer.id)}
                            style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={tdStyle}>#{globalIdx}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>
                          {employer.service_name || '-'}
                        </td>
                        <td style={tdStyle}>
                          {employer.email ? (
                            <span style={{ fontWeight: '500', color: '#1e293b' }}>{employer.email}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Email</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {renderEmailTypeBadge(employer.primary_email_type)}
                        </td>
                        <td style={tdStyle}>
                          {renderDomainBadge(getEmployerDomain(employer))}
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => toggleStatus(employer)}
                            title="Click to change status"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              border: 'none',
                              borderRadius: '999px',
                              background: employer.is_active ? '#ecfdf5' : '#f1f5f9',
                              color: employer.is_active ? '#047857' : '#64748b',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <span>●</span>
                            {employer.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td style={tdStyle}>
                          {employer.service_website ? (
                            <a
                              href={employer.service_website.startsWith('http') ? employer.service_website : `https://${employer.service_website}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontWeight: 500 }}
                            >
                              Visit <ExternalLink size={14} />
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button onClick={() => openEditForm(employer)} title="Edit employer" style={iconButtonStyle}>
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => deleteEmployer(employer)} title="Delete employer" style={{ ...iconButtonStyle, color: '#dc2626', borderColor: '#fecaca' }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ padding: '14px 22px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredEmployers.length)} of {filteredEmployers.length} employers
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                      color: currentPage === 1 ? '#94a3b8' : '#334155',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', padding: '0 8px' }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                      color: currentPage === totalPages ? '#94a3b8' : '#334155',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Employer Modal */}
      {showForm && (
        <div style={modalOverlayStyle} onClick={closeForm}>
          <div style={{ ...modalStyle, maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
                  {editingEmployer ? 'Edit Employer' : 'Add Employer'}
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Configure service details and email priority selection.
                </p>
              </div>
              <button onClick={closeForm} style={closeButtonStyle}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <FormField label="Service Name" name="service_name" value={form.service_name} onChange={handleChange} placeholder="e.g. Penns Mount Residential Care" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormField label="Primary Outreach Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="hr@example.com" />
                <div>
                  <label style={{ display: 'block', marginBottom: '7px', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                    Primary Email Type
                  </label>
                  <select name="primary_email_type" value={form.primary_email_type} onChange={handleChange} style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#ffffff' }}>
                    <option value="Manual">Manual Override</option>
                    <option value="HR">HR Email</option>
                    <option value="Recruitment">Recruitment Email</option>
                    <option value="Careers">Careers Email</option>
                    <option value="Manager">Manager Email</option>
                    <option value="Info">Info Email</option>
                    <option value="General">General Email</option>
                  </select>
                </div>
              </div>

              {/* Email breakdown fields */}
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>
                  Email Breakdown Fields (Strict Priority Order: HR → Recruitment → Careers → Manager → Info → General)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <FormField label="HR Email" name="hr_email" type="email" value={form.hr_email} onChange={handleChange} placeholder="hr@company.com" />
                  <FormField label="Recruitment Email" name="recruitment_email" type="email" value={form.recruitment_email} onChange={handleChange} placeholder="jobs@company.com" />
                  <FormField label="Careers Email" name="careers_email" type="email" value={form.careers_email} onChange={handleChange} placeholder="careers@company.com" />
                  <FormField label="Manager Email" name="manager_email" type="email" value={form.manager_email} onChange={handleChange} placeholder="manager@company.com" />
                  <FormField label="Info Email" name="info_email" type="email" value={form.info_email} onChange={handleChange} placeholder="info@company.com" />
                  <FormField label="General Email" name="general_email" type="email" value={form.general_email} onChange={handleChange} placeholder="general@company.com" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '7px', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                    Domain / Industry Sector
                  </label>
                  <select
                    name="industry"
                    value={form.industry || 'Healthcare'}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#ffffff', fontWeight: '500' }}
                  >
                    {domainsList.filter((d) => d.id !== 'All Domains').map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.icon ? `${d.icon} ${d.label}` : d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <FormField label="Service Website" name="service_website" type="url" value={form.service_website} onChange={handleChange} placeholder="https://example.com" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', marginBottom: '22px', fontSize: '14px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }} />
                Employer is Active
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                <button type="button" onClick={closeForm} style={secondaryButtonStyle}>Cancel</button>
                <button type="submit" style={{ ...primaryButtonStyle, flex: 1, justifyContent: 'center' }}>
                  {editingEmployer ? 'Save Changes' : 'Add Employer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div style={modalOverlayStyle} onClick={closeImportModal}>
          <div style={{ ...modalStyle, maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet color="#2563eb" size={24} /> Excel Employer Import
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Upload an Excel (.xlsx) file. System auto-selects primary email by priority: <strong>HR → Recruitment → Careers → Manager → Info → General</strong>.
                </p>
              </div>
              <button onClick={closeImportModal} style={closeButtonStyle}><X size={18} /></button>
            </div>

            {/* Target Domain Selector */}
            <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                🎯 Target Domain / Industry Sector:
              </label>
              <select
                value={importTargetDomain}
                onChange={(e) => setImportTargetDomain(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {domainsList.filter((d) => d.id !== 'All Domains').map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icon ? `${d.icon} ${d.label}` : d.label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Employers imported from this Excel file will be assigned to <strong>{importTargetDomain}</strong>.
              </span>
            </div>

            {/* File Selection Box */}
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '16px' }}>
              <Upload size={32} color="#2563eb" style={{ marginBottom: '8px' }} />
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                {importFile ? importFile.name : 'Select or Drop Excel file (.xlsx)'}
              </p>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} id="excel-file-input" style={{ display: 'none' }} />
              <label htmlFor="excel-file-input" style={{ ...primaryButtonStyle, display: 'inline-flex', cursor: 'pointer', padding: '8px 16px', fontSize: '13px' }}>
                Browse Excel File
              </label>
            </div>

            {previewLoading && (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                Parsing and evaluating email priority...
              </div>
            )}

            {/* Preview Results Table */}
            {importPreview && !previewLoading && (
              <div>
                {/* Stats Summary Bar */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                    Total Rows: <strong>{importPreview.total_rows}</strong>
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px' }}>
                    Ready to Import: {importPreview.valid_count}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>
                    Duplicates Skipped: {importPreview.duplicate_count}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                    No Email: {importPreview.no_email_count}
                  </span>
                  {importPreview.invalid_rows_count > 0 && (
                    <span style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px' }}>
                      Invalid Rows: {importPreview.invalid_rows_count}
                    </span>
                  )}
                </div>

                {/* Preview Table */}
                <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', sticky: 'top', position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                        <th style={{ padding: '10px' }}>#</th>
                        <th style={{ padding: '10px' }}>Service Name</th>
                        <th style={{ padding: '10px' }}>Selected Primary Email</th>
                        <th style={{ padding: '10px' }}>Email Type</th>
                        <th style={{ padding: '10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row) => (
                        <tr key={row.row_number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', color: '#64748b' }}>{row.row_number}</td>
                          <td style={{ padding: '10px', fontWeight: '600', color: '#0f172a' }}>{row.service_name || '-'}</td>
                          <td style={{ padding: '10px' }}>
                            {row.primary_email ? (
                              <span>{row.primary_email}</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Email</span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>{renderEmailTypeBadge(row.primary_email_type)}</td>
                          <td style={{ padding: '10px' }}>
                            {row.status === 'Ready' && <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Ready</span>}
                            {row.status === 'Duplicate' && <span style={{ color: '#d97706', fontWeight: '600' }} title={row.status_reason}>⚠ Duplicate (Skipped)</span>}
                            {row.status === 'No Email' && <span style={{ color: '#475569', fontWeight: '500' }}>ℹ No Email (Imported)</span>}
                            {row.status === 'Invalid' && <span style={{ color: '#dc2626', fontWeight: '600' }} title={row.status_reason}>✕ Invalid</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Result Notification */}
            {importResult && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{importResult.message}</div>
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>
                    Total: {importResult.total_rows} | Imported: {importResult.imported_count} | Skipped: {importResult.skipped_duplicates_count} | No Email: {importResult.no_email_count}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={closeImportModal} style={secondaryButtonStyle}>
                {importResult ? 'Close' : 'Cancel'}
              </button>

              {importPreview && !importResult && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || (importPreview.valid_count === 0 && importPreview.no_email_count === 0)}
                  style={{ ...primaryButtonStyle, opacity: importing ? 0.7 : 1 }}
                >
                  {importing ? 'Importing Employers...' : `Confirm & Import (${importPreview.valid_count + importPreview.no_email_count} Rows)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE DOMAINS MODAL */}
      {showManageDomainsModal && (
        <div style={modalOverlayStyle}>
          <div style={{
            ...modalStyle,
            maxWidth: '940px',
            padding: '28px',
            borderRadius: '20px',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LayoutGrid size={22} color="#2563eb" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Manage Domains</h2>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                    Add, edit or delete domains (industries) to categorize employers. These domains will be used across the system.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowManageDomainsModal(false)} style={closeButtonStyle}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Content - 2 Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '28px' }}>

              {/* Left Column: Add / Edit Form */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {editingDomainId ? 'Edit Domain' : 'Add New Domain'}
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: '12.5px', color: '#64748b' }}>
                  {editingDomainId ? 'Modify details of the domain.' : 'Create a new domain to categorize employers.'}
                </p>

                <form onSubmit={handleSaveDomain}>
                  {/* Domain Name */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Domain Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter domain name (e.g. Cyber Security, Logistics)"
                      value={domainNameInput}
                      onChange={(e) => setDomainNameInput(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#ffffff',
                      }}
                    />
                  </div>

                  {/* Display Color */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Display Color
                    </label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {COLOR_PALETTE.map((c, idx) => {
                        const isSelected = selectedColorIdx === idx;
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setSelectedColorIdx(idx)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: c.color,
                              border: isSelected ? '3px solid #ffffff' : 'none',
                              boxShadow: isSelected ? `0 0 0 2px ${c.color}` : 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'transform 0.15s ease',
                              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                            }}
                            title={c.name}
                          >
                            {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Icon */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Icon
                    </label>
                    <select
                      value={selectedIcon}
                      onChange={(e) => setSelectedIcon(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#ffffff',
                      }}
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.icon}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add a short description..."
                      value={domainDescInput}
                      onChange={(e) => setDomainDescInput(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#ffffff',
                        resize: 'none',
                      }}
                    />
                  </div>

                  {/* Form Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '11px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={16} /> {editingDomainId ? 'Update Domain' : 'Add Domain'}
                    </button>
                    {editingDomainId && (
                      <button
                        type="button"
                        onClick={handleCancelDomainEdit}
                        style={{
                          padding: '11px 14px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Column: Existing Domains Table */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Existing Domains</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                      Manage your existing domains. Edit or delete as needed.
                    </p>
                  </div>
                  {/* Search bar */}
                  <div style={{ position: 'relative', width: '200px' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search domains..."
                      value={domainSearchQuery}
                      onChange={(e) => setDomainSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px 7px 30px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Domains Table Container */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>#</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Domain Name</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Employers</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managedDomains
                        .filter((dom) => !domainSearchQuery.trim() || dom.label.toLowerCase().includes(domainSearchQuery.toLowerCase().trim()))
                        .map((dom, index) => {
                          const count = domainCounts[dom.id] || 0;
                          return (
                            <tr key={dom.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                                {index + 1}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '12.5px',
                                  fontWeight: '600',
                                  backgroundColor: dom.bg || '#f1f5f9',
                                  color: dom.color || '#334155',
                                  border: `1px solid ${dom.border || '#cbd5e1'}`,
                                }}>
                                  {dom.icon && <span>{dom.icon}</span>}
                                  <span>{dom.label}</span>
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                {count}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDomainStatus(dom.id)}
                                  style={{
                                    width: '38px',
                                    height: '20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: dom.isActive !== false ? '#2563eb' : '#cbd5e1',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                  }}
                                  title={dom.isActive !== false ? 'Active' : 'Inactive'}
                                >
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ffffff',
                                    position: 'absolute',
                                    top: '2px',
                                    left: dom.isActive !== false ? '20px' : '2px',
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                  }} />
                                </button>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    onClick={() => handleEditDomainClick(dom)}
                                    style={{
                                      padding: '5px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      background: '#ffffff',
                                      color: '#2563eb',
                                      cursor: 'pointer',
                                    }}
                                    title="Edit Domain"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDomain(dom)}
                                    style={{
                                      padding: '5px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #fecaca',
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                    }}
                                    title="Delete Domain"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Right Close Button */}
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowManageDomainsModal(false)}
                    style={{
                      padding: '9px 24px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

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
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '9px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          fontSize: '13px',
          outline: 'none',
        }}
      />
    </div>
  );
}