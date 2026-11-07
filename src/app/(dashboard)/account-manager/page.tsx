'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DynamicMapPicker from '@/components/map/DynamicMapPicker';
import { formatNominatimAddress } from '@/utils/address';
import SignaturePad from '@/components/signature/SignaturePad';
import SupportingDocumentsUpload from '@/components/travel-order/SupportingDocumentsUpload';
import { AttachmentDTO } from '@/types';

interface UserRecord {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  division?: string | null;
  section?: string | null;
  position?: string | null;
  signatureUrl?: string | null;
  birthday?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface TARequestRecord {
  id: string;
  trackingNumber: string;
  purpose: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

const roleDisplayNames: Record<string, string> = {
  EMPLOYEE: 'Employee',
  SECTION_CHIEF: 'Section Chief',
  DIVISION_CHIEF: 'Division Chief',
  HEAD_PENRO: 'Head of PENRO',
  ACCOUNT_MANAGER: 'Account Manager',
  ADMIN: 'Administrator',
};

// Dual Month Calendar Picker Component matching Employee Portal
function DualMonthCalendarPicker({
  departureDate,
  returnDate,
  onSelectDeparture,
  onSelectReturn,
}: {
  departureDate: string;
  returnDate: string;
  onSelectDeparture: (date: string) => void;
  onSelectReturn: (date: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [baseDate, setBaseDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const month1Year = baseDate.getFullYear();
  const month1Month = baseDate.getMonth();

  const nextMonthDate = new Date(month1Year, month1Month + 1, 1);
  const month2Year = nextMonthDate.getFullYear();
  const month2Month = nextMonthDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => setBaseDate(new Date(month1Year, month1Month - 1, 1));
  const handleNextMonth = () => setBaseDate(new Date(month1Year, month1Month + 1, 1));

  const parseDateStr = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const depObj = parseDateStr(departureDate);
  const retObj = parseDateStr(returnDate);

  const handleDayClick = (year: number, month: number, day: number) => {
    const clickedDate = new Date(year, month, day);
    clickedDate.setHours(0, 0, 0, 0);

    if (clickedDate < today) return;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (!depObj || (depObj && retObj)) {
      onSelectDeparture(dateStr);
      onSelectReturn('');
    } else if (depObj && !retObj) {
      if (clickedDate >= depObj) {
        onSelectReturn(dateStr);
      } else {
        onSelectDeparture(dateStr);
        onSelectReturn('');
      }
    }
  };

  const renderMonthGrid = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`blank-${i}`} className="py-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      cellDate.setHours(0, 0, 0, 0);

      const isPast = cellDate < today;
      const isDeparture =
        depObj &&
        cellDate.getFullYear() === depObj.getFullYear() &&
        cellDate.getMonth() === depObj.getMonth() &&
        cellDate.getDate() === depObj.getDate();
      const isReturn =
        retObj &&
        cellDate.getFullYear() === retObj.getFullYear() &&
        cellDate.getMonth() === retObj.getMonth() &&
        cellDate.getDate() === retObj.getDate();
      const inRange = depObj && retObj && cellDate > depObj && cellDate < retObj;

      let cellStyle = 'hover:bg-emerald-50/60 text-slate-700 font-medium rounded-[6px]';
      if (isPast) {
        cellStyle = 'text-slate-300/80 bg-slate-50/50 cursor-not-allowed pointer-events-none line-through decoration-slate-300';
      } else if (isDeparture || isReturn) {
        cellStyle = 'bg-[#0F4C2E] text-white font-semibold rounded-[6px] shadow-xs';
      } else if (inRange) {
        cellStyle = 'bg-emerald-100/70 text-emerald-900 font-semibold rounded-none';
      }

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          disabled={isPast}
          onClick={() => handleDayClick(year, month, day)}
          className={`py-1.5 text-[12px] transition-colors flex items-center justify-center h-8 w-8 mx-auto ${cellStyle}`}
        >
          {day}
        </button>
      );
    }

    return cells;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select a date';
    const obj = parseDateStr(dateStr);
    if (!obj) return 'Select a date';
    return obj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-8 bg-white rounded-[8px] border border-[#E5E5E7] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5E7]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-7 w-7 inline-flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-[6px] transition-colors font-semibold"
            >
              ‹
            </button>
            <span className="text-[13px] font-semibold text-[#1D1D1F]">
              {monthNames[month1Month]} {month1Year}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#1D1D1F]">
              {monthNames[month2Month]} {month2Year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-7 w-7 inline-flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-[6px] transition-colors font-semibold"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-[13px] font-semibold text-[#1D1D1F] text-center mb-2.5">
              {monthNames[month1Month]} {month1Year}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={idx} className="text-[11px] font-semibold text-[#86868B] py-1">
                  {d}
                </div>
              ))}
              {renderMonthGrid(month1Year, month1Month)}
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-[#1D1D1F] text-center mb-2.5">
              {monthNames[month2Month]} {month2Year}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={idx} className="text-[11px] font-semibold text-[#86868B] py-1">
                  {d}
                </div>
              ))}
              {renderMonthGrid(month2Year, month2Month)}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 bg-[#F3F4F8] p-5 rounded-[8px] border border-slate-200/80 space-y-5">
        <div>
          <h4 className="text-[14px] font-semibold text-[#1D1D1F] mb-3">Selected Dates</h4>

          <div className="space-y-2.5">
            <div className="bg-white p-3.5 rounded-[6px] border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-0.5">
                  Departure
                </span>
                <span className={`text-[13px] font-semibold ${departureDate ? 'text-[#1D1D1F]' : 'text-[#86868B]'}`}>
                  {formatDateDisplay(departureDate)}
                </span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${departureDate ? 'bg-[#0F4C2E]' : 'bg-slate-300'}`}></span>
            </div>

            <div className="bg-white p-3.5 rounded-[6px] border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-0.5">
                  Return
                </span>
                <span className={`text-[13px] font-semibold ${returnDate ? 'text-[#1D1D1F]' : 'text-[#86868B]'}`}>
                  {formatDateDisplay(returnDate)}
                </span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${returnDate ? 'bg-[#0F4C2E]' : 'bg-slate-300'}`}></span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <span className="text-[12px] font-semibold text-[#1D1D1F] block">Instructions:</span>
          <ol className="text-[12px] text-[#86868B] space-y-1 pl-4 list-decimal leading-relaxed">
            <li>Click on the calendar to select your departure date</li>
            <li>Then select your return date</li>
            <li>The duration will be calculated automatically</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function AccountManagerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    if (activeTab === 'requests') {
      router.replace('/employee?tab=requests');
    } else if (activeTab === 'schedule' || activeTab === 'travel-dates') {
      router.replace('/employee?tab=schedule');
    }
  }, [activeTab, router]);

  // System Users State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    staff: 0,
    employee: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Account Activation Modal State
  const [selectedUserForActivation, setSelectedUserForActivation] = useState<UserRecord | null>(null);
  const [activationSection, setActivationSection] = useState('');
  const [activationPosition, setActivationPosition] = useState('');
  const [activationRole, setActivationRole] = useState('EMPLOYEE');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generated Credentials Modal State
  const [generatedCredentialsModal, setGeneratedCredentialsModal] = useState<{
    user: any;
    credentials: { username: string; tempPassword: string };
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Password Reset Modal State
  const [resetUser, setResetUser] = useState<UserRecord | null>(null);
  const [customPassword, setCustomPassword] = useState('password123');

  // Signature Management Modal State
  const [signatureModalUser, setSignatureModalUser] = useState<UserRecord | null>(null);
  const [signatureDataInput, setSignatureDataInput] = useState<string | null>(null);
  const [signatureSaving, setSignatureSaving] = useState(false);

  // Create New Account Form State
  const [newAccountData, setNewAccountData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: 'EMPLOYEE',
    division: '',
    section: '',
    position: '',
    signatureData: null as string | null,
    consent: false,
  });
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [orgDivisions, setOrgDivisions] = useState<
    Array<{ id: string; name: string; sections: Array<{ id: string; name: string }> }>
  >([]);

  // Pending Accounts Review Tab State
  const [pendingSearch, setPendingSearch] = useState('');
  const [showManualCreate, setShowManualCreate] = useState(false);

  // Configuration Form State
  const [configSettings, setConfigSettings] = useState({
    defaultRole: 'EMPLOYEE',
    requireApproval: true,
    autoDeactivate: false,
    maxFailedLogins: 5,
    sessionTimeoutMins: 30,
    smsActivationAlert: true,
    emailNotification: true,
    stationName: 'DENR-PENRO Laguna',
    regionName: 'Region IV-A CALABARZON',
  });

  // Create Travel 5-Step Wizard State for Account Manager (Matching Employee Portal)
  const [myTaRequests, setMyTaRequests] = useState<TARequestRecord[]>([]);
  const [taSubTab, setTaSubTab] = useState<'create' | 'list'>('create');
  const [wizardStep, setWizardStep] = useState(1);
  const [formError, setFormError] = useState('');

  const getInitialCreateForm = () => ({
    departureDate: '',
    returnDate: '',
    employeeName: '',
    position: '',
    designation: '',
    travelArea: 'WITHIN AOR',
    destination: '',
    destinationLat: 14.275,
    destinationLng: 121.415,
    purpose: '',
    salaryGrade: '18',
    division: 'Admin & Finance Section (Management Services Division)',
    station: 'PENRO ADN PLANNING',
    employmentStatus: 'Permanent',
    office: 'PENRO ADN',
    signatoryStation: 'PENRO ADN PLANNING',
    perDiems: '',
    appropriations: '',
    remarks: '',
    certification: '',
    contactNumber: '09063951218',
    attachments: [] as AttachmentDTO[],
  });

  const [createForm, setCreateForm] = useState(() => getInitialCreateForm());

  const [locationSuggestions, setLocationSuggestions] = useState<
    { name: string; fullAddress: string; lat: number; lng: number }[]
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const skipNextSearchRef = useRef(false);
  const [taSubmitting, setTaSubmitting] = useState(false);

  // Database-driven Employees state for Step 2 dropdown
  const [employeeList, setEmployeeList] = useState<Array<{ id: string; name: string; position: string | null }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Helper to render Activity Log Outline Icons
  const renderActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return (
          <svg className="w-4 h-4 text-[#0F4C2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'key':
        return (
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        );
      case 'check':
        return (
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'ban':
        return (
          <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      case 'building':
      default:
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
    }
  };

  // Recent Activity Log state
  const [activityLogs] = useState([
    { id: '1', action: 'Created account', target: 'Carlos Miguel Bautista', actor: 'Maria Clara Santos', time: '1 hour ago', type: 'user' },
    { id: '2', action: 'Reset password', target: 'Ramon Dela Cruz', actor: 'Maria Clara Santos', time: '3 hours ago', type: 'key' },
    { id: '3', action: 'Activated account', target: 'Mark Anthony Go', actor: 'Maria Clara Santos', time: '1 day ago', type: 'check' },
    { id: '4', action: 'Deactivated account', target: 'Diana Rose Fernando', actor: 'System Administrator', time: '2 days ago', type: 'ban' },
    { id: '5', action: 'Updated section assignment', target: 'Analyn Cruz', actor: 'System Administrator', time: '3 days ago', type: 'building' },
  ]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Debounced OpenStreetMap Nominatim Location Search
  useEffect(() => {
    if (!createForm.destination || createForm.destination.trim().length < 3) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const query = encodeURIComponent(`${createForm.destination.trim()}, Philippines`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const formatted = data.map((item: any) => ({
              name: item.display_name.split(',')[0],
              fullAddress: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            }));
            setLocationSuggestions(formatted);
            setShowLocationDropdown(true);
          } else {
            setLocationSuggestions([]);
            setShowLocationDropdown(false);
          }
        }
      } catch (err) {
        console.error('Failed location lookup', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [createForm.destination]);

  // Fetch Users & Data
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account-manager/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsers(data.data || []);
          if (data.counts) {
            setCounts(data.counts);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch users list', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTaRequests = async () => {
    try {
      const res = await fetch('/api/ta-requests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setMyTaRequests(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch TA requests', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMyTaRequests();

    const fetchOrgStructure = async () => {
      try {
        const res = await fetch('/api/organization/divisions');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setOrgDivisions(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load organizational structure:', err);
      }
    };
    fetchOrgStructure();

    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setEmployeeList(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleEmployeeSelect = (name: string) => {
    const emp = employeeList.find((item) => item.name === name);
    const pos = emp?.position || '';
    const div = (emp as any)?.section && (emp as any)?.division
      ? `${(emp as any).section} (${(emp as any).division})`
      : ((emp as any)?.division || '');
    setCreateForm((prev) => ({
      ...prev,
      employeeName: name,
      position: pos,
      designation: pos,
      ...(div ? { division: div } : {}),
    }));
  };

  // Handle Account Activation Submit
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForActivation) return;

    if (!activationSection.trim()) {
      showToast('Please enter a section or unit name for activation.', 'error');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/account-manager/activate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForActivation.id,
          section: activationSection.trim(),
          position: activationPosition.trim(),
          role: activationRole,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to activate user account.', 'error');
        setActionLoading(false);
        return;
      }

      showToast(`Account for ${selectedUserForActivation.name} has been activated!`, 'success');
      
      // Store generated credentials to show confirmation card
      if (data.data?.generatedCredentials) {
        setGeneratedCredentialsModal({
          user: data.data.user,
          credentials: data.data.generatedCredentials,
        });
      }

      setSelectedUserForActivation(null);
      setActivationSection('');
      setActivationPosition('');
      fetchUsers();
      
      // Refresh employees list for Step 2
      const empRes = await fetch('/api/employees');
      if (empRes.ok) {
        const empJson = await empRes.json();
        if (empJson.success && Array.isArray(empJson.data)) {
          setEmployeeList(empJson.data);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'An error occurred during activation.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle User Status Toggle
  const handleToggleStatus = async (user: UserRecord, newStatus: string) => {
    if (!confirm(`Are you sure you want to change status of ${user.name} to ${newStatus}?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/account-manager/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'TOGGLE_STATUS',
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update user status.', 'error');
        return;
      }

      showToast(`User ${user.name} status updated to ${newStatus}.`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'An error occurred updating user status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Password Reset Submit
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/account-manager/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetUser.id,
          action: 'RESET_PASSWORD',
          password: customPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to reset password.', 'error');
        return;
      }

      showToast(`Password reset successfully for ${resetUser.name}.`, 'success');
      setResetUser(null);
      setCustomPassword('password123');
    } catch (err: any) {
      showToast(err.message || 'An error occurred resetting password.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Save E-Signature for User
  const handleSaveSignature = async () => {
    if (!signatureModalUser) return;
    if (!signatureDataInput || !signatureDataInput.trim()) {
      showToast('Please draw and affix an e-signature on the canvas before saving.', 'error');
      return;
    }

    setSignatureSaving(true);
    try {
      const res = await fetch('/api/account-manager/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: signatureModalUser.id,
          action: 'UPDATE_SIGNATURE',
          signatureData: signatureDataInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to save official e-signature.', 'error');
        setSignatureSaving(false);
        return;
      }

      const updatedSigUrl = data.data?.signatureUrl || signatureDataInput;

      // Optimistically update users in local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === signatureModalUser.id ? { ...u, signatureUrl: updatedSigUrl } : u
        )
      );

      showToast(`Official e-signature saved successfully for ${signatureModalUser.name}!`, 'success');
      setSignatureModalUser(null);
      setSignatureDataInput(null);
    } catch (err: any) {
      showToast(err.message || 'An error occurred while saving signature.', 'error');
    } finally {
      setSignatureSaving(false);
    }
  };

  // Handle Create Account Submit
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isHeadPenro = newAccountData.role === 'HEAD_PENRO';
    const selectedDivisionObj = orgDivisions.find((d) => d.name === newAccountData.division);
    const requiresSection = !isHeadPenro && !!(selectedDivisionObj && selectedDivisionObj.sections && selectedDivisionObj.sections.length > 0);

    if (!isHeadPenro) {
      if (!newAccountData.division) {
        showToast('Please select an official Division.', 'error');
        return;
      }

      if (requiresSection && !newAccountData.section) {
        showToast('Please select a Section under the selected Division.', 'error');
        return;
      }
    }

    if (!newAccountData.position.trim()) {
      showToast('Please enter the employee position description.', 'error');
      return;
    }

    if (!newAccountData.signatureData) {
      showToast('An employee e-signature is required for walk-in registration.', 'error');
      return;
    }

    if (!newAccountData.consent) {
      showToast('Please confirm the employee signature authorization consent.', 'error');
      return;
    }

    setCreateAccountLoading(true);

    try {
      const res = await fetch('/api/account-manager/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccountData.name.trim(),
          email: newAccountData.email.trim(),
          phoneNumber: newAccountData.phoneNumber.trim(),
          role: newAccountData.role,
          division: isHeadPenro ? null : newAccountData.division.trim(),
          section: isHeadPenro ? null : (requiresSection && newAccountData.section ? newAccountData.section.trim() : null),
          position: newAccountData.position.trim(),
          signatureData: newAccountData.signatureData,
          status: 'ACTIVE',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to create user account.', 'error');
        setCreateAccountLoading(false);
        return;
      }

      showToast(data.message || `Account created successfully for ${newAccountData.name}!`, 'success');
      setNewAccountData({
        name: '',
        email: '',
        phoneNumber: '',
        role: 'EMPLOYEE',
        division: '',
        section: '',
        position: '',
        signatureData: null,
        consent: false,
      });
      setShowManualCreate(false);
      fetchUsers();
      router.push('/account-manager?tab=accounts');
    } catch (err: any) {
      showToast(err.message || 'An error occurred creating account.', 'error');
    } finally {
      setCreateAccountLoading(false);
    }
  };

  // Handle Submit TA Request (5-step wizard submit)
  const handleCreateTaSubmit = async () => {
    if (!createForm.purpose.trim() || !createForm.destination.trim()) {
      showToast('Please provide travel purpose and destination.', 'error');
      return;
    }

    setTaSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/ta-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: createForm.purpose.trim(),
          destination: createForm.destination.trim(),
          destinationLat: createForm.destinationLat,
          destinationLng: createForm.destinationLng,
          startDate: createForm.departureDate,
          endDate: createForm.returnDate,
          attachments: createForm.attachments,
          submitImmediately: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to create Travel Order request.');
        showToast(data.error || 'Failed to create Travel Order request.', 'error');
        setTaSubmitting(false);
        return;
      }

      showToast(`Travel Order request ${data.data.trackingNumber} submitted successfully!`, 'success');
      setWizardStep(1);
      setCreateForm(getInitialCreateForm());
      setTaSubTab('list');
      fetchMyTaRequests();
    } catch (err: any) {
      showToast(err.message || 'An error occurred submitting TA request.', 'error');
    } finally {
      setTaSubmitting(false);
    }
  };

  // Filtered Users List
  const filteredUsersList = users.filter((u) => {
    const matchQuery =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.section && u.section.toLowerCase().includes(userSearch.toLowerCase())) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase());

    const matchRole =
      roleFilter === 'ALL'
        ? true
        : roleFilter === 'STAFF'
        ? ['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO'].includes(u.role)
        : u.role === roleFilter;

    const matchStatus = statusFilter === 'ALL' ? true : u.status === statusFilter;

    return matchQuery && matchRole && matchStatus;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-[8px] shadow-2xl font-medium text-[13px] flex items-center gap-2 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-500'
              : 'bg-rose-900 text-rose-100 border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white p-5 rounded-[8px] shadow-sm">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-white">Dashboard</h2>
              <p className="text-[13px] text-emerald-100/90 mt-0.5">Overview of TOPS account management and user administration</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/account-manager?tab=pending-accounts')}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Pending Accounts</span>
                {counts.pending > 0 && (
                  <span className="h-5 px-2 inline-flex items-center justify-center rounded-[4px] bg-amber-400 text-[#1D1D1F] text-[10px] font-semibold">
                    {counts.pending}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/account-manager?tab=create-travel')}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-emerald-100 hover:bg-emerald-200 text-[#0F4C2E] border border-emerald-300 cursor-pointer"
              >
                <svg className="w-4 h-4 text-[#0F4C2E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>File Travel Order</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#0F4C2E] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Total Accounts</p>
                <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">{counts.total || users.length || 12}</p>
                <span className="text-[12px] font-medium text-emerald-700 mt-0.5 inline-block">
                  +2 this month
                </span>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-emerald-50 text-[#0F4C2E] border border-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Active Users</p>
                <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">{counts.active || 8}</p>
                <span className="text-[12px] font-medium text-emerald-700 mt-0.5 inline-block">
                  {counts.total > 0 ? Math.round((counts.active / counts.total) * 100) : 67}% of total
                </span>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-emerald-100 text-[#0F4C2E] border border-emerald-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-blue-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Staff Accounts</p>
                <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">{counts.staff || 5}</p>
                <span className="text-[12px] font-normal text-[#86868B] mt-0.5 inline-block">
                  With elevated access
                </span>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Employee Accounts</p>
                <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">{counts.employee || 4}</p>
                <span className="text-[12px] font-medium text-amber-700 mt-0.5 inline-block">
                  +{counts.pending} pending review
                </span>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Recent Account Activities</h3>
                  <p className="text-[12px] text-[#86868B] mt-0.5">Audit log of system user modifications and activations</p>
                </div>
                <button
                  onClick={() => router.push('/account-manager?tab=accounts')}
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-emerald-50 hover:bg-emerald-100 text-[#0F4C2E] border border-emerald-200 cursor-pointer"
                >
                  <span>View All</span>
                  <span>↗</span>
                </button>
              </div>

              <div className="divide-y divide-[#E5E5E7]">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-emerald-50/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-[6px] border flex items-center justify-center shrink-0 ${
                          log.type === 'key'
                            ? 'bg-amber-50 border-amber-100'
                            : log.type === 'ban'
                            ? 'bg-rose-50 border-rose-100'
                            : log.type === 'building'
                            ? 'bg-blue-50 border-blue-100'
                            : 'bg-emerald-50 border-emerald-100'
                        }`}
                      >
                        {renderActivityIcon(log.type)}
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-[#1D1D1F]">
                          {log.action} — <span className="text-[#0F4C2E] font-semibold">{log.target}</span>
                        </p>
                        <p className="text-[12px] text-[#86868B]">by {log.actor}</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#86868B] shrink-0">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Newest Accounts</h3>
                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-100 text-[#0F4C2E] border border-emerald-200 uppercase">
                  Live
                </span>
              </div>

              <div className="divide-y divide-[#E5E5E7]">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="px-5 py-3 hover:bg-emerald-50/40 transition-colors flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-medium text-[#1D1D1F] leading-tight truncate">{u.name}</h4>
                      <p className="text-[12px] font-mono text-[#86868B] mt-0.5 truncate">{u.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] uppercase ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : u.status === 'PENDING_REVIEW'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.status === 'PENDING_REVIEW' ? 'Pending' : u.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VIEW ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="space-y-5">
          <div className="bg-[#0F4C2E] text-white p-5 rounded-[8px] shadow-md flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-white">View Accounts</h2>
              <p className="text-[13px] text-emerald-100/90 mt-0.5">
                Manage all TOPS users — employees, staff, reviewers, and signatories — from one place.
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[24px] font-bold tracking-tight text-white">{users.length}</span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">Total Accounts</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E5E5E7] pb-3">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                roleFilter === 'ALL'
                  ? 'bg-[#0F4C2E] text-white shadow-xs'
                  : 'bg-white text-[#1D1D1F] hover:bg-emerald-50/50 border border-[#E5E5E7]'
              }`}
            >
              All Accounts ({counts.total})
            </button>
            <button
              onClick={() => setRoleFilter('EMPLOYEE')}
              className={`h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                roleFilter === 'EMPLOYEE'
                  ? 'bg-[#0F4C2E] text-white shadow-xs'
                  : 'bg-white text-[#1D1D1F] hover:bg-emerald-50/50 border border-[#E5E5E7]'
              }`}
            >
              Employee Accounts ({counts.employee})
            </button>
            <button
              onClick={() => setRoleFilter('STAFF')}
              className={`h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                roleFilter === 'STAFF'
                  ? 'bg-[#0F4C2E] text-white shadow-xs'
                  : 'bg-white text-[#1D1D1F] hover:bg-emerald-50/50 border border-[#E5E5E7]'
              }`}
            >
              Staff / Signatories ({counts.staff})
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#0F4C2E] shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Total</p>
              <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-0.5">{counts.total}</p>
            </div>
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Active</p>
              <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-0.5">{counts.active}</p>
            </div>
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Pending</p>
              <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-0.5">{counts.pending}</p>
            </div>
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-rose-500 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Inactive</p>
              <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-0.5">{counts.inactive}</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-[8px] border border-[#E5E5E7] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, ID, email, or section..."
                className="w-full pl-8 pr-2.5 h-8 text-[13px] text-[#1D1D1F] bg-slate-50 border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#0F4C2E]/20 focus:border-[#0F4C2E]"
              />
              <svg className="w-4 h-4 text-[#86868B] absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[6px] border border-[#E5E5E7] w-full sm:w-auto overflow-x-auto">
              {['ALL', 'ACTIVE', 'DEACTIVATED', 'PENDING_REVIEW'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`h-7 px-2.5 text-xs font-medium rounded-[4px] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    statusFilter === st ? 'bg-[#0F4C2E] text-white shadow-2xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st === 'PENDING_REVIEW' ? 'Pending' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-[13px] text-[#86868B]">Loading system accounts directory...</div>
            ) : filteredUsersList.length === 0 ? (
              <div className="p-12 text-center text-[13px] text-[#86868B]">No accounts match your current filter parameters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                    <tr>
                      <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Employee</th>
                      <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Section / Division</th>
                      <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">Role</th>
                      <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">Status</th>
                      <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Registration Date</th>
                      <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E7]">
                    {filteredUsersList.map((u) => (
                      <tr key={u.id} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors">
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0F4C2E] font-semibold text-[12px] flex items-center justify-center shrink-0">
                              {u.name.substring(0, 1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-[#1D1D1F] text-[13px]">{u.name}</p>
                                {u.username && (
                                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-[4px] border border-slate-200">
                                    @{u.username}
                                  </span>
                                )}
                              </div>
                              <p className="text-[12px] text-[#86868B] font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">
                          <p className="font-normal text-[#1D1D1F] text-[13px]">{u.division || 'General Office'}</p>
                          {u.section && <p className="text-[12px] text-[#86868B]">{u.section}</p>}
                          {u.position && <p className="text-[12px] text-[#86868B] italic">{u.position}</p>}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {u.signatureUrl ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSignatureModalUser(u);
                                  setSignatureDataInput(null);
                                }}
                                className="h-5 inline-flex items-center justify-center gap-1 px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer group"
                                title="Official e-signature on file. Click to view or update signature."
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                <span>Signature on file</span>
                                <span className="underline ml-0.5 text-emerald-700">Edit</span>
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1 flex-wrap">
                                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-slate-100 text-slate-500 border border-slate-200">
                                  No signature
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSignatureModalUser(u);
                                    setSignatureDataInput(null);
                                  }}
                                  className="h-5 inline-flex items-center justify-center gap-1 px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Add official e-signature using stylus pen, board, or mouse"
                                >
                                  <span>+ Add signature</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">
                          <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-blue-50 text-blue-700 border border-blue-200">
                            {roleDisplayNames[u.role] || (u.role ? u.role.replace(/_/g, ' ') : '')}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">
                          <span
                            className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] uppercase ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : u.status === 'PENDING_REVIEW'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {u.status === 'PENDING_REVIEW' ? 'PENDING' : u.status}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-right space-x-1.5 whitespace-nowrap">
                          {u.status === 'PENDING_REVIEW' && (
                            <button
                              onClick={() => {
                                setSelectedUserForActivation(u);
                                setActivationSection(u.section || '');
                                setActivationPosition(u.position || '');
                                setActivationRole(u.role || 'EMPLOYEE');
                              }}
                              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-[#0F4C2E] hover:bg-[#165E3A] text-white cursor-pointer"
                            >
                              Activate
                            </button>
                          )}
                          {u.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleToggleStatus(u, 'DEACTIVATED')}
                              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                            >
                              Deactivate
                            </button>
                          )}
                          {u.status === 'DEACTIVATED' && (
                            <button
                              onClick={() => handleToggleStatus(u, 'ACTIVE')}
                              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                            >
                              Enable
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSignatureModalUser(u);
                              setSignatureDataInput(null);
                            }}
                            className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                            title="Manage official electronic signature"
                          >
                            Signature
                          </button>
                          <button
                            onClick={() => setResetUser(u)}
                            className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PENDING ACCOUNTS (Registration Review & Activation) */}
      {(activeTab === 'pending-accounts' || activeTab === 'create-account') && (() => {
        const pendingUsersList = users.filter((u) => u.status === 'PENDING_REVIEW');
        const filteredPendingUsers = pendingUsersList.filter((u) => {
          if (!pendingSearch.trim()) return true;
          const q = pendingSearch.toLowerCase().trim();
          return (
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.phoneNumber.toLowerCase().includes(q) ||
            (u.position && u.position.toLowerCase().includes(q)) ||
            (u.section && u.section.toLowerCase().includes(q))
          );
        });

        return (
          <div className="space-y-5 max-w-6xl mx-auto animate-fade-in pb-12">
            {/* Header Box */}
            <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[8px] bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Pending Accounts for Review</h2>
                    <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-amber-700 border border-amber-200">
                      {pendingUsersList.length} Awaiting Activation
                    </span>
                  </div>
                  <p className="text-[13px] text-[#86868B] mt-0.5">
                    Review employee accounts submitted through portal registration. Verify position and section assignment to activate and generate login credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                    placeholder="Search applicant name, email..."
                    className="w-full pl-8 pr-2.5 h-8 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                  />
                  <svg className="w-4 h-4 text-[#86868B] absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={fetchUsers}
                  className="h-8 w-8 inline-flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-[6px] transition-colors cursor-pointer border border-[#E5E5E7] bg-white"
                  title="Refresh pending list"
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* List of Pending Applicants */}
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((sk) => (
                  <div key={`sk-${sk}`} className="bg-white rounded-[8px] border border-[#E5E5E7] p-5 space-y-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#F5F5F7] rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-[#F5F5F7] rounded w-1/3" />
                        <div className="h-3 bg-[#F5F5F7] rounded w-1/4" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="h-3 bg-[#F5F5F7] rounded" />
                      <div className="h-3 bg-[#F5F5F7] rounded" />
                      <div className="h-3 bg-[#F5F5F7] rounded" />
                      <div className="h-3 bg-[#F5F5F7] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPendingUsers.length === 0 ? (
              <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs p-10 text-center max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">
                    {pendingSearch ? 'No matching pending accounts found' : 'All Caught Up! No Pending Accounts'}
                  </h3>
                  <p className="text-[13px] text-[#86868B] max-w-md mx-auto leading-relaxed">
                    {pendingSearch
                      ? `No pending applicant records match "${pendingSearch}". Try clearing your search filter.`
                      : 'There are currently no employee registrations waiting for review. When new employees submit an account registration via the portal, their records will appear here.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <button
                    onClick={() => router.push('/account-manager?tab=accounts')}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] cursor-pointer"
                  >
                    View All Accounts
                  </button>
                  <button
                    onClick={() => setShowManualCreate(!showManualCreate)}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white cursor-pointer"
                  >
                    {showManualCreate ? 'Hide Form' : '+ Manual Registration'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredPendingUsers.map((u) => {
                  const initials = u.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={u.id}
                      className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Avatar, Name, Status Badge */}
                        <div className="flex items-center justify-between gap-3 bg-[#F5F5F7] border-b border-[#E5E5E7] px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#1B4332]/10 text-[#1B4332] font-semibold text-[13px] flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <h3 className="text-[14px] font-semibold text-[#1D1D1F]">{u.name}</h3>
                              <p className="text-[12px] text-[#86868B]">{u.position || 'Employee Applicant'}</p>
                            </div>
                          </div>
                          <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            PENDING REVIEW
                          </span>
                        </div>

                        {/* Submitted Information Details */}
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[13px]">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">Email Address</span>
                            <p className="font-normal text-[#1D1D1F] font-mono text-[12px] truncate">{u.email}</p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">Mobile Number</span>
                            <p className="font-normal text-[#1D1D1F] font-mono text-[12px]">{u.phoneNumber}</p>
                            <span className="text-[11px] text-emerald-700 block">Receives SMS login credentials</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">Requested Division</span>
                            <p className="font-medium text-[#1B4332] truncate">{u.division || 'Not specified'}</p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">Requested Section</span>
                            <p className="font-normal text-[#1D1D1F] truncate">{u.section || 'N/A'}</p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">Registered Date</span>
                            <p className="font-normal text-[#1D1D1F]">
                              {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          {u.birthday && (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">Birthday</span>
                              <p className="font-normal text-[#1D1D1F]">{u.birthday}</p>
                            </div>
                          )}
                          {u.address && (
                            <div className="space-y-0.5 sm:col-span-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">Home Address</span>
                              <p className="font-normal text-[#1D1D1F] truncate">{u.address}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Action Buttons */}
                      <div className="px-5 py-3 bg-[#F5F5F7]/60 border-t border-[#E5E5E7] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u, 'DEACTIVATED')}
                          className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForActivation(u);
                            setActivationSection(u.section || '');
                            setActivationPosition(u.position || '');
                            setActivationRole(u.role || 'EMPLOYEE');
                          }}
                          className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Review & Activate Account</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Optional Manual Registration Accordion */}
            <div className="mt-6 pt-5 border-t border-[#E5E5E7]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-semibold text-[#1D1D1F]">Need to directly register an employee?</h4>
                  <p className="text-[12px] text-[#86868B]">Add an employee directly who cannot submit registration online.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualCreate(!showManualCreate)}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white border border-[#E5E5E7] hover:bg-[#F2F2F7] text-[#1D1D1F] cursor-pointer"
                >
                  {showManualCreate ? 'Hide Form' : '+ Manual Registration Form'}
                </button>
              </div>

              {showManualCreate && (
                <div className="mt-4 bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden animate-fade-in">
                  <div className="px-5 py-3.5 bg-[#F5F5F7] border-b border-[#E5E5E7] flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Manual Employee Registration</h3>
                  </div>

                  <form onSubmit={handleCreateAccountSubmit} className="p-5 space-y-5">
                    {/* Section 1: Employee Information */}
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-3">1. Employee Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={newAccountData.name}
                            onChange={(e) => setNewAccountData({ ...newAccountData, name: e.target.value })}
                            placeholder="e.g. Maria Clara Santos"
                            className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">Email Address *</label>
                          <input
                            type="email"
                            required
                            value={newAccountData.email}
                            onChange={(e) => setNewAccountData({ ...newAccountData, email: e.target.value })}
                            placeholder="name@denr.gov.ph"
                            className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">Phone Number *</label>
                          <input
                            type="text"
                            required
                            value={newAccountData.phoneNumber}
                            onChange={(e) => setNewAccountData({ ...newAccountData, phoneNumber: e.target.value })}
                            placeholder="09170000000"
                            className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">Role *</label>
                          <select
                            value={newAccountData.role}
                            onChange={(e) => setNewAccountData({ ...newAccountData, role: e.target.value })}
                            className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                          >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="SECTION_CHIEF">Section Chief (Signatory)</option>
                            <option value="DIVISION_CHIEF">Division Chief (Signatory)</option>
                            <option value="HEAD_PENRO">Head of PENRO (Signatory)</option>
                            <option value="ACCOUNT_MANAGER">Account Manager</option>
                            <option value="ADMIN">System Administrator</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Organizational Assignment */}
                    <div className="pt-3 border-t border-[#E5E5E7]">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-3">2. Organizational Assignment</h4>
                      {newAccountData.role === 'HEAD_PENRO' ? (
                        <div className="space-y-4">
                          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-[8px] text-[12px] text-emerald-900 flex items-start gap-2.5">
                            <svg className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <div>
                              <p className="font-semibold text-emerald-900">PENRO Executive Office (Head of Office)</p>
                              <p className="mt-0.5 text-emerald-800 leading-relaxed">
                                As the Head of Office and Final Approving Authority, the Head of PENRO oversees all operations across both Management Services Division and Technical Services Division. Division and Section selections are not required.
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">
                              Position * <span className="text-[#86868B] font-normal">(Official Designation)</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={newAccountData.position}
                              onChange={(e) => setNewAccountData({ ...newAccountData, position: e.target.value })}
                              placeholder="e.g. Provincial Environment and Natural Resources Officer"
                              className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">Division *</label>
                            <select
                              required
                              value={newAccountData.division}
                              onChange={(e) => {
                                const newDiv = e.target.value;
                                setNewAccountData((prev) => ({
                                  ...prev,
                                  division: newDiv,
                                  section: '', // Clear dependent section on division switch
                                }));
                              }}
                              className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                            >
                              <option value="">Select Division...</option>
                              {orgDivisions.map((div) => (
                                <option key={div.id} value={div.name}>
                                  {div.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">
                              Section {(() => {
                                const selDiv = orgDivisions.find((d) => d.name === newAccountData.division);
                                if (!newAccountData.division) return <span className="text-[#86868B] font-normal">(Select Division first)</span>;
                                if (selDiv && (!selDiv.sections || selDiv.sections.length === 0)) return <span className="text-emerald-700 font-normal">(No section required)</span>;
                                return <span className="text-red-600">*</span>;
                              })()}
                            </label>
                            {(() => {
                              const selDiv = orgDivisions.find((d) => d.name === newAccountData.division);
                              const divHasSections = selDiv && selDiv.sections && selDiv.sections.length > 0;
                              return (
                                <select
                                  required={!!divHasSections}
                                  disabled={!newAccountData.division || !divHasSections}
                                  value={newAccountData.section}
                                  onChange={(e) => setNewAccountData({ ...newAccountData, section: e.target.value })}
                                  className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="">
                                    {!newAccountData.division
                                      ? 'Choose a Division above'
                                      : !divHasSections
                                      ? 'No section required for this division'
                                      : 'Select Dependent Section...'}
                                  </option>
                                  {(selDiv?.sections || []).map((sec) => (
                                    <option key={sec.id} value={sec.name}>
                                      {sec.name}
                                    </option>
                                  ))}
                                </select>
                              );
                            })()}
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">
                              Position * <span className="text-[#86868B] font-normal">(Manually entered)</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={newAccountData.position}
                              onChange={(e) => setNewAccountData({ ...newAccountData, position: e.target.value })}
                              placeholder="e.g. Environmental Specialist / Forest Ranger / Administrative Officer"
                              className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 3: E-Signature Capture */}
                    <div className="pt-3 border-t border-[#E5E5E7]">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-3">3. E-Signature Authorization</h4>
                      <SignaturePad
                        onChange={(sig) => setNewAccountData((prev) => ({ ...prev, signatureData: sig }))}
                      />

                      <div className="mt-3 bg-[#F5F5F7] p-3.5 rounded-[6px] border border-[#E5E5E7]">
                        <label className="flex items-start gap-2.5 text-[12px] text-[#1D1D1F] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newAccountData.consent}
                            onChange={(e) => setNewAccountData((prev) => ({ ...prev, consent: e.target.checked }))}
                            className="mt-0.5 rounded border-[#E5E5E7] text-[#1B4332] focus:ring-[#1B4332]"
                          />
                          <span className="leading-relaxed">
                            I verify that the employee is physically present for walk-in registration, and authorizes the recording of this electronic signature for use on official <strong>DENR Travel Orders</strong> pursuant to the Electronic Commerce Act (RA 8792).
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end gap-2.5 border-t border-[#E5E5E7]">
                      <button
                        type="button"
                        onClick={() => setShowManualCreate(false)}
                        className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createAccountLoading}
                        className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white disabled:opacity-50 cursor-pointer"
                      >
                        {createAccountLoading ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Registering Employee...</span>
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Bottom Guideline Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-1">
                <h4 className="text-[14px] font-semibold text-[#1D1D1F]">Registration Review</h4>
                <p className="text-[12px] text-[#86868B]">Applicant credentials require HRMO review and approval before system activation.</p>
              </div>
              <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-1">
                <h4 className="text-[14px] font-semibold text-[#1D1D1F]">Role & Unit Assignment</h4>
                <p className="text-[12px] text-[#86868B]">Confirm or adjust position, section, and signatory scope during the review step.</p>
              </div>
              <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs space-y-1">
                <h4 className="text-[14px] font-semibold text-[#1D1D1F]">Automated SMS Credentials</h4>
                <p className="text-[12px] text-[#86868B]">Approved users receive immediate SMS login instructions with generated credentials.</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 4: PASSWORD MANAGEMENT */}
      {activeTab === 'password-management' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Pending Resets</p>
                <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">2</p>
              </div>
              <div className="w-10 h-10 rounded-[8px] bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Recovered This Month</p>
                <p className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1">5</p>
              </div>
              <div className="w-10 h-10 rounded-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-blue-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Password Policy</p>
                <p className="text-[14px] font-semibold text-[#1D1D1F] mt-1">8+ chars enforced</p>
              </div>
              <div className="w-10 h-10 rounded-[8px] bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-100/90 border-b border-[#E5E5E7]">
              <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Password & Recovery Actions</h3>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                  <tr>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">User</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">Role</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">Status</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E7]">
                  {filteredUsersList.map((u) => (
                    <tr key={u.id} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors">
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">
                        <div>
                          <p className="font-medium text-[#1D1D1F]">{u.name}</p>
                          <p className="text-[12px] text-[#86868B] font-mono">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">
                        <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-blue-50 text-blue-700 border border-blue-200">
                          {roleDisplayNames[u.role] || (u.role ? u.role.replace(/_/g, ' ') : '')}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">
                        <span
                          className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] uppercase ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : u.status === 'PENDING_REVIEW'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]'
                          }`}
                        >
                          {u.status === 'PENDING_REVIEW' ? 'PENDING' : u.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-right">
                        <button
                          onClick={() => setResetUser(u)}
                          className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white cursor-pointer"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CONFIGURATION */}
      {activeTab === 'configuration' && (
        <div className="space-y-5 max-w-4xl mx-auto">
          <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white">
              <div className="w-8 h-8 rounded-[6px] bg-white/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-white">Account Manager System Configuration</h2>
                <p className="text-[12px] text-emerald-100/80">Configure global account management policies, notification triggers, and station parameters.</p>
              </div>
            </div>

            <div className="p-6 space-y-5 text-[13px]">
              <div className="p-5 bg-slate-50/70 rounded-[8px] border border-slate-200/80 space-y-4">
                <h3 className="text-[13px] font-bold text-[#0F4C2E] uppercase tracking-wider">Account Management Settings</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">Default Role for New Users</label>
                    <select
                      value={configSettings.defaultRole}
                      onChange={(e) => setConfigSettings({ ...configSettings, defaultRole: e.target.value })}
                      className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="SECTION_CHIEF">SECTION_CHIEF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">Session Inactivity Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={configSettings.sessionTimeoutMins}
                      onChange={(e) => setConfigSettings({ ...configSettings, sessionTimeoutMins: Number(e.target.value) })}
                      className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center justify-between p-3.5 bg-white rounded-[6px] border border-[#E5E5E7] cursor-pointer hover:bg-[#F2F2F7] transition-colors">
                    <div>
                      <p className="font-medium text-[#1D1D1F]">Require Account Manager Review for Registrations</p>
                      <p className="text-[12px] text-[#86868B]">Prevent self-registered users from logging in until activated.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configSettings.requireApproval}
                      onChange={(e) => setConfigSettings({ ...configSettings, requireApproval: e.target.checked })}
                      className="w-4 h-4 text-[#1B4332] rounded border-[#E5E5E7] focus:ring-[#1B4332]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-white rounded-[6px] border border-[#E5E5E7] cursor-pointer hover:bg-[#F2F2F7] transition-colors">
                    <div>
                      <p className="font-medium text-[#1D1D1F]">Auto-Deactivate Inactive Accounts</p>
                      <p className="text-[12px] text-[#86868B]">Automatically set status to DEACTIVATED after 90 days of inactivity.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configSettings.autoDeactivate}
                      onChange={(e) => setConfigSettings({ ...configSettings, autoDeactivate: e.target.checked })}
                      className="w-4 h-4 text-[#1B4332] rounded border-[#E5E5E7] focus:ring-[#1B4332]"
                    />
                  </label>
                </div>
              </div>

              <div className="p-5 bg-[#F5F5F7] rounded-[8px] border border-[#E5E5E7] space-y-4">
                <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Notification Preferences</h3>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-3.5 bg-white rounded-[6px] border border-[#E5E5E7] cursor-pointer hover:bg-[#F2F2F7] transition-colors">
                    <div>
                      <p className="font-medium text-[#1D1D1F]">Send SMS Notification on Account Activation</p>
                      <p className="text-[12px] text-[#86868B]">Automatically dispatch SMS via Semaphore API when account is activated.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configSettings.smsActivationAlert}
                      onChange={(e) => setConfigSettings({ ...configSettings, smsActivationAlert: e.target.checked })}
                      className="w-4 h-4 text-[#1B4332] rounded border-[#E5E5E7] focus:ring-[#1B4332]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-white rounded-[6px] border border-[#E5E5E7] cursor-pointer hover:bg-[#F2F2F7] transition-colors">
                    <div>
                      <p className="font-medium text-[#1D1D1F]">In-App Notification Alerts</p>
                      <p className="text-[12px] text-[#86868B]">Notify managers in real-time when a new user signs up.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configSettings.emailNotification}
                      onChange={(e) => setConfigSettings({ ...configSettings, emailNotification: e.target.checked })}
                      className="w-4 h-4 text-[#1B4332] rounded border-[#E5E5E7] focus:ring-[#1B4332]"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    showToast('Configuration settings saved successfully!', 'success');
                  }}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CREATE TRAVEL (FULL 5-STEP EMPLOYEE TA WIZARD) */}
      {activeTab === 'create-travel' && (
        <div className="space-y-5 max-w-5xl mx-auto">
          {/* Sub-navigation tabs */}
          <div className="flex items-center gap-2 border-b border-[#E5E5E7] pb-3">
            <button
              onClick={() => setTaSubTab('create')}
              className={`h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                taSubTab === 'create'
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-white text-[#1D1D1F] hover:bg-[#F2F2F7] border border-[#E5E5E7]'
              }`}
            >
              + File New Travel Order
            </button>
            <button
              onClick={() => setTaSubTab('list')}
              className={`h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                taSubTab === 'list'
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-white text-[#1D1D1F] hover:bg-[#F2F2F7] border border-[#E5E5E7]'
              }`}
            >
              My Submitted TA Requests ({myTaRequests.length})
            </button>
          </div>

          {taSubTab === 'create' ? (
            <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden animate-fade-in">
              {/* Wizard Stepper Bar */}
              <div className="bg-[#F5F5F7] border-b border-[#E5E5E7] px-6 py-4 relative isolate">
                <div className="flex items-center justify-between relative px-4 sm:px-8">
                  <div className="absolute left-12 right-12 top-4 h-px bg-[#E5E5E7] z-0"></div>

                  {[
                    { s: 1, title: 'Travel Dates' },
                    { s: 2, title: 'Employee Info' },
                    { s: 3, title: 'Travel Details' },
                    { s: 4, title: 'Additional Info' },
                    { s: 5, title: 'Review' },
                  ].map((stepItem) => {
                    const isDone = wizardStep > stepItem.s;
                    const isCurrent = wizardStep === stepItem.s;
                    return (
                      <div key={stepItem.s} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full font-semibold text-xs flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-[#1B4332] text-white'
                              : isCurrent
                              ? 'bg-[#1B4332] text-white ring-4 ring-[#1B4332]/15 font-bold'
                              : 'bg-white border border-[#E5E5E7] text-[#86868B]'
                          }`}
                        >
                          {isDone ? '✓' : stepItem.s}
                        </div>
                        <span className={`text-[12px] mt-1.5 ${isCurrent ? 'text-[#1B4332] font-semibold' : 'text-[#86868B] font-medium'}`}>
                          {stepItem.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Wizard Body Card */}
              <div className="p-6 space-y-6">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-[6px] font-medium">
                    {formError}
                  </div>
                )}

                {/* STEP 1: Select Travel Dates */}
                {wizardStep === 1 && (
                  <div className="space-y-5">
                    <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Select Travel Dates</h3>
                    <DualMonthCalendarPicker
                      departureDate={createForm.departureDate}
                      returnDate={createForm.returnDate}
                      onSelectDeparture={(date) => setCreateForm((prev) => ({ ...prev, departureDate: date }))}
                      onSelectReturn={(date) => setCreateForm((prev) => ({ ...prev, returnDate: date }))}
                    />
                  </div>
                )}

                {/* STEP 2: Employee Info */}
                {wizardStep === 2 && (
                  <div className="space-y-5">
                    <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Employee Information</h3>

                    <div className="p-3.5 bg-[#F5F5F7] rounded-[8px] border border-[#E5E5E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[6px] bg-[#1B4332] text-white flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">
                            Selected Travel Dates (Set in Step 1)
                          </span>
                          <p className="text-[13px] font-semibold text-[#1D1D1F] mt-0.5">
                            Departure: <span className="text-[#1B4332]">{createForm.departureDate || 'Not specified'}</span>
                            <span className="mx-2 text-[#E5E5E7]">|</span>
                            Return: <span className="text-[#1B4332]">{createForm.returnDate || 'Not specified'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5 flex items-center justify-between">
                          <span>Select a Name *</span>
                          {loadingEmployees && (
                            <span className="text-[11px] text-emerald-700 font-normal">Loading from database...</span>
                          )}
                        </label>
                        <select
                          required
                          value={createForm.employeeName}
                          onChange={(e) => handleEmployeeSelect(e.target.value)}
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] cursor-pointer"
                        >
                          <option value="">-- Select a Name --</option>
                          {employeeList.map((emp) => (
                            <option key={emp.id || emp.name} value={emp.name}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-[12px] text-[#86868B] mt-1">Select an employee from the database directory.</p>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Travel Area *
                        </label>
                        <select
                          value={createForm.travelArea}
                          onChange={(e) => setCreateForm({ ...createForm, travelArea: e.target.value })}
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] cursor-pointer"
                        >
                          <option value="WITHIN AOR">WITHIN AOR</option>
                          <option value="OUTSIDE CARAGA">OUTSIDE CARAGA</option>
                        </select>
                        <p className="text-[12px] text-[#86868B] mt-1">Area of Responsibility scope for this mission.</p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5 flex items-center justify-between">
                          <span>Position</span>
                          <span className="h-5 inline-flex items-center justify-center gap-1 px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Read-Only (Auto-filled)
                          </span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={createForm.position || createForm.designation || ''}
                          placeholder="Position will automatically populate upon selecting an employee above..."
                          className="w-full h-8 px-2.5 text-[13px] text-[#86868B] bg-[#F5F5F7] border border-[#E5E5E7] rounded-[6px] outline-none cursor-not-allowed select-none"
                        />
                        <p className="text-[12px] text-[#86868B] mt-1">Automatically retrieved from the employee database record.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Travel Details */}
                {wizardStep === 3 && (
                  <div className="space-y-5">
                    <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Travel Details</h3>

                    <div className="space-y-4">
                      <div className="relative">
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Destination *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={createForm.destination}
                            onChange={(e) => setCreateForm({ ...createForm, destination: e.target.value })}
                            onFocus={() => {
                              if (locationSuggestions.length > 0) setShowLocationDropdown(true);
                            }}
                            placeholder="Search a place, office, or barangay (e.g., Fili, Makati, Los Baños)..."
                            className="w-full pl-8 pr-8 h-8 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                          />
                          <svg className="w-4 h-4 text-[#86868B] absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>

                          {isSearchingLocation && (
                            <div className="absolute right-2.5 top-2">
                              <div className="w-4 h-4 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>

                        {showLocationDropdown && locationSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E5E7] rounded-[8px] shadow-lg z-30 overflow-hidden divide-y divide-[#E5E5E7] animate-fade-in max-h-60 overflow-y-auto">
                            <div className="px-3 py-1.5 bg-[#F5F5F7] text-[11px] font-semibold text-[#86868B] uppercase tracking-wider flex justify-between items-center">
                              <span>Location Recommendations</span>
                              <button type="button" onClick={() => setShowLocationDropdown(false)} className="hover:text-[#1D1D1F]">
                                ✕
                              </button>
                            </div>
                            {locationSuggestions.map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  skipNextSearchRef.current = true;
                                  setCreateForm((prev) => ({
                                    ...prev,
                                    destination: item.fullAddress || item.name,
                                    destinationLat: item.lat,
                                    destinationLng: item.lng,
                                  }));
                                  setShowLocationDropdown(false);
                                }}
                                className="w-full px-3.5 py-2 text-left hover:bg-[#F2F2F7] transition-colors flex items-start gap-2.5 group"
                              >
                                <svg className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-medium text-[#1D1D1F] group-hover:text-[#1B4332] truncate">{item.name}</p>
                                  <p className="text-[12px] text-[#86868B] truncate">{item.fullAddress}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Interactive Map Pick
                        </label>
                        <DynamicMapPicker
                          initialLat={createForm.destinationLat}
                          initialLng={createForm.destinationLng}
                          onLocationSelect={async (lat, lng) => {
                            skipNextSearchRef.current = true;
                            setCreateForm((prev) => ({ ...prev, destinationLat: lat, destinationLng: lng }));
                            try {
                              const res = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                                { headers: { 'User-Agent': 'TAPS-App' } }
                              );
                              if (res.ok) {
                                const data = await res.json();
                                const fullAddr = formatNominatimAddress(data) || data.display_name;
                                if (fullAddr) {
                                  setCreateForm((prev) => ({ ...prev, destination: fullAddr }));
                                }
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Purpose of Travel *
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={createForm.purpose}
                          onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                          placeholder="Describe the purpose of your travel..."
                          className="w-full p-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Additional Information */}
                {wizardStep === 4 && (
                  <div className="space-y-5">
                    <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Additional Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">Salary Grade</label>
                        <input
                          type="text"
                          value={createForm.salaryGrade}
                          onChange={(e) => setCreateForm({ ...createForm, salaryGrade: e.target.value })}
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">Division/Section/Unit</label>
                        <input
                          type="text"
                          value={createForm.division}
                          onChange={(e) => setCreateForm({ ...createForm, division: e.target.value })}
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">Station</label>
                        <input
                          type="text"
                          value={createForm.station}
                          onChange={(e) => setCreateForm({ ...createForm, station: e.target.value })}
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">Employment Status</label>
                        <input
                          type="text"
                          value={createForm.employmentStatus}
                          onChange={(e) => setCreateForm({ ...createForm, employmentStatus: e.target.value })}
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">Office</label>
                        <input
                          type="text"
                          value={createForm.office}
                          onChange={(e) => setCreateForm({ ...createForm, office: e.target.value })}
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">Signatory Station</label>
                        <input
                          type="text"
                          value={createForm.signatoryStation}
                          onChange={(e) => setCreateForm({ ...createForm, signatoryStation: e.target.value })}
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Per Diems/Expense Allowed
                        </label>
                        <input
                          type="text"
                          value={createForm.perDiems}
                          onChange={(e) => setCreateForm({ ...createForm, perDiems: e.target.value })}
                          placeholder="Enter per diems information..."
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Appropriations to which travel should be charged
                        </label>
                        <input
                          type="text"
                          value={createForm.appropriations}
                          onChange={(e) => setCreateForm({ ...createForm, appropriations: e.target.value })}
                          placeholder="Enter appropriations Information..."
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Remarks or Special Instructions
                        </label>
                        <textarea
                          rows={3}
                          value={createForm.remarks}
                          onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                          placeholder="Enter any remarks or special instructions..."
                          className="w-full p-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Certification
                        </label>
                        <input
                          type="text"
                          value={createForm.certification}
                          onChange={(e) => setCreateForm({ ...createForm, certification: e.target.value })}
                          placeholder="Enter certification details..."
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={createForm.contactNumber}
                          onChange={(e) => setCreateForm({ ...createForm, contactNumber: e.target.value })}
                          placeholder="Enter contact number..."
                          className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                        />
                      </div>

                      <div className="pt-2">
                        <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                          Supporting Documents * (e.g., Invitation Letter, Memorandum, Program of Activities)
                        </label>
                        <SupportingDocumentsUpload
                          attachments={createForm.attachments}
                          onChange={(newAtts) => setCreateForm((prev) => ({ ...prev, attachments: newAtts }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Review & Submit */}
                {wizardStep === 5 && (
                  <div className="space-y-5">
                    <div className="bg-[#0F4C2E] text-white rounded-[8px] p-4 flex items-center justify-between shadow-xs">
                      <div>
                        <h3 className="text-[16px] font-semibold text-white">Travel Order Request Summary</h3>
                        <p className="text-[12px] text-emerald-100/80 mt-0.5">Please review all submitted information before final submission.</p>
                      </div>
                      <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-800 text-emerald-100 border border-emerald-700 uppercase">
                        Ready
                      </span>
                    </div>

                    <div className="space-y-4 text-[13px]">
                      <div className="p-4 bg-emerald-50/50 rounded-[8px] border border-emerald-200/80 space-y-2">
                        <p className="font-semibold text-[#1D1D1F] text-[14px]">{createForm.destination}</p>
                        <p className="text-[#1D1D1F]">Dates: {createForm.departureDate} to {createForm.returnDate}</p>
                        <p className="text-[#1D1D1F]">Purpose: {createForm.purpose}</p>
                        <p className="text-[#86868B]">Employee: {createForm.employeeName} ({createForm.position})</p>
                        {createForm.perDiems && <p className="text-[#86868B]">Per Diems: {createForm.perDiems}</p>}
                        {createForm.appropriations && <p className="text-[#86868B]">Appropriations: {createForm.appropriations}</p>}
                        {createForm.remarks && <p className="text-[#86868B]">Remarks: {createForm.remarks}</p>}
                        {createForm.certification && <p className="text-[#86868B]">Certification: {createForm.certification}</p>}
                        {createForm.contactNumber && <p className="text-[#86868B]">Contact: {createForm.contactNumber}</p>}
                        <div className="pt-2 border-t border-emerald-200/80">
                          <p className="font-semibold text-[#1D1D1F] mb-1.5">
                            Supporting Documents: {createForm.attachments && createForm.attachments.length > 0 ? `${createForm.attachments.length} attached` : 'None attached'}
                          </p>
                          {createForm.attachments && createForm.attachments.length > 0 && (
                            <div className="space-y-1.5">
                              {createForm.attachments.map((doc, idx) => (
                                <div key={doc.id || idx} className="flex items-center justify-between text-[#1D1D1F] bg-white px-3 py-2 rounded-[6px] border border-emerald-200/80">
                                  <span className="font-medium truncate">{doc.name}</span>
                                  <span className="text-[12px] text-[#86868B]">
                                    {typeof doc.size === 'number' ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB` : (doc.size || '')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stepper Action Footer */}
                <div className="pt-5 border-t border-[#E5E5E7] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setTaSubTab('list')}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] cursor-pointer"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2.5">
                    {wizardStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setWizardStep((prev) => Math.max(prev - 1, 1))}
                        className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors border border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F2F2F7] cursor-pointer"
                      >
                        ‹ Previous
                      </button>
                    )}

                    {wizardStep < 5 ? (
                      <button
                        type="button"
                        onClick={() => setWizardStep((prev) => Math.min(prev + 1, 5))}
                        className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white cursor-pointer"
                      >
                        Next ›
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={taSubmitting}
                        onClick={handleCreateTaSubmit}
                        className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white disabled:opacity-50 cursor-pointer"
                      >
                        {taSubmitting ? 'Submitting...' : 'Submit Travel Order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-100/90 border-b border-[#E5E5E7]">
                <h3 className="text-[14px] font-semibold text-[#1D1D1F]">My Travel Order Requests</h3>
              </div>
              {myTaRequests.length === 0 ? (
                <div className="p-8 text-center text-[13px] text-[#86868B]">No travel order requests submitted yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                      <tr>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Tracking #</th>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Destination</th>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Dates</th>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E7]">
                      {myTaRequests.map((req) => (
                        <tr key={req.id} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors">
                          <td className="px-3 py-1.5 text-[13px] font-semibold text-[#1B4332] align-middle text-left">
                            <span className="px-2 py-0.5 rounded-[4px] bg-emerald-50 text-[#0F4C2E] border border-emerald-200/80 font-mono text-[12px] font-semibold">
                              {req.trackingNumber}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">{req.destination}</td>
                          <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left">
                            {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">
                            <span
                              className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] uppercase ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : req.status === 'REJECTED' || req.status === 'RETURNED'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activation Modal */}
      {selectedUserForActivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg border border-[#E5E5E7] rounded-[10px] shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[6px] bg-white/15 text-white border border-white/20 font-bold flex items-center justify-center text-xs">
                  ✓
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">
                    Review & Activate Account
                  </h3>
                  <p className="text-[12px] text-emerald-100/80">{selectedUserForActivation.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForActivation(null)}
                className="w-7 h-7 rounded-[6px] hover:bg-white/10 text-emerald-100 hover:text-white flex items-center justify-center font-semibold text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Applicant Submitted Credentials Details */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-[8px] space-y-2 text-[12px]">
                <span className="block text-[11px] font-semibold text-[#0F4C2E] uppercase tracking-wider">
                  Submitted Applicant Credentials
                </span>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span className="text-[#86868B] block">Notification Email:</span>
                    <span className="font-medium text-[#1D1D1F] font-mono truncate block">{selectedUserForActivation.email}</span>
                  </div>
                  <div>
                    <span className="text-[#86868B] block">SMS Mobile Number:</span>
                    <span className="font-medium text-[#1D1D1F] font-mono">{selectedUserForActivation.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-[#86868B] block">Division (Self-Reported):</span>
                    <span className="font-medium text-[#1B4332]">{selectedUserForActivation.division || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-[#86868B] block">Section (Self-Reported):</span>
                    <span className="font-normal text-[#1D1D1F]">{selectedUserForActivation.section || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#86868B] block">Position (Self-Reported):</span>
                    <span className="font-normal text-[#1D1D1F]">{selectedUserForActivation.position || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-[#86868B] block">Birthday:</span>
                    <span className="font-normal text-[#1D1D1F]">{selectedUserForActivation.birthday || 'Not specified'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#86868B] block">Home Address:</span>
                    <span className="font-normal text-[#1D1D1F] truncate block">{selectedUserForActivation.address || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleActivateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">
                      Position / Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={activationPosition}
                      onChange={(e) => setActivationPosition(e.target.value)}
                      placeholder="e.g. Planning Officer I"
                      className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">
                      Assign Section / Unit *
                    </label>
                    <input
                      type="text"
                      required
                      value={activationSection}
                      onChange={(e) => setActivationSection(e.target.value)}
                      placeholder="e.g. Planning Section"
                      className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">
                    System Role Assignment
                  </label>
                  <select
                    value={activationRole}
                    onChange={(e) => setActivationRole(e.target.value)}
                    className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                  >
                    <option value="EMPLOYEE">Employee (Standard Staff / Requester)</option>
                    <option value="SECTION_CHIEF">Section Chief (Level 1 Signatory)</option>
                    <option value="DIVISION_CHIEF">Division Chief (Level 2 Signatory)</option>
                    <option value="HEAD_PENRO">Head of PENRO (Final Approver)</option>
                    <option value="ACCOUNT_MANAGER">Account Manager (HR Administrator)</option>
                  </select>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-[8px] text-[12px] text-emerald-900 flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-emerald-900">Automated Credential Generation:</p>
                    <p className="mt-0.5 text-emerald-800">
                      Activating generates a standardized <strong>Username</strong> and <strong>Temporary Password</strong>, hashes them for security, and sends login details to <strong>{selectedUserForActivation.phoneNumber}</strong> (SMS) and <strong>{selectedUserForActivation.email}</strong> (Email).
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E7]">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForActivation(null)}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate & Generate Login</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials Confirmation Modal */}
      {generatedCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg border border-[#E5E5E7] rounded-[10px] shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-white/15 text-white border border-white/20 rounded-[6px] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">
                    Account Successfully Activated
                  </h3>
                  <p className="text-[12px] text-emerald-100/80">
                    Official TOPS login credentials have been generated and dispatched.
                  </p>
                </div>
              </div>
              <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-800 text-emerald-100 border border-emerald-700 uppercase">
                Active
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Generated Login Credentials Card */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-[8px] text-left space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Employee</span>
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">{generatedCredentialsModal.user.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1">
                      System Username
                    </span>
                    <div className="p-2.5 bg-white border border-[#E5E5E7] rounded-[6px] text-[13px] font-mono font-semibold text-[#1B4332]">
                      @{generatedCredentialsModal.credentials.username}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1">
                      Temp Password
                    </span>
                    <div className="p-2.5 bg-white border border-[#E5E5E7] rounded-[6px] text-[13px] font-mono font-semibold text-[#1D1D1F]">
                      {generatedCredentialsModal.credentials.tempPassword}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px] text-[#1D1D1F] pt-1">
                  <div>
                    <span className="text-[#86868B] block text-[11px]">Position:</span>
                    <span className="font-medium text-[#1D1D1F]">{generatedCredentialsModal.user.position || 'Employee'}</span>
                  </div>
                  <div>
                    <span className="text-[#86868B] block text-[11px]">Section:</span>
                    <span className="font-medium text-[#1D1D1F]">{generatedCredentialsModal.user.section || 'Planning Section'}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[6px] text-[12px] text-emerald-900 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                    <span>✓</span>
                    <span>Dispatched via Semaphore SMS & Resend Email</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Credentials sent to {generatedCredentialsModal.user.phoneNumber} and {generatedCredentialsModal.user.email}.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-[#E5E5E7]">
                <button
                  type="button"
                  onClick={() => {
                    const credText = `DENR TOPS Account Activated\nEmployee: ${generatedCredentialsModal.user.name}\nUsername: ${generatedCredentialsModal.credentials.username}\nPassword: ${generatedCredentialsModal.credentials.tempPassword}\nPosition: ${generatedCredentialsModal.user.position || 'Employee'}\nSection: ${generatedCredentialsModal.user.section || 'General'}`;
                    navigator.clipboard.writeText(credText);
                    setCopiedCredentials(true);
                    setTimeout(() => setCopiedCredentials(false), 3000);
                  }}
                  className="w-full sm:w-auto h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white border border-[#E5E5E7] text-[#1D1D1F] hover:bg-[#F2F2F7] cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedCredentials ? '✓ Copied to Clipboard!' : 'Copy Credentials'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratedCredentialsModal(null)}
                  className="w-full sm:w-auto h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md border border-[#E5E5E7] rounded-[10px] shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-white">Reset Password: {resetUser.name}</h3>
                <p className="text-[12px] text-emerald-100/80">{resetUser.email}</p>
              </div>
              <button
                onClick={() => setResetUser(null)}
                className="w-7 h-7 rounded-[6px] hover:bg-white/10 text-emerald-100 hover:text-white flex items-center justify-center font-semibold text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] font-mono bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E7]">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white disabled:opacity-50"
                >
                  {actionLoading ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Official E-Signature Management Modal ──────────────────────── */}
      {signatureModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[10px] max-w-lg w-full shadow-2xl border border-[#E5E5E7] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[6px] bg-white/15 flex items-center justify-center border border-white/20 text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">Official E-Signature Management</h3>
                  <p className="text-[12px] text-emerald-100/80">Affix or update digital signature for TOPS authentication</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!signatureSaving) {
                    setSignatureModalUser(null);
                    setSignatureDataInput(null);
                  }
                }}
                className="w-7 h-7 rounded-[6px] text-emerald-100 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* User Card */}
              <div className="p-3.5 bg-[#F5F5F7] border border-[#E5E5E7] rounded-[8px] flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-[14px] font-semibold text-[#1D1D1F]">{signatureModalUser.name}</h4>
                  <p className="text-[12px] text-[#86868B] font-mono">@{signatureModalUser.username} &bull; {signatureModalUser.email}</p>
                  <p className="text-[12px] text-[#86868B] mt-0.5">
                    {signatureModalUser.position || 'Personnel'} &bull; {signatureModalUser.section ? `${signatureModalUser.section}, ` : ''}{signatureModalUser.division || 'General Office'}
                  </p>
                </div>
                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  {roleDisplayNames[signatureModalUser.role] || signatureModalUser.role}
                </span>
              </div>

              {/* Existing Signature Preview (if on file) */}
              {signatureModalUser.signatureUrl && (
                <div className="p-3.5 bg-[#F5F5F7] border border-[#E5E5E7] rounded-[8px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                      Current Signature on File
                    </span>
                    <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>
                  <div className="h-20 bg-white rounded-[6px] border border-[#E5E5E7] flex items-center justify-center p-2 shadow-2xs">
                    <img
                      src={
                        signatureModalUser.signatureUrl.startsWith('data:')
                          ? signatureModalUser.signatureUrl
                          : `/api/signatures/${signatureModalUser.id}`
                      }
                      alt={`${signatureModalUser.name}'s signature`}
                      className="max-h-16 max-w-full object-contain mix-blend-multiply"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-[12px] text-[#86868B] text-center">
                    Sign below using stylus pen, board, or mouse to replace this existing signature.
                  </p>
                </div>
              )}

              {/* Signature Canvas Pad */}
              <div>
                <SignaturePad
                  onChange={(data) => setSignatureDataInput(data)}
                  label="Draw Official E-Signature"
                  description="Use a stylus pen, drawing tablet/board, touch screen, or desktop mouse. Must be clearly signed."
                  required={true}
                />
              </div>

              {/* Legal Notice */}
              <p className="text-[12px] text-[#86868B] leading-relaxed bg-[#F5F5F7] p-3 rounded-[6px] border border-[#E5E5E7]">
                Pursuant to RA 8792 (Electronic Commerce Act), this electronic signature serves as official legal authentication for Travel Order processing, endorsements, and approvals within DENR-PENRO.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-[#F5F5F7] border-t border-[#E5E5E7] flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={signatureSaving}
                onClick={() => {
                  setSignatureModalUser(null);
                  setSignatureDataInput(null);
                }}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors text-[#1D1D1F] bg-white hover:bg-[#F2F2F7] border border-[#E5E5E7] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={signatureSaving || !signatureDataInput}
                onClick={handleSaveSignature}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors text-white bg-[#1B4332] hover:bg-[#143225] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signatureSaving ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Saving Signature...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save &amp; Affix Signature</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountManagerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[13px] text-[#86868B]">Loading Account Management Portal...</div>}>
      <AccountManagerContent />
    </Suspense>
  );
}
