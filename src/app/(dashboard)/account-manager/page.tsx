'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DynamicMapPicker from '@/components/map/DynamicMapPicker';
import { formatNominatimAddress } from '@/utils/address';

interface UserRecord {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  section?: string | null;
  position?: string | null;
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

      let cellStyle = 'hover:bg-slate-100 text-slate-700 font-medium rounded-lg';
      if (isPast) {
        cellStyle = 'text-slate-300/80 bg-slate-50/50 cursor-not-allowed pointer-events-none line-through decoration-slate-300';
      } else if (isDeparture || isReturn) {
        cellStyle = 'bg-[#0F4C2E] text-white font-bold rounded-lg shadow-xs';
      } else if (inRange) {
        cellStyle = 'bg-emerald-100/70 text-emerald-900 font-semibold rounded-none';
      }

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          disabled={isPast}
          onClick={() => handleDayClick(year, month, day)}
          className={`py-2 text-xs transition-all flex items-center justify-center h-8 w-8 mx-auto ${cellStyle}`}
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-bold"
            >
              ‹
            </button>
            <span className="text-xs font-bold text-slate-800">
              {monthNames[month1Month]} {month1Year}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              {monthNames[month2Month]} {month2Year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-bold"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-xs font-bold text-slate-700 text-center mb-3">
              {monthNames[month1Month]} {month1Year}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={idx} className="text-[10px] font-bold text-slate-400 py-1">
                  {d}
                </div>
              ))}
              {renderMonthGrid(month1Year, month1Month)}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 text-center mb-3">
              {monthNames[month2Month]} {month2Year}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={idx} className="text-[10px] font-bold text-slate-400 py-1">
                  {d}
                </div>
              ))}
              {renderMonthGrid(month2Year, month2Month)}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 bg-[#F3F4F8] p-6 rounded-2xl space-y-6">
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-4">Selected Dates</h4>

          <div className="space-y-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Departure
                </span>
                <span className={`text-xs font-bold ${departureDate ? 'text-slate-900' : 'text-slate-400'}`}>
                  {formatDateDisplay(departureDate)}
                </span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${departureDate ? 'bg-[#0F4C2E]' : 'bg-slate-300'}`}></span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Return
                </span>
                <span className={`text-xs font-bold ${returnDate ? 'text-slate-900' : 'text-slate-400'}`}>
                  {formatDateDisplay(returnDate)}
                </span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${returnDate ? 'bg-[#0F4C2E]' : 'bg-slate-300'}`}></span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <span className="text-[11px] font-bold text-slate-600 block">Instructions:</span>
          <ol className="text-[11px] text-slate-500 space-y-1 pl-4 list-decimal leading-relaxed">
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

  // Create New Account Form State
  const [newAccountData, setNewAccountData] = useState({
    name: '',
    email: '',
    phoneNumber: '09170000000',
    role: 'EMPLOYEE',
    position: 'Environmental Specialist',
    section: 'PENRO Laguna',
    division: 'Forest Management Division',
  });
  const [createAccountLoading, setCreateAccountLoading] = useState(false);

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
    employeeName: 'Account Manager User',
    position: 'Account Manager',
    designation: 'System Administrator / Account Manager',
    travelArea: 'WITHIN AOR',
    destination: '',
    destinationLat: 14.275,
    destinationLng: 121.415,
    purpose: '',
    salaryGrade: '18',
    division: 'Management Services Division',
    station: 'PENRO Laguna',
    employmentStatus: 'Permanent',
    office: 'PENRO Laguna Main Station',
    signatoryStation: 'PENRO Main Station',
    perDiems: 'Standard Per Diem Allowed',
    appropriations: 'Regular Operational Fund',
    remarks: '',
    certification: 'I hereby certify that the travel requested is necessary for official public service.',
    contactNumber: '09170000000',
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
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    setCreateForm((prev) => ({
      ...prev,
      employeeName: name,
      position: pos,
      designation: pos,
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

  // Handle Create Account Submit
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAccountLoading(true);

    try {
      const res = await fetch('/api/account-manager/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccountData.name,
          email: newAccountData.email,
          phoneNumber: newAccountData.phoneNumber,
          role: newAccountData.role,
          section: newAccountData.section,
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
        phoneNumber: '09170000000',
        role: 'EMPLOYEE',
        position: 'Environmental Specialist',
        section: 'PENRO Laguna',
        division: 'Forest Management Division',
      });
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
          submitImmediately: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to create Travel Authority request.');
        showToast(data.error || 'Failed to create Travel Authority request.', 'error');
        setTaSubmitting(false);
        return;
      }

      showToast(`Travel Authority request ${data.data.trackingNumber} submitted successfully!`, 'success');
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
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl font-semibold text-xs flex items-center gap-2 border animate-bounce ${
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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Dashboard</h2>
              <p className="text-xs text-slate-500 mt-0.5">Overview of ETAPS account management and user administration</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/account-manager?tab=create-account')}
                className="px-4 py-2.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <span>+</span>
                <span>Create New Account</span>
              </button>
              <button
                onClick={() => router.push('/account-manager?tab=create-travel')}
                className="px-4 py-2.5 bg-emerald-100 text-[#0F4C2E] hover:bg-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-emerald-300"
              >
                <svg className="w-4 h-4 text-[#0F4C2E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>File Travel Authority</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Accounts</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{counts.total || users.length || 12}</p>
                <span className="text-[10px] font-bold text-emerald-700 mt-1 inline-block">
                  +2 this month
                </span>
              </div>
              <svg className="w-7 h-7 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Users</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{counts.active || 8}</p>
                <span className="text-[10px] font-bold text-emerald-700 mt-1 inline-block">
                  {counts.total > 0 ? Math.round((counts.active / counts.total) * 100) : 67}% of total
                </span>
              </div>
              <svg className="w-7 h-7 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Staff Accounts</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{counts.staff || 5}</p>
                <span className="text-[10px] font-bold text-slate-500 mt-1 inline-block">
                  With elevated access
                </span>
              </div>
              <svg className="w-7 h-7 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee Accounts</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{counts.employee || 4}</p>
                <span className="text-[10px] font-bold text-amber-700 mt-1 inline-block">
                  +{counts.pending} pending review
                </span>
              </div>
              <svg className="w-7 h-7 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5 border-b pb-4 border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Account Activities</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Audit log of system user modifications and activations</p>
                </div>
                <button
                  onClick={() => router.push('/account-manager?tab=accounts')}
                  className="text-xs font-bold text-[#0F4C2E] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <span>↗</span>
                </button>
              </div>

              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100/60">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {renderActivityIcon(log.type)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {log.action} — <span className="text-[#0F4C2E] font-semibold">{log.target}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">by {log.actor}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5 border-b pb-4 border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Newest Accounts</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live</span>
              </div>

              <div className="space-y-3.5">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{u.name}</h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold uppercase inline-flex items-center gap-1.5 ${
                          u.status === 'ACTIVE'
                            ? 'text-emerald-700'
                            : u.status === 'PENDING_REVIEW'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-600'
                              : u.status === 'PENDING_REVIEW'
                              ? 'bg-amber-500'
                              : 'bg-rose-600'
                          }`}
                        />
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
        <div className="space-y-6">
          <div className="bg-[#0F4C2E] text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white">View Accounts</h2>
              <p className="text-xs text-emerald-200/90 mt-1">
                Manage all ETAPS users — employees, staff, reviewers, and signatories — from one place.
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-3xl font-black text-white">{users.length}</span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Total Accounts</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                roleFilter === 'ALL' ? 'bg-[#0F4C2E] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Accounts ({counts.total})
            </button>
            <button
              onClick={() => setRoleFilter('EMPLOYEE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                roleFilter === 'EMPLOYEE' ? 'bg-[#0F4C2E] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Employee Accounts ({counts.employee})
            </button>
            <button
              onClick={() => setRoleFilter('STAFF')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                roleFilter === 'STAFF' ? 'bg-[#0F4C2E] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Staff / Signatories ({counts.staff})
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{counts.total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-emerald-600">Active</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{counts.active}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-amber-600">Pending</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{counts.pending}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold uppercase text-rose-600">Inactive</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{counts.inactive}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, ID, email, or section..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
              {['ALL', 'ACTIVE', 'DEACTIVATED', 'PENDING_REVIEW'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === st ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st === 'PENDING_REVIEW' ? 'Pending' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading system accounts directory...</div>
            ) : filteredUsersList.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No accounts match your current filter parameters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Section / Division</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registration Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUsersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#C8E6C9] text-[#1B4332] font-bold text-xs flex items-center justify-center shrink-0">
                              {u.name.substring(0, 1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900">{u.name}</p>
                                {u.username && (
                                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                    @{u.username}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-800">{u.section || 'General Office'}</p>
                          {u.position && <p className="text-[10px] text-slate-500 font-normal">{u.position}</p>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-semibold text-slate-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                              u.status === 'ACTIVE'
                                ? 'text-emerald-700'
                                : u.status === 'PENDING_REVIEW'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                u.status === 'ACTIVE'
                                  ? 'bg-emerald-600'
                                  : u.status === 'PENDING_REVIEW'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-600'
                              }`}
                            />
                            {u.status === 'PENDING_REVIEW' ? 'PENDING' : u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          {u.status === 'PENDING_REVIEW' && (
                            <button
                              onClick={() => {
                                setSelectedUserForActivation(u);
                                setActivationSection(u.section || 'Planning Section');
                                setActivationPosition(u.position || '');
                                setActivationRole(u.role || 'EMPLOYEE');
                              }}
                              className="px-2.5 py-1 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                            >
                              Activate
                            </button>
                          )}
                          {u.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleToggleStatus(u, 'DEACTIVATED')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-rose-700 border border-slate-200 rounded-lg text-[11px] font-semibold"
                            >
                              Deactivate
                            </button>
                          )}
                          {u.status === 'DEACTIVATED' && (
                            <button
                              onClick={() => handleToggleStatus(u, 'ACTIVE')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold"
                            >
                              Enable
                            </button>
                          )}
                          <button
                            onClick={() => setResetUser(u)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200"
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

      {/* TAB 3: CREATE ACCOUNT */}
      {activeTab === 'create-account' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <svg className="w-6 h-6 text-[#0F4C2E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <h2 className="text-lg font-black text-slate-900">Create New Account</h2>
                <p className="text-xs text-slate-500">Fill in the details to register a new ETAPS user in the system.</p>
              </div>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newAccountData.name}
                    onChange={(e) => setNewAccountData({ ...newAccountData, name: e.target.value })}
                    placeholder="e.g. Maria Clara Santos"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newAccountData.email}
                    onChange={(e) => setNewAccountData({ ...newAccountData, email: e.target.value })}
                    placeholder="name@denr.gov.ph"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newAccountData.phoneNumber}
                    onChange={(e) => setNewAccountData({ ...newAccountData, phoneNumber: e.target.value })}
                    placeholder="09170000000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={newAccountData.role}
                    onChange={(e) => setNewAccountData({ ...newAccountData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="SECTION_CHIEF">Section Chief (Signatory)</option>
                    <option value="DIVISION_CHIEF">Division Chief (Signatory)</option>
                    <option value="HEAD_PENRO">Head of PENRO (Signatory)</option>
                    <option value="ACCOUNT_MANAGER">Account Manager</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Position *</label>
                  <input
                    type="text"
                    required
                    value={newAccountData.position}
                    onChange={(e) => setNewAccountData({ ...newAccountData, position: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Section / Division *</label>
                  <input
                    type="text"
                    required
                    value={newAccountData.section}
                    onChange={(e) => setNewAccountData({ ...newAccountData, section: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => router.push('/account-manager?tab=accounts')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccountLoading}
                  className="px-6 py-2.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {createAccountLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
              <h4 className="text-xs font-bold text-slate-900">Pending Review</h4>
              <p className="text-[11px] text-slate-500">New accounts require admin review before activation.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
              <h4 className="text-xs font-bold text-slate-900">Role Assignment</h4>
              <p className="text-[11px] text-slate-500">Assign appropriate roles based on position and responsibilities.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
              <h4 className="text-xs font-bold text-slate-900">SMS Notification</h4>
              <p className="text-[11px] text-slate-500">Users receive SMS login instructions upon activation.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PASSWORD MANAGEMENT */}
      {activeTab === 'password-management' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Resets</p>
                <p className="text-2xl font-black text-slate-900 mt-1">2</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recovered This Month</p>
                <p className="text-2xl font-black text-slate-900 mt-1">5</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Password Policy</p>
                <p className="text-sm font-bold text-slate-800 mt-1">8+ chars enforced</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Password & Recovery Actions</h3>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>
                          <p>{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{u.role}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                            u.status === 'ACTIVE' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              u.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                          />
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setResetUser(u)}
                          className="px-3 py-1.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-lg font-bold text-[11px] shadow-xs"
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
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <svg className="w-6 h-6 text-[#0F4C2E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <h2 className="text-lg font-black text-slate-900">Account Manager System Configuration</h2>
                <p className="text-xs text-slate-500">Configure global account management policies, notification triggers, and station parameters.</p>
              </div>
            </div>

            <div className="space-y-6 text-xs">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-extrabold text-[#0F4C2E] uppercase tracking-wider">Account Management Settings</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default Role for New Users</label>
                    <select
                      value={configSettings.defaultRole}
                      onChange={(e) => setConfigSettings({ ...configSettings, defaultRole: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="SECTION_CHIEF">SECTION_CHIEF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Session Inactivity Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={configSettings.sessionTimeoutMins}
                      onChange={(e) => setConfigSettings({ ...configSettings, sessionTimeoutMins: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <div>
                      <p className="font-bold text-slate-900">Require Account Manager Review for Registrations</p>
                      <p className="text-[11px] text-slate-500">Prevent self-registered users from logging in until activated.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configSettings.requireApproval}
                      onChange={(e) => setConfigSettings({ ...configSettings, requireApproval: e.target.checked })}
                      className="w-4 h-4 text-[#0F4C2E] rounded border-slate-300 focus:ring-[#0F4C2E]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <div>
                      <p className="font-bold text-slate-900">Auto-Deactivate Inactive Accounts</p>
                      <p className="text-[11px] text-slate-500">Automatically set status to DEACTIVATED after 90 days of inactivity.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configSettings.autoDeactivate}
                      onChange={(e) => setConfigSettings({ ...configSettings, autoDeactivate: e.target.checked })}
                      className="w-4 h-4 text-[#0F4C2E] rounded border-slate-300 focus:ring-[#0F4C2E]"
                    />
                  </label>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-extrabold text-[#0F4C2E] uppercase tracking-wider">Notification Preferences</h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <div>
                      <p className="font-bold text-slate-900">Send SMS Notification on Account Activation</p>
                      <p className="text-[11px] text-slate-500">Automatically dispatch SMS via Semaphore API when account is activated.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configSettings.smsActivationAlert}
                      onChange={(e) => setConfigSettings({ ...configSettings, smsActivationAlert: e.target.checked })}
                      className="w-4 h-4 text-[#0F4C2E] rounded border-slate-300 focus:ring-[#0F4C2E]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <div>
                      <p className="font-bold text-slate-900">In-App Notification Alerts</p>
                      <p className="text-[11px] text-slate-500">Notify managers in real-time when a new user signs up.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={configSettings.emailNotification}
                      onChange={(e) => setConfigSettings({ ...configSettings, emailNotification: e.target.checked })}
                      className="w-4 h-4 text-[#0F4C2E] rounded border-slate-300 focus:ring-[#0F4C2E]"
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
                  className="px-6 py-2.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white font-bold rounded-xl shadow-md transition-all"
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
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Sub-navigation tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setTaSubTab('create')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                taSubTab === 'create' ? 'bg-[#0F4C2E] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              + File New Travel Authority
            </button>
            <button
              onClick={() => setTaSubTab('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                taSubTab === 'list' ? 'bg-[#0F4C2E] text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              My Submitted TA Requests ({myTaRequests.length})
            </button>
          </div>

          {taSubTab === 'create' ? (
            <div className="space-y-6 animate-fade-in">
              {/* Wizard Stepper Bar */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between relative px-8">
                  <div className="absolute left-12 right-12 top-4 h-0.5 bg-slate-200 z-0"></div>

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
                          className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-[#0F4C2E] text-white'
                              : isCurrent
                              ? 'bg-[#0F4C2E] text-white ring-4 ring-emerald-100 font-extrabold'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? '✓' : stepItem.s}
                        </div>
                        <span className={`text-[11px] font-semibold mt-2 ${isCurrent ? 'text-[#0F4C2E] font-bold' : 'text-slate-400'}`}>
                          {stepItem.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Wizard Body Card */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
                {formError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
                    {formError}
                  </div>
                )}

                {/* STEP 1: Select Travel Dates */}
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-slate-900">Select Travel Dates</h3>
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
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-slate-900">Employee Information</h3>

                    <div className="p-4 bg-[#F3F4F8] rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0F4C2E] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Selected Travel Dates (Set in Step 1)
                          </span>
                          <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                            Departure: <span className="text-[#0F4C2E]">{createForm.departureDate || 'Not specified'}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            Return: <span className="text-[#0F4C2E]">{createForm.returnDate || 'Not specified'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Select a Name *</span>
                          {loadingEmployees && (
                            <span className="text-[10px] text-emerald-700 font-normal">Loading from database...</span>
                          )}
                        </label>
                        <select
                          required
                          value={createForm.employeeName}
                          onChange={(e) => handleEmployeeSelect(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#0F4C2E] cursor-pointer hover:bg-white transition-all shadow-2xs"
                        >
                          <option value="">-- Select a Name --</option>
                          {employeeList.map((emp) => (
                            <option key={emp.id || emp.name} value={emp.name}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Select an employee from the database directory.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Travel Area *
                        </label>
                        <select
                          value={createForm.travelArea}
                          onChange={(e) => setCreateForm({ ...createForm, travelArea: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#0F4C2E] cursor-pointer hover:bg-white transition-all shadow-2xs"
                        >
                          <option value="WITHIN AOR">WITHIN AOR</option>
                          <option value="OUTSIDE CARAGA">OUTSIDE CARAGA</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Area of Responsibility scope for this mission.</p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Position / Designation</span>
                          <span className="text-[10px] font-bold text-[#0F4C2E] bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
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
                          placeholder="Position/Designation will automatically populate upon selecting an employee above..."
                          className="w-full px-4 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-not-allowed select-none shadow-2xs"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Automatically retrieved from the employee database record.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Travel Details */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-slate-900">Travel Details</h3>

                    <div className="space-y-4">
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E] transition-all"
                          />
                          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>

                          {isSearchingLocation && (
                            <div className="absolute right-3 top-3">
                              <div className="w-4 h-4 border-2 border-[#0F4C2E] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>

                        {showLocationDropdown && locationSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 animate-fade-in max-h-60 overflow-y-auto">
                            <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                              <span>Location Recommendations</span>
                              <button type="button" onClick={() => setShowLocationDropdown(false)} className="hover:text-slate-700">
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
                                className="w-full px-4 py-2.5 text-left hover:bg-emerald-50/70 transition-colors flex items-start gap-2.5 group"
                              >
                                <svg className="w-4 h-4 text-[#0F4C2E] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 group-hover:text-[#0F4C2E] truncate">{item.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.fullAddress}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                          Purpose of Travel *
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={createForm.purpose}
                          onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                          placeholder="Describe the purpose of your travel..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Additional Information */}
                {wizardStep === 4 && (
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-slate-900">Additional Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Salary Grade</label>
                        <input
                          type="text"
                          value={createForm.salaryGrade}
                          onChange={(e) => setCreateForm({ ...createForm, salaryGrade: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Division/Section/Unit</label>
                        <input
                          type="text"
                          value={createForm.division}
                          onChange={(e) => setCreateForm({ ...createForm, division: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Station</label>
                        <input
                          type="text"
                          value={createForm.station}
                          onChange={(e) => setCreateForm({ ...createForm, station: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Employment Status</label>
                        <input
                          type="text"
                          value={createForm.employmentStatus}
                          onChange={(e) => setCreateForm({ ...createForm, employmentStatus: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Office</label>
                        <input
                          type="text"
                          value={createForm.office}
                          onChange={(e) => setCreateForm({ ...createForm, office: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Signatory Station</label>
                        <input
                          type="text"
                          value={createForm.signatoryStation}
                          onChange={(e) => setCreateForm({ ...createForm, signatoryStation: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Per Diems/Expense Allowed</label>
                        <input
                          type="text"
                          value={createForm.perDiems}
                          onChange={(e) => setCreateForm({ ...createForm, perDiems: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Appropriations</label>
                        <input
                          type="text"
                          value={createForm.appropriations}
                          onChange={(e) => setCreateForm({ ...createForm, appropriations: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Remarks or Special Instructions</label>
                        <textarea
                          rows={3}
                          value={createForm.remarks}
                          onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Contact Number</label>
                        <input
                          type="text"
                          value={createForm.contactNumber}
                          onChange={(e) => setCreateForm({ ...createForm, contactNumber: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                          Supporting Documents * (e.g. Invitation Letter, Memorandum)
                        </label>
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-full bg-slate-200/60 text-slate-500 flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-xs font-bold text-slate-700">Click to upload files or drag and drop</p>
                          <p className="text-[10px] text-slate-400 mt-1">PDF, DOC, DOCX, JPG, PNG (Max 25MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Review & Submit */}
                {wizardStep === 5 && (
                  <div className="space-y-6">
                    <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold">Travel Authority Request Summary</h3>
                        <p className="text-xs text-emerald-200/80 mt-0.5">Please review all submitted information before final submission.</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-bold uppercase">Ready</span>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <p className="font-bold text-slate-900 text-sm">{createForm.destination}</p>
                        <p className="text-slate-700">Dates: {createForm.departureDate} to {createForm.returnDate}</p>
                        <p className="text-slate-600">Purpose: {createForm.purpose}</p>
                        <p className="text-slate-500">Employee: {createForm.employeeName} ({createForm.position})</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stepper Action Footer */}
                <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setTaSubTab('list')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-3">
                    {wizardStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setWizardStep((prev) => Math.max(prev - 1, 1))}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                      >
                        ‹ Previous
                      </button>
                    )}

                    {wizardStep < 5 ? (
                      <button
                        type="button"
                        onClick={() => setWizardStep((prev) => Math.min(prev + 1, 5))}
                        className="px-6 py-2.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-xl text-xs font-bold shadow-2xs"
                      >
                        Next ›
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={taSubmitting}
                        onClick={handleCreateTaSubmit}
                        className="px-6 py-2.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                      >
                        {taSubmitting ? 'Submitting...' : 'Submit Travel Authority'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">My Travel Authority Requests</h3>
              {myTaRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No travel authority requests submitted yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase">
                        <th className="py-3 px-4">Tracking #</th>
                        <th className="py-3 px-4">Destination</th>
                        <th className="py-3 px-4">Dates</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myTaRequests.map((req) => (
                        <tr key={req.id}>
                          <td className="py-3 px-4 font-bold text-[#0F4C2E]">{req.trackingNumber}</td>
                          <td className="py-3 px-4 text-slate-800">{req.destination}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Review & Activate Account
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedUserForActivation.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForActivation(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center font-bold text-sm transition-all"
              >
                ✕
              </button>
            </div>

            {/* Applicant Submitted Credentials Details */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Submitted Applicant Credentials
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Notification Email:</span>
                  <span className="font-semibold text-slate-800 font-mono truncate block">{selectedUserForActivation.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">SMS Mobile Number:</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedUserForActivation.phoneNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Birthday:</span>
                  <span className="font-medium text-slate-700">{selectedUserForActivation.birthday || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Home Address:</span>
                  <span className="font-medium text-slate-700 truncate block">{selectedUserForActivation.address || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleActivateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Position / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={activationPosition}
                    onChange={(e) => setActivationPosition(e.target.value)}
                    placeholder="e.g. Planning Officer I"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign Section / Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={activationSection}
                    onChange={(e) => setActivationSection(e.target.value)}
                    placeholder="e.g. Planning Section"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  System Role Assignment
                </label>
                <select
                  value={activationRole}
                  onChange={(e) => setActivationRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                >
                  <option value="EMPLOYEE">EMPLOYEE (Standard Staff / Requester)</option>
                  <option value="SECTION_CHIEF">SECTION_CHIEF (Level 1 Signatory)</option>
                  <option value="DIVISION_CHIEF">DIVISION_CHIEF (Level 2 Signatory)</option>
                  <option value="HEAD_PENRO">HEAD_PENRO (Final Approver)</option>
                  <option value="ACCOUNT_MANAGER">ACCOUNT_MANAGER (HR Administrator)</option>
                </select>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200/90 rounded-2xl text-[11px] text-emerald-950 flex items-start gap-2.5">
                <svg className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold text-emerald-900">Automated Credential Generation:</p>
                  <p className="mt-0.5 text-emerald-800">
                    Activating generates a standardized <strong>Username</strong> and <strong>Temporary Password</strong>, hashes them for security, and sends login details to <strong>{selectedUserForActivation.phoneNumber}</strong> (SMS) and <strong>{selectedUserForActivation.email}</strong> (Email).
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForActivation(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
      )}

      {/* Generated Credentials Confirmation Modal */}
      {generatedCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/75 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-200 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                Account Successfully Activated!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Official ETAPS login credentials have been generated and dispatched.
              </p>
            </div>

            {/* Generated Login Credentials Card */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee</span>
                <span className="text-xs font-extrabold text-slate-900">{generatedCredentialsModal.user.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    System Username
                  </span>
                  <div className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-black text-[#0F4C2E]">
                    @{generatedCredentialsModal.credentials.username}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Temp Password
                  </span>
                  <div className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-800">
                    {generatedCredentialsModal.credentials.tempPassword}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Position:</span>
                  <span className="font-semibold text-slate-800">{generatedCredentialsModal.user.position || 'Employee'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Section:</span>
                  <span className="font-semibold text-slate-800">{generatedCredentialsModal.user.section || 'Planning Section'}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>✓</span>
                  <span>Dispatched via Semaphore SMS & Resend Email</span>
                </div>
                <p className="text-[10px] text-emerald-700">
                  Credentials sent to {generatedCredentialsModal.user.phoneNumber} and {generatedCredentialsModal.user.email}.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const credText = `DENR ETAPS Account Activated\nEmployee: ${generatedCredentialsModal.user.name}\nUsername: ${generatedCredentialsModal.credentials.username}\nPassword: ${generatedCredentialsModal.credentials.tempPassword}\nPosition: ${generatedCredentialsModal.user.position || 'Employee'}\nSection: ${generatedCredentialsModal.user.section || 'General'}`;
                  navigator.clipboard.writeText(credText);
                  setCopiedCredentials(true);
                  setTimeout(() => setCopiedCredentials(false), 3000);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-[#0F4C2E] text-[#0F4C2E] hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{copiedCredentials ? '✓ Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setGeneratedCredentialsModal(null)}
                className="w-full sm:w-auto px-7 py-2.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Password: {resetUser.name}</h3>
                <p className="text-xs text-slate-500">{resetUser.email}</p>
              </div>
              <button onClick={() => setResetUser(null)} className="text-slate-400 hover:text-slate-900 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none font-mono focus:ring-2 focus:ring-[#0F4C2E]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#0F4C2E] hover:bg-[#165E3A] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {actionLoading ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountManagerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Account Management Portal...</div>}>
      <AccountManagerContent />
    </Suspense>
  );
}
