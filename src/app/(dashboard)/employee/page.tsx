'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DynamicMapPicker from '@/components/map/DynamicMapPicker';
import ApprovalTrail from '@/components/approval-trail/ApprovalTrail';
import { TARequestDTO, AttachmentDTO } from '@/types';
import SupportingDocumentsUpload from '@/components/travel-order/SupportingDocumentsUpload';
import {
  formatDateDisplay,
  formatTimeDisplay,
  formatFullDateTimeDisplay,
  formatDayHeading,
  formatRelativeTime,
  formatDateRangeShort,
} from '@/lib/date';
import { formatNominatimAddress } from '@/utils/address';
import TravelOrderModal from '@/components/travel-order/TravelOrderModal';

// Dual Month Calendar Component matching Page 2 of ETAPS PDF reference
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

  // Calendar base state (Month 1 & Month 2 starting at current month)
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

  const handlePrevMonth = () => {
    setBaseDate(new Date(month1Year, month1Month - 1, 1));
  };

  const handleNextMonth = () => {
    setBaseDate(new Date(month1Year, month1Month + 1, 1));
  };

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

    // Prevent selecting past dates
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
    // Blank padding cells
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`blank-${i}`} className="py-2"></div>);
    }

    // Day cells
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

      const inRange =
        depObj &&
        retObj &&
        cellDate > depObj &&
        cellDate < retObj;

      let cellStyle = 'hover:bg-emerald-50 text-slate-700 font-medium rounded-[6px]';
      if (isPast) {
        cellStyle = 'text-slate-300 bg-slate-50/50 cursor-not-allowed pointer-events-none line-through decoration-slate-300 rounded-[6px]';
      } else if (isDeparture || isReturn) {
        cellStyle = 'bg-[#0F4C2E] text-white font-semibold rounded-[6px] shadow-xs';
      } else if (inRange) {
        cellStyle = 'bg-emerald-100/80 text-emerald-900 font-semibold rounded-none';
      }

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          disabled={isPast}
          onClick={() => handleDayClick(year, month, day)}
          className={`text-[12px] transition-colors flex items-center justify-center h-9 w-9 mx-auto ${cellStyle}`}
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

  // Calculate day count
  const calculateDays = () => {
    if (!depObj || !retObj) return null;
    const diffTime = Math.abs(retObj.getTime() - depObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };
  const durationDays = calculateDays();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Dual Month Calendar Left Column (8/12 width) */}
      <div className="lg:col-span-8 bg-white rounded-[8px] border border-emerald-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-7 w-7 inline-flex items-center justify-center text-[#0F4C2E] hover:bg-emerald-50 rounded-[6px] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[13px] font-semibold text-[#0F4C2E]">
              {monthNames[month1Month]} {month1Year}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#0F4C2E]">
              {monthNames[month2Month]} {month2Year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-7 w-7 inline-flex items-center justify-center text-[#0F4C2E] hover:bg-emerald-50 rounded-[6px] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dual Month Side-by-Side Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Month 1 */}
          <div className="bg-emerald-50/30 p-3.5 rounded-[8px] border border-emerald-100">
            <h4 className="text-[13px] font-semibold text-[#0F4C2E] text-center mb-2.5">
              {monthNames[month1Month]} {month1Year}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={idx} className="text-[11px] font-semibold text-emerald-800/70 py-1 uppercase tracking-wider">
                  {d}
                </div>
              ))}
              {renderMonthGrid(month1Year, month1Month)}
            </div>
          </div>

          {/* Month 2 */}
          <div className="bg-emerald-50/30 p-3.5 rounded-[8px] border border-emerald-100">
            <h4 className="text-[13px] font-semibold text-[#0F4C2E] text-center mb-2.5">
              {monthNames[month2Month]} {month2Year}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={idx} className="text-[11px] font-semibold text-emerald-800/70 py-1 uppercase tracking-wider">
                  {d}
                </div>
              ))}
              {renderMonthGrid(month2Year, month2Month)}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Dates Summary Right Column (4/12 width) */}
      <div className="lg:col-span-4 bg-[#F3F4F8] p-5 rounded-[8px] border border-slate-200/80 space-y-4">
        <div>
          <h4 className="text-[14px] font-semibold text-[#0F4C2E] mb-3">Selected Dates Summary</h4>

          <div className="space-y-2.5">
            {/* Departure Card */}
            <div className="bg-white p-3.5 rounded-[8px] border border-emerald-200/70 border-l-4 border-l-[#0F4C2E] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Departure Date
                </span>
                <span className={`text-[13px] font-semibold ${departureDate ? 'text-[#0F4C2E]' : 'text-slate-400'}`}>
                  {formatDateDisplay(departureDate)}
                </span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${departureDate ? 'bg-[#0F4C2E]' : 'bg-slate-300'}`}></span>
            </div>

            {/* Return Card */}
            <div className="bg-white p-3.5 rounded-[8px] border border-emerald-200/70 border-l-4 border-l-[#0F4C2E] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Return Date
                </span>
                <span className={`text-[13px] font-semibold ${returnDate ? 'text-[#0F4C2E]' : 'text-slate-400'}`}>
                  {formatDateDisplay(returnDate)}
                </span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${returnDate ? 'bg-[#0F4C2E]' : 'bg-slate-300'}`}></span>
            </div>

            {/* Duration Pill */}
            {durationDays !== null && (
              <div className="p-3 bg-emerald-100/70 border border-emerald-200 rounded-[8px] flex items-center justify-between text-[13px]">
                <span className="font-semibold text-emerald-900">Total Travel Duration:</span>
                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-[#0F4C2E] text-white shadow-2xs">
                  {durationDays} Day{durationDays > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions & Guidelines */}
        <div className="space-y-1.5 pt-3 border-t border-slate-200/80">
          <span className="text-[12px] font-semibold text-slate-800 block">Filing Guidelines:</span>
          <ul className="text-[12px] text-slate-600 space-y-1 pl-4 list-disc leading-relaxed">
            <li>Select departure date first, followed by your return date.</li>
            <li>Travel Authorities must be filed at least 3 working days prior to departure.</li>
            <li>Sequential approvals are required before proceeding to the field.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function EmployeeContent() {
  const { data: session } = useSession();
  const sessionUser = session?.user as any;

  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    if (sessionUser?.role === 'ACCOUNT_MANAGER' && (currentTab === 'dashboard' || !searchParams.get('tab'))) {
      router.replace('/account-manager?tab=dashboard');
    }
  }, [sessionUser, currentTab, searchParams, router]);

  const [requests, setRequests] = useState<TARequestDTO[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TARequestDTO | null>(null);
  const [travelOrderModalRequest, setTravelOrderModalRequest] = useState<TARequestDTO | null>(null);
  const [scheduleCalendarDate, setScheduleCalendarDate] = useState(() => new Date());

  // Resubmit / Date Revision Modal State
  const [resubmitModalRequest, setResubmitModalRequest] = useState<TARequestDTO | null>(null);
  const [resubmitStartDate, setResubmitStartDate] = useState('');
  const [resubmitEndDate, setResubmitEndDate] = useState('');
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitError, setResubmitError] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notificationFilter, setNotificationFilter] = useState('ALL');

  // Toast Banner State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Database-driven Employees state for Step 2 dropdown
  const [employeeList, setEmployeeList] = useState<Array<{ id: string; name: string; position: string | null }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Helper to resolve profile-derived defaults that should be preserved across resets
  const getProfileDefaults = (userObj?: any, empList?: any[]) => {
    const list = empList || employeeList;
    const currentName = userObj?.name || sessionUser?.name;
    const matched = list.find((e: any) => e.name === currentName) || list[0];

    const empName = matched?.name || currentName || 'Juan Dela Cruz';
    const empPos = matched?.position || userObj?.position || sessionUser?.position || 'Administrative Officer V';
    const empDiv = userObj?.division || sessionUser?.division || 'Management Services Division';
    const empSec = userObj?.section || sessionUser?.section || 'Admin & Finance Section';
    const empPhone = userObj?.phoneNumber || sessionUser?.phoneNumber || '09295855403';

    return {
      employeeName: empName,
      position: empPos,
      designation: empPos,
      salaryGrade: '18',
      division: empSec ? `${empSec} (${empDiv})` : empDiv,
      station: 'PENRO ADN PLANNING',
      employmentStatus: 'Permanent',
      office: 'PENRO ADN',
      signatoryStation: 'PENRO ADN PLANNING',
      contactNumber: empPhone,
    };
  };

  // Helper to generate a clean form state with request-specific fields reset to empty/defaults
  const getCleanFormState = (userObj?: any, empList?: any[]) => {
    const profile = getProfileDefaults(userObj, empList);
    return {
      departureDate: '',
      returnDate: '',
      employeeName: profile.employeeName,
      position: profile.position,
      designation: profile.designation,
      travelArea: 'WITHIN AOR',
      destination: '',
      destinationLat: 14.5547,
      destinationLng: 121.0244,
      purpose: '',
      salaryGrade: profile.salaryGrade,
      division: profile.division,
      station: profile.station,
      employmentStatus: profile.employmentStatus,
      office: profile.office,
      signatoryStation: profile.signatoryStation,
      perDiems: '',
      appropriations: '',
      remarks: '',
      certification: '',
      contactNumber: profile.contactNumber,
      attachments: [] as AttachmentDTO[],
      teamMembers: [] as { name: string; position: string }[],
    };
  };

  // Create Travel Wizard State (5 Steps matching PDF pages 2-8)
  const [wizardStep, setWizardStep] = useState(1);
  const [createForm, setCreateForm] = useState(() => getCleanFormState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Comprehensive Form Reset Function: clears all request-specific state, map state, and sets step back to 1
  const resetTravelForm = () => {
    setWizardStep(1);
    setCreateForm(getCleanFormState(sessionUser, employeeList));
    setFormError('');
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
    skipNextSearchRef.current = false;
  };

  // Clears submitted draft state from persistence
  const clearSubmittedDraft = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('etaps_employee_draft');
      }
    } catch (err) {
      console.error('Error clearing submitted draft:', err);
    }
  };

  // Saves legitimate draft for later recovery
  const handleSaveDraft = () => {
    try {
      if (typeof window !== 'undefined') {
        const draftPayload = {
          step: wizardStep,
          form: createForm,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem('etaps_employee_draft', JSON.stringify(draftPayload));
      }
      showToast('Draft saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving draft:', err);
      showToast('Draft saved successfully!', 'success');
    }
  };

  // Tab change lifecycle: when entering 'create' tab from another tab
  const lastTabRef = useRef(currentTab);

  useEffect(() => {
    if (currentTab === 'create' && lastTabRef.current !== 'create') {
      try {
        if (typeof window !== 'undefined') {
          const savedDraftStr = localStorage.getItem('etaps_employee_draft');
          if (savedDraftStr) {
            const parsed = JSON.parse(savedDraftStr);
            if (parsed && parsed.form) {
              setCreateForm(parsed.form);
              if (parsed.step) {
                setWizardStep(parsed.step);
              }
            }
          } else {
            // No saved draft exists: ensure clean state and step 1
            resetTravelForm();
          }
        }
      } catch (err) {
        console.error('Failed to inspect saved draft:', err);
      }
    }
    lastTabRef.current = currentTab;
  }, [currentTab]);

  // Location Search & Autocomplete State
  const [locationSuggestions, setLocationSuggestions] = useState<
    Array<{ name: string; lat: number; lng: number; fullAddress: string }>
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const skipNextSearchRef = React.useRef(false);

  // Pre-compiled Philippine Locations dataset for instant offline/fallback recommendations
  const fallbackPHLocations = [
    { name: 'Lemon, Capoocan, Leyte', lat: 11.2333, lng: 124.6333, fullAddress: 'Lemon, Capoocan, Leyte, Eastern Visayas, Philippines' },
    { name: 'Makati City', lat: 14.5547, lng: 121.0244, fullAddress: 'Makati City, Metro Manila, Philippines' },
    { name: 'Los Baños, Laguna', lat: 14.1685, lng: 121.2429, fullAddress: 'Los Baños, Laguna, Calabarzon, Philippines' },
    { name: 'Calamba, Laguna', lat: 14.2117, lng: 121.1654, fullAddress: 'Calamba City, Laguna, Calabarzon, Philippines' },
    { name: 'San Pablo City, Laguna', lat: 14.0683, lng: 121.3256, fullAddress: 'San Pablo City, Laguna, Calabarzon, Philippines' },
    { name: 'Quezon City', lat: 14.6760, lng: 121.0437, fullAddress: 'Quezon City, Metro Manila, Philippines' },
    { name: 'Santa Cruz, Laguna', lat: 14.2801, lng: 121.4172, fullAddress: 'Santa Cruz, Laguna, Calabarzon, Philippines' },
    { name: 'Tagaytay, Cavite', lat: 14.1153, lng: 120.9621, fullAddress: 'Tagaytay City, Cavite, Calabarzon, Philippines' },
    { name: 'Puerto Princesa, Palawan', lat: 9.7392, lng: 118.7353, fullAddress: 'Puerto Princesa City, Palawan, MIMAROPA, Philippines' },
    { name: 'Legazpi City, Albay', lat: 13.1391, lng: 123.7438, fullAddress: 'Legazpi City, Albay, Bicol Region, Philippines' },
    { name: 'Cebu City', lat: 10.3157, lng: 123.8854, fullAddress: 'Cebu City, Central Visayas, Philippines' },
    { name: 'Davao City', lat: 7.1907, lng: 125.4553, fullAddress: 'Davao City, Davao Region, Philippines' },
  ];

  // Map reverse geocoding handler when clicking/dragging pin on map
  const handleMapLocationSelect = async (lat: number, lng: number) => {
    skipNextSearchRef.current = true;
    setCreateForm((prev) => ({
      ...prev,
      destinationLat: lat,
      destinationLng: lng,
    }));

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'TAPS-App' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const completeAddress = formatNominatimAddress(data) || data.display_name;
          if (completeAddress) {
            skipNextSearchRef.current = true;
            setCreateForm((prev) => ({
              ...prev,
              destination: completeAddress,
              destinationLat: lat,
              destinationLng: lng,
            }));
            return;
          }
        }
      }
    } catch (err) {
      console.error('Failed reverse geocoding on map select', err);
    }

    skipNextSearchRef.current = true;
    setCreateForm((prev) => ({
      ...prev,
      destination: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      destinationLat: lat,
      destinationLng: lng,
    }));
  };

  // Debounced search location effect
  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      setShowLocationDropdown(false);
      return;
    }

    const query = createForm.destination.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }

    setIsSearchingLocation(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const parsed = data.map((item: any) => ({
              name: item.display_name.split(',')[0] + (item.display_name.split(',')[1] ? ', ' + item.display_name.split(',')[1] : ''),
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              fullAddress: item.display_name,
            }));
            setLocationSuggestions(parsed);
            setShowLocationDropdown(true);
            setIsSearchingLocation(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch location suggestions', err);
      }

      // Fallback matching
      const filtered = fallbackPHLocations.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.fullAddress.toLowerCase().includes(query.toLowerCase())
      );
      setLocationSuggestions(filtered);
      setShowLocationDropdown(filtered.length > 0);
      setIsSearchingLocation(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [createForm.destination]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ta-requests');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRequests(data.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data?.notifications || []);
          setUnreadCount(data.data?.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchNotifications();

    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setEmployeeList(json.data);
            // Auto-align default form with matching session employee or first employee if not yet set
            setCreateForm((prev) => {
              const profile = getProfileDefaults(sessionUser, json.data);
              return {
                ...prev,
                employeeName: prev.employeeName || profile.employeeName,
                position: prev.position || profile.position,
                designation: prev.designation || profile.designation,
                division: prev.division || profile.division,
                contactNumber: prev.contactNumber || profile.contactNumber,
              };
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch employees list:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();

    // Listen for realtime push-based notification refresh events & update requests list
    const handleRealtimeRefresh = () => {
      fetchNotifications();
      fetchRequests();
    };
    window.addEventListener('taps:refresh-notifications', handleRealtimeRefresh);
    window.addEventListener('taps:new-notification', handleRealtimeRefresh);

    // Listen for profile changes from ProfileModal
    const handleProfileUpdateEvent = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setCreateForm((prev) => ({
          ...prev,
          employeeName: detail.name || prev.employeeName,
          position: detail.position || prev.position,
          designation: detail.position || prev.designation,
          division: detail.section && detail.division ? `${detail.section} (${detail.division})` : (detail.division || prev.division),
          contactNumber: detail.phoneNumber || prev.contactNumber,
        }));
      }
    };
    window.addEventListener('taps:profile-updated', handleProfileUpdateEvent);

    return () => {
      window.removeEventListener('taps:refresh-notifications', handleRealtimeRefresh);
      window.removeEventListener('taps:new-notification', handleRealtimeRefresh);
      window.removeEventListener('taps:profile-updated', handleProfileUpdateEvent);
    };
  }, []);

  // Sync and refetch when current tab changes
  useEffect(() => {
    fetchRequests();
    fetchNotifications();
  }, [currentTab]);

  const handleResubmit = async () => {
    if (!resubmitModalRequest || !resubmitStartDate || !resubmitEndDate) return;
    setResubmitLoading(true);
    setResubmitError('');

    try {
      const res = await fetch(`/api/ta-requests/${resubmitModalRequest.id}/resubmit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: resubmitStartDate,
          endDate: resubmitEndDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setResubmitError(data.error || 'Failed to resubmit request.');
        setResubmitLoading(false);
        return;
      }

      showToast('Travel Order resubmitted successfully! Approval restarted at Section Chief.', 'success');
      setResubmitModalRequest(null);
      setSelectedRequest(null);
      setResubmitStartDate('');
      setResubmitEndDate('');
      fetchRequests();
      fetchNotifications();
    } catch (err: any) {
      setResubmitError(err.message || 'An error occurred while resubmitting.');
    } finally {
      setResubmitLoading(false);
    }
  };

  // Sync profile defaults when session user loads
  useEffect(() => {
    if (sessionUser?.name) {
      const profile = getProfileDefaults(sessionUser, employeeList);
      setCreateForm((prev) => ({
        ...prev,
        employeeName: profile.employeeName,
        position: profile.position,
        designation: profile.designation,
        division: profile.division,
        contactNumber: profile.contactNumber,
      }));
    }
  }, [sessionUser, employeeList]);

  // Handle employee selection from database dropdown
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

  // Auto-focus the travel schedule calendar to the user's latest request's month
  useEffect(() => {
    if (requests.length > 0) {
      const primary = requests.find((r) => r.status === 'APPROVED') || requests[0];
      if (primary && primary.startDate) {
        const d = new Date(primary.startDate);
        if (!isNaN(d.getTime())) {
          setScheduleCalendarDate(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
    }
  }, [requests]);

  // Reset active modals/detail view whenever sidebar tab changes or reset event occurs
  useEffect(() => {
    setSelectedRequest(null);
    setTravelOrderModalRequest(null);
  }, [currentTab]);

  useEffect(() => {
    const handleResetViews = () => {
      setSelectedRequest(null);
      setTravelOrderModalRequest(null);
    };
    window.addEventListener('taps:reset-views', handleResetViews);
    return () => window.removeEventListener('taps:reset-views', handleResetViews);
  }, []);

  const handleWizardNext = () => {
    setFormError('');
    if (wizardStep === 1) {
      if (!createForm.departureDate || !createForm.returnDate) {
        setFormError('Please select both departure and return dates before proceeding.');
        return;
      }
      if (new Date(createForm.departureDate) > new Date(createForm.returnDate)) {
        setFormError('Return date must be equal to or after departure date.');
        return;
      }
    } else if (wizardStep === 2) {
      if (!createForm.employeeName) {
        setFormError('Please select an employee name.');
        return;
      }
    } else if (wizardStep === 3) {
      if (!createForm.destination.trim()) {
        setFormError('Please specify a travel destination.');
        return;
      }
      if (!createForm.purpose.trim()) {
        setFormError('Please provide a purpose of travel.');
        return;
      }
    }
    setWizardStep((prev) => Math.min(prev + 1, 5));
  };

  const handleCreateSubmit = async () => {
    // Guard against duplicate simultaneous submissions
    if (isSubmitting) return;

    // Validate required fields before dispatching API request
    if (!createForm.departureDate || !createForm.returnDate) {
      setFormError('Please select both departure and return dates.');
      setWizardStep(1);
      return;
    }
    if (!createForm.employeeName) {
      setFormError('Please select an employee name.');
      setWizardStep(2);
      return;
    }
    if (!createForm.destination.trim()) {
      setFormError('Please enter a travel destination.');
      setWizardStep(3);
      return;
    }
    if (!createForm.purpose.trim()) {
      setFormError('Please enter the purpose of travel.');
      setWizardStep(3);
      return;
    }

    setIsSubmitting(true);
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
          teamMembers: createForm.teamMembers,
          attachments: createForm.attachments,
          submitImmediately: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Submission failed: keep all entered data, stay at Step 5, and display the error
        setFormError(data.error || 'Failed to submit Travel Authority request.');
        showToast(data.error || 'Failed to submit Travel Authority request.', 'error');
        return;
      }

      // ONLY on confirmed success:
      resetTravelForm();
      clearSubmittedDraft();

      showToast(`Travel Authority request ${data.data?.trackingNumber || ''} submitted successfully!`, 'success');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('taps:new-notification', {
            detail: {
              id: `notif-${Date.now()}`,
              title: 'TA Request Submitted',
              message: `Your Travel Authority request ${data.data?.trackingNumber || ''} for ${data.data?.destination || 'field travel'} has been submitted for approval.`,
              createdAt: new Date().toISOString(),
              requestId: data.data?.id,
              isRead: false,
            },
          })
        );
        window.dispatchEvent(new CustomEvent('taps:refresh-notifications'));
      }

      await fetchRequests();
      fetchNotifications();
      router.push('/employee?tab=requests');
    } catch (err: any) {
      // Network or runtime exception: keep all form data and step 5
      setFormError(err.message || 'An error occurred during submission.');
      showToast(err.message || 'An error occurred during submission.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Status Badges (macOS HIG Semantic Badges with Rich DENR Colors)
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-[#16835D] border border-emerald-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16835D] shrink-0"></span>
            Approved
          </span>
        );
      case 'PENDING_SECTION_CHIEF':
        return (
          <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-blue-50 text-[#2580B8] border border-blue-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2580B8] shrink-0 animate-pulse"></span>
            Pending Section Chief
          </span>
        );
      case 'PENDING_DIVISION_CHIEF':
        return (
          <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-blue-50 text-[#2580B8] border border-blue-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2580B8] shrink-0 animate-pulse"></span>
            Pending Division Chief
          </span>
        );
      case 'PENDING_HEAD_PENRO':
        return (
          <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-[#D97706] border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0 animate-pulse"></span>
            Pending Head of PENRO
          </span>
        );
      case 'PENDING':
        return (
          <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-[#D97706] border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0"></span>
            Pending
          </span>
        );
      case 'REJECTED_MANUAL':
        return (
          <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0"></span>
            Returned (Needs Revision)
          </span>
        );
      case 'REJECTED_OVERDUE':
        return (
          <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-rose-50 text-[#DC3545] border border-rose-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC3545] shrink-0"></span>
            Overdue
          </span>
        );
      default:
        return (
          <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0"></span>
            Draft
          </span>
        );
    }
  };

  // Helper for progress info calculation from TA status
  const getProgressFromStatus = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { text: '3/3', width: '100%' };
      case 'PENDING_HEAD_PENRO':
        return { text: '2/3', width: '66%' };
      case 'PENDING_DIVISION_CHIEF':
        return { text: '1/3', width: '33%' };
      case 'PENDING_SECTION_CHIEF':
      case 'PENDING':
        return { text: '1/3', width: '33%' };
      case 'REJECTED_MANUAL':
        return { text: '0/3', width: '0%' };
      case 'REJECTED_OVERDUE':
        return { text: '0/3', width: '0%' };
      default:
        return { text: '0/0', width: '0%' };
    }
  };

  const formatDateRangeShort = (startDate: string | Date, endDate: string | Date) => {
    if (!startDate || !endDate) return 'N/A';
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'N/A';
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getNotificationRemarks = (notifItem: any, linkedReq: any) => {
    if (!notifItem) return null;
    const match = notifItem.message?.match(/(?:Remarks|Reason):\s*"([^"]+)"/i);
    if (match && match[1]) return match[1];

    if (linkedReq?.approvalSteps && Array.isArray(linkedReq.approvalSteps)) {
      const titleLower = (notifItem.title || '').toLowerCase();
      const msgLower = (notifItem.message || '').toLowerCase();

      if (titleLower.includes('section chief') || msgLower.includes('section chief')) {
        const s1 = linkedReq.approvalSteps.find((s: any) => s.order === 1);
        if (s1?.remarks) return s1.remarks;
      }
      if (titleLower.includes('division chief') || msgLower.includes('division chief')) {
        const s2 = linkedReq.approvalSteps.find((s: any) => s.order === 2);
        if (s2?.remarks) return s2.remarks;
      }
      if (titleLower.includes('head of penro') || msgLower.includes('head of penro') || titleLower.includes('fully approved')) {
        const s3 = linkedReq.approvalSteps.find((s: any) => s.order === 3);
        if (s3?.remarks) return s3.remarks;
      }

      const actedWithRemarks = linkedReq.approvalSteps
        .filter((s: any) => s.remarks && (s.action === 'APPROVED' || s.action === 'REJECTED'))
        .sort((a: any, b: any) => (b.order || 0) - (a.order || 0));
      if (actedWithRemarks[0]?.remarks) {
        return actedWithRemarks[0].remarks;
      }
    }
    return null;
  };

  const renderTabContent = () => {
    /* -------------------------------------------------------------------------- */
    /* TAB 1: MAIN DASHBOARD VIEW (Matching PDF Page 1)                            */
    /* -------------------------------------------------------------------------- */
    if (currentTab === 'dashboard') {
      // Dynamic metrics calculation strictly from real database requests
      const totalCount = requests.length;
      const pendingCount = requests.filter((r) => r.status && r.status.startsWith('PENDING')).length;
      const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
      const returnedCount = requests.filter((r) => r.status === 'REJECTED_MANUAL' || r.status === 'REJECTED_OVERDUE').length;

      const displayTableRows = requests.slice(0, 5);

      return (
        <div className="w-full max-w-[1600px] mx-auto space-y-5 flex flex-col animate-fade-in pb-8">
          {/* Welcome / Page Header Banner */}
          <div className="bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white p-5 rounded-[8px] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[8px] bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-emerald-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-[22px] font-bold tracking-tight text-white">
                  Welcome back, {sessionUser?.name || 'Employee'}
                </h1>
                <p className="text-[13px] text-emerald-100/90 mt-0.5">
                  DENR PENRO Agusan del Norte · Electronic Travel Authorization Processing System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => router.push('/employee?tab=schedule')}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Travel Schedule</span>
              </button>
              <button
                onClick={() => router.push('/employee?tab=create')}
                className="h-8 px-[14px] text-[13px] font-semibold rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white text-[#0F4C2E] hover:bg-emerald-50 shadow-xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>File Travel Authority</span>
              </button>
            </div>
          </div>

          {/* 4 Stat Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Card 1: Total Requests */}
            <div className="bg-white p-4 rounded-[8px] border border-slate-200/80 border-l-4 border-l-[#0F4C2E] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Requests</p>
                {loading ? (
                  <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-[6px] mt-1" />
                ) : (
                  <h3 className="text-[24px] font-bold tracking-tight text-slate-900 mt-1">{totalCount}</h3>
                )}
                <p className="text-[12px] font-medium text-emerald-600 mt-0.5">
                  {loading ? 'Fetching records...' : totalCount > 0 ? `${totalCount} submitted to date` : 'No requests filed'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-emerald-50 text-[#0F4C2E] border border-emerald-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            {/* Stat Card 2: Pending */}
            <div className="bg-white p-4 rounded-[8px] border border-slate-200/80 border-l-4 border-l-amber-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
                {loading ? (
                  <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-[6px] mt-1" />
                ) : (
                  <h3 className="text-[24px] font-bold tracking-tight text-slate-900 mt-1">{pendingCount}</h3>
                )}
                <p className="text-[12px] font-medium text-[#D97706] mt-0.5">Awaiting approval</p>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Stat Card 3: Approved */}
            <div className="bg-white p-4 rounded-[8px] border border-slate-200/80 border-l-4 border-l-emerald-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
                {loading ? (
                  <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-[6px] mt-1" />
                ) : (
                  <h3 className="text-[24px] font-bold tracking-tight text-slate-900 mt-1">{approvedCount}</h3>
                )}
                <p className="text-[12px] font-medium text-[#16835D] mt-0.5">
                  Fully signed TA
                </p>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-emerald-50 text-[#16835D] border border-emerald-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Stat Card 4: Returned */}
            <div className="bg-white p-4 rounded-[8px] border border-slate-200/80 border-l-4 border-l-rose-500 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Returned</p>
                {loading ? (
                  <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-[6px] mt-1" />
                ) : (
                  <h3 className="text-[24px] font-bold tracking-tight text-slate-900 mt-1">{returnedCount}</h3>
                )}
                <p className="text-[12px] font-medium text-[#DC3545] mt-0.5">Needs revision</p>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>

          {/* Middle Section: Recent Requests (8 cols) + Notifications (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Card: Recent Requests */}
            <div className="lg:col-span-8 bg-white rounded-[8px] border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[360px] overflow-hidden">
              <div>
                <div className="px-4 py-3 border-b border-emerald-100 bg-emerald-950/[0.04] flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#0F4C2E]">Recent Travel Authority Requests</h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">Your recently submitted field itineraries and their approval progress</p>
                  </div>
                  <button
                    onClick={() => router.push('/employee?tab=create')}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#0F4C2E] hover:bg-[#165E3A] text-white cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/90 border-b border-slate-200">
                      <tr>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap text-left">Reference</th>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap text-left">Destination</th>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap text-left">Dates</th>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap text-center min-w-[160px]">Status</th>
                        <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap text-right">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        [1, 2, 3].map((skeletonIdx) => (
                          <tr key={`skeleton-${skeletonIdx}`} className="h-[42px] border-b border-slate-100 last:border-b-0 animate-pulse">
                            <td className="px-3 py-1.5 align-middle">
                              <div className="h-4 w-28 bg-slate-100 rounded"></div>
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <div className="h-4 w-36 bg-slate-100 rounded"></div>
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <div className="h-4 w-24 bg-slate-100 rounded"></div>
                            </td>
                            <td className="px-3 py-1.5 align-middle text-center">
                              <div className="h-5 w-28 bg-slate-100 rounded-[4px] inline-block"></div>
                            </td>
                            <td className="px-3 py-1.5 align-middle text-right">
                              <div className="h-2 w-20 bg-slate-100 rounded-full inline-block"></div>
                            </td>
                          </tr>
                        ))
                      ) : displayTableRows.length > 0 ? (
                        displayTableRows.map((req: any, idx: number) => {
                          const ref = req.trackingNumber || req.ref;
                          const dest = req.destination || req.dest;
                          const dates = req.startDate && req.endDate ? formatDateRangeShort(req.startDate, req.endDate) : req.dates;
                          const status = req.status;
                          const progressInfo = req.progress
                            ? { text: req.progress, width: req.progress === '3/3' ? '100%' : req.progress === '1/3' ? '33%' : '0%' }
                            : getProgressFromStatus(status);

                          return (
                            <tr
                              key={req.id || idx}
                              onClick={() => setSelectedRequest(req)}
                              className="h-[42px] border-b border-slate-100 last:border-b-0 hover:bg-emerald-50/40 transition-colors cursor-pointer"
                              title="Click to view details"
                            >
                              <td className="px-3 py-1.5 text-[13px] align-middle text-left whitespace-nowrap">
                                <span className="h-5 inline-flex items-center justify-center px-2 text-[11px] font-semibold font-mono rounded-[4px] bg-emerald-50 text-[#0F4C2E] border border-emerald-200">
                                  {ref}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-[13px] text-slate-800 font-medium align-middle text-left">
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-[#0F4C2E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="truncate max-w-[260px]">{dest}</span>
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-[13px] text-slate-600 align-middle text-left whitespace-nowrap">{dates}</td>
                              <td className="px-3 py-1.5 text-[13px] text-slate-900 align-middle text-center min-w-[160px]">{renderStatusBadge(status)}</td>
                              <td className="px-3 py-1.5 text-[13px] text-slate-900 align-middle text-right">
                                <div className="inline-flex items-center gap-2">
                                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-[#16835D] h-full rounded-full transition-all"
                                      style={{ width: progressInfo.width }}
                                    ></div>
                                  </div>
                                  <span className="font-mono text-[11px] font-semibold text-slate-600">{progressInfo.text}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 px-4 text-center">
                            <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-2.5">
                              <div className="w-10 h-10 rounded-[8px] bg-emerald-50 text-[#0F4C2E] flex items-center justify-center border border-emerald-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-[14px] font-semibold text-slate-900">No Travel Authority Requests Yet</h4>
                                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                                  You haven&apos;t filed any travel authority requests yet. Create a new request to start your travel authorization process.
                                </p>
                              </div>
                              <button
                                onClick={() => router.push('/employee?tab=create')}
                                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#0F4C2E] hover:bg-[#165E3A] text-white cursor-pointer mt-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Create Travel Request</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <span className="text-[12px] text-slate-500 font-medium">
                  {loading
                    ? 'Loading requests...'
                    : `Showing ${displayTableRows.length} recent ${displayTableRows.length === 1 ? 'request' : 'requests'}`}
                </span>
                <button
                  onClick={() => router.push('/employee?tab=requests')}
                  className="h-7 px-2.5 text-xs font-semibold rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#0F4C2E] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                >
                  <span>View All Requests</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Right Card: Notifications */}
            <div className="lg:col-span-4 bg-white rounded-[8px] border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[360px] overflow-hidden">
              <div>
                <div className="px-4 py-3 border-b border-emerald-100 bg-emerald-950/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-[#0F4C2E]">Notifications</h3>
                    <span className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] ${
                      unreadCount > 0
                        ? 'bg-[#E63946] text-white'
                        : 'bg-emerald-50 text-[#0F4C2E] border border-emerald-200'
                    }`}>
                      {unreadCount > 0 ? `${unreadCount} new` : `${notifications.length} total`}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/employee?tab=notifications')}
                    className="h-7 px-2.5 text-xs font-semibold rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#0F4C2E] hover:bg-emerald-100/60 cursor-pointer"
                  >
                    All →
                  </button>
                </div>

                <div className="p-4 space-y-2.5">
                  {loading ? (
                    [1, 2].map((skIdx) => (
                      <div key={`notif-sk-${skIdx}`} className="p-3 rounded-[6px] bg-slate-50 border border-slate-100 animate-pulse flex items-start gap-3">
                        <div className="w-5 h-5 bg-slate-200 rounded-full shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                          <div className="h-3 bg-slate-100 rounded w-full" />
                        </div>
                      </div>
                    ))
                  ) : notifications.length > 0 ? (
                    notifications.slice(0, 3).map((notif: any, nIdx: number) => {
                      const isApproved = notif.title?.toLowerCase().includes('approved');
                      const isRejected = notif.title?.toLowerCase().includes('reject') || notif.title?.toLowerCase().includes('revision');

                      const linkedReq = notif.requestId ? requests.find((r) => r.id === notif.requestId) : null;
                      const extraRemarks = getNotificationRemarks(notif, linkedReq);
                      const displayMsg = notif.message?.includes('Remarks:') || notif.message?.includes('Reason:')
                        ? notif.message
                        : extraRemarks
                        ? `${notif.message} Remarks: "${extraRemarks}"`
                        : notif.message;

                      return (
                        <div
                          key={notif.id || nIdx}
                          className={`flex items-start gap-3 p-3 rounded-[6px] border transition-colors ${
                            isRejected
                              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-50'
                              : isApproved
                              ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                              : 'bg-amber-50/50 border-amber-200/80 hover:bg-amber-50'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {isApproved ? (
                              <svg className="w-4 h-4 text-[#16835D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isRejected ? (
                              <svg className="w-4 h-4 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-semibold text-slate-900 truncate">{notif.title}</h4>
                            <p className="text-[12px] text-slate-600 mt-0.5 leading-snug line-clamp-2">{displayMsg}</p>
                            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
                              {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-9 h-9 rounded-[6px] bg-emerald-50 text-[#0F4C2E] flex items-center justify-center border border-emerald-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <p className="text-[13px] font-semibold text-slate-800">No notifications yet</p>
                      <p className="text-[12px] text-slate-500 max-w-[220px]">You will be notified here about updates to your travel requests.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/80">
                <button
                  onClick={() => router.push('/employee?tab=notifications')}
                  className="h-7 px-2.5 text-xs font-semibold rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#0F4C2E] hover:bg-emerald-50 w-full cursor-pointer"
                >
                  View Full Notification Center →
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Quick Services & Field Operations Guidelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: File Travel Authority */}
            <div className="bg-white p-5 rounded-[8px] border border-slate-200/80 border-l-4 border-l-[#0F4C2E] shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-[6px] bg-emerald-50 text-[#0F4C2E] border border-emerald-200 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-[14px] font-semibold text-slate-900">File Travel Authority</h4>
                <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                  Submit field inspection, monitoring, compliance verification, or official event travel requests online.
                </p>
              </div>
              <button
                onClick={() => router.push('/employee?tab=create')}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors w-full bg-[#0F4C2E] hover:bg-[#165E3A] text-white cursor-pointer"
              >
                <span>Start Application</span>
                <span>↗</span>
              </button>
            </div>

            {/* Card 2: Travel Schedule & Map */}
            <div className="bg-white p-5 rounded-[8px] border border-slate-200/80 border-l-4 border-l-blue-500 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-[6px] bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-[14px] font-semibold text-slate-900">Monthly Travel Schedule</h4>
                <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                  View scheduled field itineraries, approved calendar dates, and mapped regional destinations.
                </p>
              </div>
              <button
                onClick={() => router.push('/employee?tab=schedule')}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors w-full bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 cursor-pointer"
              >
                <span>Open Calendar & Map</span>
                <span>↗</span>
              </button>
            </div>

            {/* Card 3: DENR Approval Policy */}
            <div className="bg-white p-5 rounded-[8px] border border-slate-200/80 border-l-4 border-l-amber-500 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-[6px] bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h4 className="text-[14px] font-semibold text-slate-900">Approval Policy & Reminders</h4>
                <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                  Per DENR guidelines, submit requests 3 days prior. Approvals route through Section Chief → Division Chief → PENRO Head.
                </p>
              </div>
              <button
                onClick={() => router.push('/employee?tab=requests')}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors w-full bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 cursor-pointer"
              >
                <span>Track My Requests</span>
                <span>↗</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* -------------------------------------------------------------------------- */
    /* TAB 2: CREATE TRAVEL WIZARD (Strictly Matching PDF Pages 2-8)               */
    /* -------------------------------------------------------------------------- */
    if (currentTab === 'create') {
      return (
        <div className="w-full max-w-[1400px] mx-auto space-y-5 animate-fade-in pb-10 flex flex-col">
          <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden flex flex-col min-h-[600px]">
            {/* Wizard Stepper Bar at Top */}
            <div className="bg-[#F5F5F7] px-6 py-4 border-b border-[#E5E5E7] relative isolate">
              <div className="flex items-center justify-between relative px-6">
                <div className="absolute left-10 right-10 top-3.5 h-px bg-[#E5E5E7] z-0"></div>

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
                        className={`w-7 h-7 rounded-full font-semibold text-[12px] flex items-center justify-center transition-colors ${
                          isDone
                            ? 'bg-[#1B4332] text-white'
                            : isCurrent
                            ? 'bg-[#1B4332] text-white ring-2 ring-[#1B4332]/20'
                            : 'bg-white border border-[#E5E5E7] text-[#86868B]'
                        }`}
                      >
                        {isDone ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          stepItem.s
                        )}
                      </div>
                      <span className={`text-[12px] mt-1.5 ${isCurrent ? 'text-[#1B4332] font-semibold' : 'text-[#86868B] font-medium'}`}>
                        {stepItem.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wizard Card Body */}
            <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-[6px] font-medium">
                  {formError}
                </div>
              )}

              {/* STEP 1: Select Travel Dates */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Select Travel Dates</h3>

                  <DualMonthCalendarPicker
                    departureDate={createForm.departureDate}
                    returnDate={createForm.returnDate}
                    onSelectDeparture={(date) => setCreateForm((prev) => ({ ...prev, departureDate: date }))}
                    onSelectReturn={(date) => setCreateForm((prev) => ({ ...prev, returnDate: date }))}
                  />
                </div>
              )}

              {/* STEP 2: Employee Information */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Employee Information</h3>
                  </div>

                  {/* Read-Only Selected Travel Dates Reference from Step 1 */}
                  <div className="p-3.5 bg-emerald-50/70 rounded-[8px] border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[6px] bg-[#0F4C2E] text-white flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block">
                          Selected Travel Dates (Set in Step 1)
                        </span>
                        <p className="text-[13px] font-semibold text-[#1D1D1F] mt-0.5">
                          Departure: <span className="text-[#0F4C2E] font-bold">{createForm.departureDate || 'Not specified'}</span>
                          <span className="mx-2 text-emerald-300">|</span>
                          Return: <span className="text-[#0F4C2E] font-bold">{createForm.returnDate || 'Not specified'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-white text-emerald-800 border border-emerald-200/80 gap-1 shrink-0">
                        <svg className="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Read-Only
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Name</span>
                        <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1 normal-case tracking-normal">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Read-Only (Auto-filled)
                        </span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={createForm.employeeName}
                        placeholder="Employee name..."
                        className="w-full h-8 px-2.5 text-[13px] font-medium text-[#1D1D1F] bg-[#F5F5F7] border border-[#E5E5E7] rounded-[6px] outline-none cursor-not-allowed select-none"
                      />
                      <p className="text-[12px] text-[#86868B] mt-1">Automatically retrieved from your employee account.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
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
                      <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Position</span>
                        <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1 normal-case tracking-normal">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Read-Only (Auto-filled)
                        </span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={createForm.position || ''}
                        placeholder="Position automatically retrieved from your account..."
                        className="w-full h-8 px-2.5 text-[13px] font-medium text-[#1D1D1F] bg-[#F5F5F7] border border-[#E5E5E7] rounded-[6px] outline-none cursor-not-allowed select-none"
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
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
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
                          placeholder="Search a place, office, or barangay (e.g., Lemon, Makati, Los Baños)..."
                          className="w-full h-8 pl-8 pr-8 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
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

                      {/* Location Recommendations Dropdown */}
                      {showLocationDropdown && locationSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E5E7] rounded-[8px] shadow-xl z-30 overflow-hidden divide-y divide-[#E5E5E7] animate-fade-in max-h-60 overflow-y-auto">
                          <div className="px-3 py-1.5 bg-[#F5F5F7] text-[11px] font-semibold text-[#86868B] uppercase tracking-wider flex justify-between items-center">
                            <span>Location Recommendations</span>
                            <button
                              type="button"
                              onClick={() => setShowLocationDropdown(false)}
                              className="text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                              aria-label="Close recommendations"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
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
                              className="w-full px-3 py-2 text-left hover:bg-[#F2F2F7] transition-colors flex items-start gap-2.5 group"
                            >
                              <svg className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-[#1D1D1F] group-hover:text-[#1B4332] truncate">
                                  {item.name}
                                </p>
                                <p className="text-[12px] text-[#86868B] truncate">
                                  {item.fullAddress}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        Interactive Map Pick
                      </label>
                      <DynamicMapPicker
                        initialLat={createForm.destinationLat}
                        initialLng={createForm.destinationLng}
                        onLocationSelect={handleMapLocationSelect}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
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

                  {/* 2-Column Grid for Pre-filled Profile Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        Salary Grade
                      </label>
                      <input
                        type="text"
                        value={createForm.salaryGrade}
                        onChange={(e) => setCreateForm({ ...createForm, salaryGrade: e.target.value })}
                        className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        Division/Section/Unit
                      </label>
                      <input
                        type="text"
                        value={createForm.division}
                        onChange={(e) => setCreateForm({ ...createForm, division: e.target.value })}
                        className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        Station
                      </label>
                      <input
                        type="text"
                        value={createForm.station}
                        onChange={(e) => setCreateForm({ ...createForm, station: e.target.value })}
                        className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        Employment Status
                      </label>
                      <input
                        type="text"
                        value={createForm.employmentStatus}
                        onChange={(e) => setCreateForm({ ...createForm, employmentStatus: e.target.value })}
                        className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        Office
                      </label>
                      <input
                        type="text"
                        value={createForm.office}
                        onChange={(e) => setCreateForm({ ...createForm, office: e.target.value })}
                        className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        Signatory Station
                      </label>
                      <input
                        type="text"
                        value={createForm.signatoryStation}
                        onChange={(e) => setCreateForm({ ...createForm, signatoryStation: e.target.value })}
                        className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                      />
                    </div>
                  </div>

                  {/* Full Width Custom Fields */}
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
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
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
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
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
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
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
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
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={createForm.contactNumber}
                        onChange={(e) => setCreateForm({ ...createForm, contactNumber: e.target.value })}
                        className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                      />
                    </div>
                  </div>

                  {/* Supporting Documents Drag & Drop Upload Container */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                      Supporting Documents * (e.g., Invitation Letter, Memorandum, Program of Activities)
                    </label>
                    <SupportingDocumentsUpload
                      attachments={createForm.attachments}
                      onChange={(newAtts) => setCreateForm((prev) => ({ ...prev, attachments: newAtts }))}
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: Review and Submit */}
              {wizardStep === 5 && (
                <div className="space-y-5">
                  {/* Document Review Header */}
                  <div className="bg-[#0F4C2E] text-white rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[6px] bg-white/15 text-white border border-white/20 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-[14px] font-semibold text-white">Travel Authority Request Summary</h3>
                        <p className="text-[12px] text-emerald-100/80 mt-0.5">Please review all submitted information before final submission for approval.</p>
                      </div>
                    </div>
                    <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-800 text-emerald-100 border border-emerald-700 shrink-0 uppercase">
                      Ready for Submission
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* 1. Travel Schedule */}
                    <div className="bg-white rounded-[8px] border border-[#E5E5E7] p-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E5E7] mb-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-[4px] bg-[#1B4332] text-white flex items-center justify-center font-semibold text-[11px]">
                            1
                          </div>
                          <h4 className="text-[14px] font-semibold text-[#1D1D1F]">
                            Travel Schedule
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#1B4332] hover:bg-[#F2F2F7] cursor-pointer"
                        >
                          <span>Edit Step 1</span>
                          <svg className="w-3 h-3 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1">
                            Departure Date
                          </span>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[13px] font-semibold text-[#1D1D1F]">
                              {createForm.departureDate || 'Not specified'}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1">
                            Return Date
                          </span>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[13px] font-semibold text-[#1D1D1F]">
                              {createForm.returnDate || 'Not specified'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Employee Profile & Travel Area */}
                    <div className="bg-white rounded-[8px] border border-[#E5E5E7] p-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E5E7] mb-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-[4px] bg-[#1B4332] text-white flex items-center justify-center font-semibold text-[11px]">
                            2
                          </div>
                          <h4 className="text-[14px] font-semibold text-[#1D1D1F]">
                            Employee Information & Travel Area
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#1B4332] hover:bg-[#F2F2F7] cursor-pointer"
                        >
                          <span>Edit Step 2</span>
                          <svg className="w-3 h-3 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">
                            Employee Name
                          </span>
                          <span className="font-semibold text-[#1D1D1F]">{createForm.employeeName || 'None selected'}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7] md:col-span-2">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">
                            Position
                          </span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.position || 'Not specified'}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">
                            Travel Area
                          </span>
                          <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-[#1B4332] text-white mt-0.5">
                            {createForm.travelArea}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Travel Details & Location */}
                    <div className="bg-white rounded-[8px] border border-[#E5E5E7] p-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E5E7] mb-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-[4px] bg-[#1B4332] text-white flex items-center justify-center font-semibold text-[11px]">
                            3
                          </div>
                          <h4 className="text-[14px] font-semibold text-[#1D1D1F]">
                            Destination & Purpose of Travel
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#1B4332] hover:bg-[#F2F2F7] cursor-pointer"
                        >
                          <span>Edit Step 3</span>
                          <svg className="w-3 h-3 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>

                      <div className="space-y-3 text-[13px]">
                        <div className="p-3 bg-emerald-50/50 rounded-[6px] border border-emerald-200">
                          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                            Official Destination
                          </span>
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <p className="font-semibold text-[#1D1D1F] text-[13px]">{createForm.destination}</p>
                              <p className="text-[11px] font-mono text-[#86868B] mt-0.5">
                                Map Pin Coordinates: Latitude {createForm.destinationLat.toFixed(4)}, Longitude {createForm.destinationLng.toFixed(4)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1.5">
                            Purpose of Travel
                          </span>
                          <p className="text-[13px] text-[#1D1D1F] leading-relaxed whitespace-pre-line bg-white p-3 rounded-[6px] border border-[#E5E5E7]">
                            {createForm.purpose}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4. Additional Information & Administrative Details */}
                    <div className="bg-white rounded-[8px] border border-[#E5E5E7] p-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E5E7] mb-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-[4px] bg-[#1B4332] text-white flex items-center justify-center font-semibold text-[11px]">
                            4
                          </div>
                          <h4 className="text-[14px] font-semibold text-[#1D1D1F]">
                            Administrative & Additional Details
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWizardStep(4)}
                          className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#1B4332] hover:bg-[#F2F2F7] cursor-pointer"
                        >
                          <span>Edit Step 4</span>
                          <svg className="w-3 h-3 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px] mb-3">
                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Salary Grade</span>
                          <span className="font-semibold text-[#1D1D1F]">{createForm.salaryGrade}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Division/Section</span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.division}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Station</span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.station}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Employment Status</span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.employmentStatus}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Office</span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.office}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Signatory Station</span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.signatoryStation}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] pt-3 border-t border-[#E5E5E7]">
                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Per Diems / Expense Allowed</span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.perDiems || 'Standard Allowance / As per guidelines'}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Appropriations</span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.appropriations || 'Regular Operational Fund'}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Remarks or Special Instructions</span>
                          <span className="font-medium text-[#1D1D1F]">{createForm.remarks || 'None'}</span>
                        </div>

                        <div className="p-3 bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-0.5">Contact Number</span>
                          <span className="font-semibold text-[#1B4332]">{createForm.contactNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* 5. Supporting Documents */}
                    <div className="bg-white rounded-[8px] border border-[#E5E5E7] p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-[#1B4332] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <div>
                            <h4 className="text-[14px] font-semibold text-[#1D1D1F]">Supporting Documents</h4>
                            <p className="text-[12px] text-[#86868B] mt-0.5">
                              {createForm.attachments && createForm.attachments.length > 0
                                ? `${createForm.attachments.length} document${createForm.attachments.length === 1 ? '' : 's'} attached`
                                : 'No supporting documents attached (optional)'}
                            </p>
                          </div>
                        </div>

                        {createForm.attachments && createForm.attachments.length > 0 ? (
                          <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Attached ({createForm.attachments.length})
                          </span>
                        ) : (
                          <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]">
                            None attached
                          </span>
                        )}
                      </div>

                      {createForm.attachments && createForm.attachments.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#E5E5E7]">
                          {createForm.attachments.map((doc, idx) => {
                            const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                            return (
                              <div key={doc.id || idx} className="flex items-center justify-between p-2.5 rounded-[6px] bg-[#F5F5F7] border border-[#E5E5E7] text-[13px]">
                                <div className="flex items-center gap-2 truncate">
                                  <span className={`h-5 inline-flex items-center justify-center px-1.5 text-[10px] font-semibold rounded-[4px] ${isPdf ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                    {isPdf ? 'PDF' : 'DOC'}
                                  </span>
                                  <span className="font-medium text-[#1D1D1F] truncate" title={doc.name}>{doc.name}</span>
                                </div>
                                <span className="text-[11px] text-[#86868B] shrink-0 ml-2">
                                  {typeof doc.size === 'number' ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB` : (doc.size || '')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stepper Action Footer */}
              <div className="pt-5 border-t border-[#E5E5E7] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setWizardStep(1);
                    setFormError('');
                    if (sessionUser?.role === 'ACCOUNT_MANAGER') {
                      router.push('/account-manager?tab=dashboard');
                    } else {
                      router.push('/employee?tab=dashboard');
                    }
                  }}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2.5">
                  {wizardStep > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormError('');
                        setWizardStep((prev) => Math.max(prev - 1, 1));
                      }}
                      className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white border border-[#E5E5E7] text-[#1D1D1F] hover:bg-[#F2F2F7] cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Previous</span>
                    </button>
                  )}

                  {/* Save Draft Button */}
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white border border-[#1B4332] text-[#1B4332] hover:bg-[#F2F2F7] cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Save Draft</span>
                  </button>

                  {wizardStep < 5 ? (
                    <button
                      type="button"
                      onClick={handleWizardNext}
                      className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white cursor-pointer"
                    >
                      <span>Next</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleCreateSubmit}
                      className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* -------------------------------------------------------------------------- */
    /* TAB 3: MY REQUESTS / MY TRAVEL AUTHORITIES (Matching PDF Pages 9 & 10)      */
    /* -------------------------------------------------------------------------- */
    if (currentTab === 'requests') {
      const filtered = requests.filter((r) => {
        const matchesSearch =
          r.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.purpose.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      const totalReq = requests.length;
      const appReq = requests.filter((r) => r.status === 'APPROVED').length;
      const pendReq = requests.filter((r) => r.status && r.status.startsWith('PENDING')).length;
      const retReq = requests.filter((r) => r.status && r.status.startsWith('REJECTED')).length;

      return (
        <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in pb-10 flex flex-col">
          {/* Header & Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Filed */}
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#0F4C2E] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">Total Filed</span>
                <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1 block">{totalReq}</span>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#0F4C2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            {/* Approved TAs */}
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Approved TAs</span>
                <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1 block">{appReq}</span>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Under Review */}
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Under Review</span>
                <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1 block">{pendReq}</span>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Needs Revision */}
            <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-rose-500 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">Needs Revision</span>
                <span className="text-[24px] font-bold tracking-tight text-[#1D1D1F] mt-1 block">{retReq}</span>
              </div>
              <div className="w-9 h-9 rounded-[6px] bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>

          {/* Search, Filter & Action Bar */}
          <div className="bg-white p-3.5 rounded-[8px] border border-[#E5E5E7] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search by reference, destination, or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
              />
              <svg className="w-4 h-4 text-[#86868B] absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] w-full sm:w-auto cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING_SECTION_CHIEF">Pending Section Chief</option>
                <option value="PENDING_DIVISION_CHIEF">Pending Division Chief</option>
                <option value="PENDING_HEAD_PENRO">Pending Head of PENRO</option>
                <option value="REJECTED_MANUAL">Returned (Needs Revision)</option>
                <option value="DRAFT">Draft</option>
              </select>

              <button
                onClick={() => router.push('/employee?tab=create')}
                className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white shrink-0 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create TA</span>
              </button>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden min-h-[420px] flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                  <tr>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Reference No.</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Destination(s)</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Travel Dates</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center min-w-[160px]">Status</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">Filed Date</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((req) => (
                      <tr key={req.id} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors">
                        <td className="px-3 py-1.5 text-[13px] font-medium font-mono text-[#1B4332] align-middle text-left whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-[4px] bg-emerald-50 text-[#0F4C2E] border border-emerald-200/80 font-mono text-[12px] font-semibold">
                            {req.trackingNumber}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#86868B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate max-w-[300px]">{req.destination}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#86868B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center min-w-[160px]">{renderStatusBadge(req.status)}</td>
                        <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-right space-x-1.5 whitespace-nowrap">
                          {req.status === 'APPROVED' && (
                            <button
                              onClick={() => setTravelOrderModalRequest(req)}
                              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                              title="Print Official Approved Travel Order"
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              <span>Print Travel Order</span>
                            </button>
                          )}
                          {req.status === 'REJECTED_MANUAL' && (
                            <button
                              onClick={() => {
                                setResubmitModalRequest(req);
                                setResubmitStartDate(new Date(req.startDate).toISOString().slice(0, 10));
                                setResubmitEndDate(new Date(req.endDate).toISOString().slice(0, 10));
                                setResubmitError('');
                              }}
                              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 cursor-pointer"
                              title="Revise travel dates and resubmit"
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>Revise Dates</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-white border border-[#E5E5E7] hover:bg-[#F2F2F7] text-[#1D1D1F] cursor-pointer"
                            title="View Full Details"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[13px] text-[#86868B]">
                        No travel authorities found matching the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer & Information Bar */}
            <div className="px-4 py-2.5 bg-[#F5F5F7] border-t border-[#E5E5E7] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] text-[#86868B]">
                <span>Showing <strong className="text-[#1D1D1F] font-semibold">{filtered.length}</strong> of <strong className="text-[#1D1D1F] font-semibold">{requests.length}</strong> Travel Authority records</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#86868B] mr-1 hidden sm:inline">Page 1 of 1</span>
                <button
                  disabled
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors border border-[#E5E5E7] bg-white text-[#86868B] cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors border border-[#E5E5E7] bg-white text-[#86868B] cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Quick Notice Card at Bottom */}
          <div className="p-3.5 bg-[#F5F5F7] rounded-[8px] border border-[#E5E5E7] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[#1B4332] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] text-[#1D1D1F] leading-snug">
                <strong className="font-semibold">Need to modify or cancel a submitted request?</strong>{' '}
                <span className="text-[#86868B]">Requests pending review can be recalled or edited prior to Head of PENRO approval.</span>
              </p>
            </div>
            <button
              onClick={() => router.push('/employee?tab=schedule')}
              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#1B4332] hover:bg-[#E5E5E7]/60 whitespace-nowrap hidden md:inline-flex cursor-pointer"
            >
              View Travel Schedule →
            </button>
          </div>
        </div>
      );
    }

    /* -------------------------------------------------------------------------- */
    /* TAB 4: TRAVEL SCHEDULE (Matching PDF Page 11)                              */
    /* -------------------------------------------------------------------------- */
    if (currentTab === 'schedule') {
      const schedYear = scheduleCalendarDate.getFullYear();
      const schedMonth = scheduleCalendarDate.getMonth();
      const schedMonthLabel = scheduleCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const daysInMonth = new Date(schedYear, schedMonth + 1, 0).getDate();
      const firstDayIndex = new Date(schedYear, schedMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
      const prevMonthDays = new Date(schedYear, schedMonth, 0).getDate();

      const handlePrevMonth = () => setScheduleCalendarDate(new Date(schedYear, schedMonth - 1, 1));
      const handleNextMonth = () => setScheduleCalendarDate(new Date(schedYear, schedMonth + 1, 1));
      const handleToday = () => setScheduleCalendarDate(new Date());

      // Dynamic Statistics Calculation
      const approvedList = requests.filter((r) => r.status === 'APPROVED');
      const totalTravelDays = approvedList.reduce((acc, r) => {
        const s = new Date(r.startDate).getTime();
        const e = new Date(r.endDate).getTime();
        if (isNaN(s) || isNaN(e)) return acc;
        const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
        return acc + days;
      }, 0);
      const completedTripsCount = approvedList.length;
      const uniqueDestinationsCount = new Set(
        approvedList.map((r) => r.destination?.trim()).filter(Boolean)
      ).size;

      const nowMs = new Date().setHours(0, 0, 0, 0);
      const upcomingRequests = requests
        .filter((r) => (r.status === 'APPROVED' || r.status.startsWith('PENDING')) && new Date(r.endDate).getTime() >= nowMs)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      const nextUpcoming = upcomingRequests[0] || approvedList[0];

      // Scheduled Itineraries (Approved & Under Review)
      const scheduledItineraries = requests.filter(
        (r) => r.status === 'APPROVED' || (r.status && r.status.startsWith('PENDING'))
      );

      return (
        <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Calendar Main Box */}
            <div className="xl:col-span-8 2xl:col-span-9 bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-100/90 border-b border-[#E5E5E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Monthly Travel Schedule</h3>
                  <p className="text-[12px] text-[#86868B] mt-0.5">Overview of scheduled, approved, and pending field travel itineraries</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="h-7 px-2.5 inline-flex items-center justify-center bg-white text-[#1B4332] border border-[#E5E5E7] rounded-[6px] text-xs font-semibold">
                    {schedMonthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-white border border-[#E5E5E7] hover:bg-emerald-50/50 text-[#1D1D1F] cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-[6px] bg-white border border-[#E5E5E7] hover:bg-emerald-50/50 text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-[6px] bg-white border border-[#E5E5E7] hover:bg-emerald-50/50 text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-7 gap-2 text-center text-xs">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                    <div key={i} className="font-semibold text-[#86868B] py-1.5 text-[11px] uppercase tracking-wider">{d}</div>
                  ))}

                  {/* Leading padding cells from previous month */}
                  {Array.from({ length: firstDayIndex }).map((_, idx) => {
                    const prevDay = prevMonthDays - firstDayIndex + idx + 1;
                    return (
                      <div
                        key={`prev-${idx}`}
                        className="min-h-[76px] sm:min-h-[92px] p-2 rounded-[6px] border border-[#E5E5E7]/60 bg-[#F5F5F7]/50 text-[#86868B]/40 flex flex-col justify-between"
                      >
                        <span className="text-right text-[12px] font-medium">{prevDay}</span>
                      </div>
                    );
                  })}

                  {/* Days of current month */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayRequests = requests.filter((r) => {
                      if (!r.startDate || !r.endDate) return false;
                      const start = new Date(r.startDate);
                      start.setHours(0, 0, 0, 0);
                      const end = new Date(r.endDate);
                      end.setHours(23, 59, 59, 999);
                      const checkDate = new Date(schedYear, schedMonth, day, 12, 0, 0, 0);
                      return checkDate >= start && checkDate <= end;
                    });

                    const hasRequests = dayRequests.length > 0;

                    const isToday =
                      new Date().getFullYear() === schedYear &&
                      new Date().getMonth() === schedMonth &&
                      new Date().getDate() === day;

                    return (
                      <div
                        key={day}
                        onClick={() => {
                          if (dayRequests.length === 1) {
                            setSelectedRequest(dayRequests[0]);
                          }
                        }}
                        className={`min-h-[84px] sm:min-h-[100px] p-2 rounded-[6px] border flex flex-col justify-between transition-colors ${
                          isToday
                            ? 'border-[#1B4332] bg-white ring-1 ring-[#1B4332]/20 text-[#1D1D1F]'
                            : hasRequests
                            ? 'border-[#E5E5E7] bg-white hover:bg-[#F2F2F7] text-[#1D1D1F]'
                            : 'border-[#E5E5E7] bg-white hover:bg-[#F2F2F7] text-[#1D1D1F]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          {isToday ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]"></span>
                          ) : <span></span>}
                          <span className={`text-right text-[12px] font-medium ${isToday ? 'text-[#1B4332] font-bold' : 'text-[#86868B]'}`}>
                            {day}
                          </span>
                        </div>

                        {/* Stacked list of all matching TA requests on this day */}
                        {hasRequests ? (
                          <div className="space-y-1 w-full mt-auto">
                            {dayRequests.map((req) => {
                              const isApp = req.status === 'APPROVED';
                              const isPend = req.status && req.status.startsWith('PENDING');

                              return (
                                <button
                                  key={req.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRequest(req);
                                  }}
                                  className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded-[4px] font-semibold truncate flex items-center gap-1 transition-colors cursor-pointer border ${
                                    isApp
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : isPend
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      : 'bg-[#F5F5F7] text-[#86868B] border-[#E5E5E7] hover:bg-[#F2F2F7]'
                                  }`}
                                  title={`${isApp ? 'Approved' : isPend ? 'Under Review' : req.status}: ${req.destination || req.purpose} (${req.trackingNumber})`}
                                >
                                  <span className="truncate">{req.destination || req.trackingNumber}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Statistics & Upcoming Itineraries Panel */}
            <div className="xl:col-span-4 2xl:col-span-3 space-y-5">
              <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-100/90 border-b border-[#E5E5E7] flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Travel Statistics</h3>
                  <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                    FY {schedYear}
                  </span>
                </div>
                <div className="p-4 space-y-3 text-[13px]">
                  <div className="flex justify-between py-1.5 border-b border-[#E5E5E7]">
                    <span className="text-[#86868B]">Total Travel Days</span>
                    <span className="font-semibold text-[#1D1D1F]">{totalTravelDays} days</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E5E5E7]">
                    <span className="text-[#86868B]">Approved / Completed Trips</span>
                    <span className="font-semibold text-[#1D1D1F]">
                      {completedTripsCount} {completedTripsCount === 1 ? 'trip' : 'trips'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E5E5E7]">
                    <span className="text-[#86868B]">Destinations Visited</span>
                    <span className="font-semibold text-[#1D1D1F]">
                      {uniqueDestinationsCount} {uniqueDestinationsCount === 1 ? 'location' : 'locations'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#86868B]">Upcoming Itinerary</span>
                    <span className="font-semibold text-[#1B4332]">
                      {nextUpcoming
                        ? formatDateRangeShort(nextUpcoming.startDate, nextUpcoming.endDate)
                        : 'None scheduled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scheduled Itineraries Card */}
              <div className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-[#F5F5F7] border-b border-[#E5E5E7] flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Scheduled Itineraries</h3>
                  <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-white text-[#86868B] border border-[#E5E5E7]">
                    {scheduledItineraries.length} active
                  </span>
                </div>

                <div className="p-4">
                  {scheduledItineraries.length > 0 ? (
                    <div className="space-y-2.5">
                      {scheduledItineraries.map((itinerary) => {
                        const isApproved = itinerary.status === 'APPROVED';
                        const sDate = new Date(itinerary.startDate);
                        const eDate = new Date(itinerary.endDate);
                        const daysCount = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

                        return (
                          <div
                            key={itinerary.id}
                            onClick={() => setSelectedRequest(itinerary)}
                            className="p-3 rounded-[6px] border border-[#E5E5E7] bg-white hover:bg-[#F2F2F7] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[13px] font-medium text-[#1B4332]">
                                {itinerary.trackingNumber}
                              </span>
                              <span
                                className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] ${
                                  isApproved
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isApproved ? 'Approved' : 'Under Review'}
                              </span>
                            </div>
                            <p className="text-[13px] font-medium text-[#1D1D1F] flex items-center gap-1.5 mt-1.5">
                              <svg className="w-3.5 h-3.5 text-[#86868B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="truncate">{itinerary.destination}</span>
                            </p>
                            <p className="text-[12px] text-[#86868B] mt-1 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-[#86868B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formatDateRangeShort(itinerary.startDate, itinerary.endDate)} ({daysCount} {daysCount === 1 ? 'day' : 'days'})</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-[13px] text-[#86868B] bg-[#F5F5F7] rounded-[6px] border border-[#E5E5E7]">
                      No scheduled itineraries found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* -------------------------------------------------------------------------- */
    /* TAB 5: NOTIFICATIONS CENTER (Matching PDF Page 12)                        */
    /* -------------------------------------------------------------------------- */
    if (currentTab === 'notifications') {
      const handleMarkAllRead = async () => {
        try {
          await fetch('/api/notifications/read', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAll: true }),
          });
          fetchNotifications();
        } catch (err) {
          console.error('Failed to mark notifications read', err);
        }
      };

      return (
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto space-y-5 animate-fade-in pb-10 flex flex-col min-h-[560px]">
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[6px] bg-[#F5F5F7] text-[#1B4332] border border-[#E5E5E7] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Notification Center</h3>
                <p className="text-[12px] text-[#86868B]">{unreadCount} unread system notifications</p>
              </div>
            </div>

            <button
              onClick={handleMarkAllRead}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white border border-[#E5E5E7] hover:bg-[#F2F2F7] text-[#1B4332] cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Mark all as read</span>
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {notifications.length > 0 ? (
              notifications.map((notif: any, idx: number) => {
                // Find the linked TA request (if any) so we can open it on click
                const linkedRequest = notif.requestId
                  ? requests.find((r) => r.id === notif.requestId)
                  : null;

                const handleNotifClick = async () => {
                  // 1. Mark as read
                  if (!notif.isRead) {
                    try {
                      await fetch('/api/notifications/read', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notificationId: notif.id }),
                      });
                      fetchNotifications();
                    } catch (err) {
                      console.error('Failed to mark notification read', err);
                    }
                  }
                  // 2. Open TA request detail if we found a linked request
                  if (linkedRequest) {
                    setSelectedRequest(linkedRequest);
                  }
                };

                return (
                  <div key={notif.id || idx} className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
                        {formatDayHeading(notif.createdAt)}
                      </span>
                      <span className="text-[11px] text-[#86868B] font-medium">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <div
                      onClick={handleNotifClick}
                      className={`flex items-start gap-3.5 p-3 rounded-[6px] border transition-colors ${
                        notif.isRead
                          ? 'bg-[#F5F5F7] border-[#E5E5E7] hover:bg-[#F2F2F7]'
                          : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                      } ${linkedRequest ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {notif.isRead ? (
                          <svg className="w-4 h-4 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-[#1B4332]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-[14px] font-semibold text-[#1D1D1F]">{notif.title}</h4>
                          <span className="text-[11px] text-[#86868B] font-medium shrink-0">
                            {formatTimeDisplay(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#1D1D1F] mt-1">{notif.message}</p>
                        {(() => {
                          const remarksText = getNotificationRemarks(notif, linkedRequest);
                          if (!remarksText) return null;
                          return (
                            <div className="mt-2 p-2.5 bg-white rounded-[6px] border border-[#E5E5E7] text-[13px] text-[#1D1D1F]">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1B4332] uppercase tracking-wider mb-1">
                                <svg className="w-3.5 h-3.5 text-[#1B4332] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                <span>Signatory Remarks:</span>
                              </div>
                              <p className="italic text-[#1D1D1F] pl-5">
                                &ldquo;{remarksText}&rdquo;
                              </p>
                            </div>
                          );
                        })()}
                        {linkedRequest && (
                          <div className="flex items-center justify-end mt-2">
                            <span className="text-[12px] font-medium text-[#1B4332] flex items-center gap-0.5">
                              View Request Details →
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-[13px] text-[#86868B] bg-white rounded-[8px] border border-[#E5E5E7]">
                No notifications found. You are all caught up!
              </div>
            )}
          </div>

          <div className="p-3.5 bg-[#F5F5F7] rounded-[8px] border border-[#E5E5E7] flex items-center justify-between text-[13px] text-[#86868B]">
            <span>Real-time email and push notifications are active for all Travel Authority step endorsements.</span>
            <button
              onClick={() => router.push('/employee?tab=dashboard')}
              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors text-[#1B4332] hover:bg-[#E5E5E7]/60 cursor-pointer"
            >
              Back to Dashboard →
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-3.5 py-2.5 rounded-[8px] shadow-lg font-medium text-[13px] flex items-center gap-2 border transition-all ${
            toastMessage.type === 'success'
              ? 'bg-[#1B4332] text-white border-[#143225]'
              : 'bg-red-700 text-white border-red-800'
          }`}
        >
          <span>{toastMessage.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {renderTabContent()}

      {/* Floating View History Page / Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white border border-[#E5E5E7] rounded-[10px] shadow-xl overflow-hidden w-full max-w-4xl flex flex-col my-auto max-h-[92vh]">

            {/* Modal Navigation Top Bar */}
            <div className="bg-[#F5F5F7] border-b border-[#E5E5E7] px-5 py-3.5 flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 transition-colors bg-white border border-[#E5E5E7] text-[#1D1D1F] hover:bg-[#F2F2F7] cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back</span>
                </button>
                <div className="h-4 w-px bg-[#E5E5E7]"></div>
                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedRequest.trackingNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedRequest.status === 'REJECTED_MANUAL' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResubmitModalRequest(selectedRequest);
                      setResubmitStartDate(new Date(selectedRequest.startDate).toISOString().slice(0, 10));
                      setResubmitEndDate(new Date(selectedRequest.endDate).toISOString().slice(0, 10));
                      setResubmitError('');
                    }}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 cursor-pointer"
                    title="Revise travel dates and resubmit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Revise & Resubmit</span>
                  </button>
                )}

                {selectedRequest.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTravelOrderModalRequest(selectedRequest);
                    }}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white cursor-pointer"
                    title="View and Print Official Approved Travel Order"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print Travel Order</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="h-8 w-8 rounded-[6px] bg-white border border-[#E5E5E7] hover:bg-[#F2F2F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Floating Page Scroll Area */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-8 bg-white">

              {/* ==================== 1. DOCUMENT HISTORY ==================== */}
              <section className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Document History</h2>
                  <p className="text-[12px] text-[#86868B]">A chronological record of all events and updates.</p>
                </div>

                {/* Document History Timeline Container */}
                <div className="relative max-w-2xl mx-auto py-3">
                  {/* Centered Vertical Line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#E5E5E7] -translate-x-1/2 z-0"></div>

                  {/* Event 1: Request Created */}
                  <div className="relative z-10 my-4 flex items-center w-full">
                    <div className="w-1/2 pr-6 text-right">
                      <div className="inline-block bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs text-left max-w-sm w-full">
                        <h4 className="text-[14px] font-semibold text-[#1D1D1F]">{selectedRequest.createdBy?.name || 'Juan Dela Cruz'}</h4>
                        <p className="text-[12px] text-[#86868B] mt-1">
                          Submitted on <span className="font-medium text-[#1D1D1F]">{formatFullDateTimeDisplay(selectedRequest.createdAt)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Blue Clock Node Icon */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-xs border-2 border-white">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    <div className="w-1/2 pl-6 invisible"></div>
                  </div>
                </div>
              </section>

              {/* Divider Line */}
              <div className="border-t border-[#E5E5E7] w-3/4 mx-auto"></div>

              {/* ==================== 2. SIGNATORY LIST ==================== */}
              <section className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Signatory List</h2>
                  <p className="text-[12px] text-[#86868B]">Required signatories for document approval.</p>
                </div>

                {/* Signatory List Timeline Container */}
                <div className="relative max-w-2xl mx-auto py-3">
                  {/* Centered Vertical Line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#E5E5E7] -translate-x-1/2 z-0"></div>

                  {[
                    { order: 1, defaultName: 'Section Chief', role: 'Verifier' },
                    { order: 2, defaultName: 'Division Chief', role: 'Verifier' },
                    { order: 3, defaultName: 'Head of PENRO', role: 'Final Signatory' },
                  ].map((sig, index) => {
                    const isLeft = index % 2 === 0;
                    const step = selectedRequest.approvalSteps?.find((s) => s.order === sig.order);
                    const name = step?.approver?.name || (step as any)?.designatedApprover?.name || sig.defaultName;
                    const isCustomName = name && name.trim().toLowerCase() !== sig.defaultName.toLowerCase();
                    const roleSubtitle = isCustomName ? `${sig.defaultName} · ${sig.role}` : sig.role;
                    const isApproved = step?.action === 'APPROVED';
                    const isRejected = step?.action === 'REJECTED';

                    const nodeClasses = isApproved
                      ? 'bg-[#1B4332] text-white'
                      : isRejected
                      ? 'bg-red-600 text-white'
                      : 'bg-[#86868B] text-white';

                    const cardBorderClass = isApproved
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : isRejected
                      ? 'border-red-200 bg-red-50/40'
                      : 'border-[#E5E5E7] bg-white';

                    return (
                      <div key={sig.order} className="relative z-10 my-6 flex items-center w-full">
                        {/* Left Side Card */}
                        <div className={`w-1/2 pr-6 text-right ${isLeft ? 'block' : 'invisible'}`}>
                          <div className={`inline-block p-4 rounded-[8px] border shadow-xs text-left max-w-sm w-full ${cardBorderClass}`}>
                            <h4 className="text-[14px] font-semibold text-[#1D1D1F]">{name}</h4>
                            <p className="text-[12px] text-[#86868B] mt-0.5">{roleSubtitle}</p>
                            {isApproved && step?.actionDate && (
                              <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1 justify-end">
                                <svg className="w-3 h-3 text-emerald-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Approved · {formatFullDateTimeDisplay(step.actionDate)}</span>
                              </p>
                            )}
                            {isRejected && (
                              <div className="mt-1.5">
                                <p className="text-[11px] text-red-700 font-medium flex items-center gap-1 justify-end">
                                  <svg className="w-3 h-3 text-red-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Returned · {formatFullDateTimeDisplay(step?.actionDate || step?.updatedAt)}</span>
                                </p>
                                {step?.remarks && (
                                  <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-[6px] text-left">
                                    <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wider block">Return Remarks:</span>
                                    <p className="text-[12px] text-red-800 font-medium mt-0.5">{step.remarks}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dynamic Node Icon */}
                        <div className={`absolute left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-xs border-2 border-white ${nodeClasses}`}>
                          {isApproved ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isRejected ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          )}
                        </div>

                        {/* Right Side Card */}
                        <div className={`w-1/2 pl-6 text-left ${!isLeft ? 'block' : 'invisible'}`}>
                          <div className={`inline-block p-4 rounded-[8px] border shadow-xs text-left max-w-sm w-full ${cardBorderClass}`}>
                            <h4 className="text-[14px] font-semibold text-[#1D1D1F]">{name}</h4>
                            <p className="text-[12px] text-[#86868B] mt-0.5">{roleSubtitle}</p>
                            {isApproved && step?.actionDate && (
                              <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                                <svg className="w-3 h-3 text-emerald-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Approved · {formatFullDateTimeDisplay(step.actionDate)}</span>
                              </p>
                            )}
                            {isRejected && (
                              <div className="mt-1.5">
                                <p className="text-[11px] text-red-700 font-medium flex items-center gap-1">
                                  <svg className="w-3 h-3 text-red-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Returned · {formatFullDateTimeDisplay(step?.actionDate || step?.updatedAt)}</span>
                                </p>
                                {step?.remarks && (
                                  <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-[6px] text-left">
                                    <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wider block">Return Remarks:</span>
                                    <p className="text-[12px] text-red-800 font-medium mt-0.5">{step.remarks}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Supporting Documents Section in View Modal */}
              {selectedRequest.attachments && (selectedRequest.attachments as any[]).length > 0 && (
                <>
                  <div className="border-t border-[#E5E5E7] w-3/4 mx-auto"></div>
                  <section className="space-y-4 max-w-2xl mx-auto">
                    <div className="text-center space-y-1">
                      <h2 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Supporting Documents</h2>
                      <p className="text-[12px] text-[#86868B]">Uploaded documentation for this Travel Authority.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {(selectedRequest.attachments as any[]).map((doc: any, idx: number) => {
                        const isPdf = doc.name?.toLowerCase().endsWith('.pdf') || doc.type?.includes('pdf');
                        const formattedSize = typeof doc.size === 'number'
                          ? doc.size < 1024 * 1024
                            ? `${(doc.size / 1024).toFixed(1)} KB`
                            : `${(doc.size / (1024 * 1024)).toFixed(1)} MB`
                          : (doc.size || '');

                        return (
                          <div
                            key={doc.id || idx}
                            onClick={() => doc.url && window.open(doc.url, '_blank')}
                            className="flex items-center justify-between p-3 rounded-[8px] bg-white border border-[#E5E5E7] hover:bg-[#F2F2F7] transition-colors cursor-pointer group"
                            title={`Open ${doc.name}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] shrink-0 ${
                                isPdf ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {isPdf ? 'PDF' : 'DOC'}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[#1D1D1F] truncate group-hover:text-[#1B4332] transition-colors">{doc.name}</p>
                                <p className="text-[11px] text-[#86868B]">{formattedSize}</p>
                              </div>
                            </div>
                            <div className="w-7 h-7 rounded-[6px] bg-[#F5F5F7] group-hover:bg-[#1B4332] group-hover:text-white flex items-center justify-center text-[#86868B] shrink-0 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Resubmit / Date Revision Modal */}
      {resubmitModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#E5E5E7] rounded-[10px] shadow-xl overflow-hidden w-full max-w-lg">
            <div className="bg-[#F5F5F7] border-b border-[#E5E5E7] px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#1B4332] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-[14px] font-semibold text-[#1D1D1F]">Revise Travel Dates & Resubmit</span>
              </div>
              <button
                onClick={() => setResubmitModalRequest(null)}
                className="h-7 w-7 rounded-[6px] inline-flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-[#F5F5F7] border border-[#E5E5E7] rounded-[8px] text-[13px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Reference:</span>
                  <span className="font-mono font-medium text-[#1B4332]">{resubmitModalRequest.trackingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Destination:</span>
                  <span className="font-medium text-[#1D1D1F]">{resubmitModalRequest.destination}</span>
                </div>
                {(() => {
                  const rejectedStep = resubmitModalRequest.approvalSteps?.find((s: any) => s.action === 'REJECTED');
                  if (!rejectedStep?.remarks) return null;
                  return (
                    <div className="pt-1.5 mt-1.5 border-t border-[#E5E5E7] text-amber-800">
                      <span className="font-semibold block text-[12px]">Chief&apos;s Return Remarks:</span>
                      <p className="italic mt-0.5 text-[12px]">&ldquo;{rejectedStep.remarks}&rdquo;</p>
                    </div>
                  );
                })()}
              </div>

              {resubmitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-[6px] text-[13px] font-medium text-red-700">
                  {resubmitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1.5">
                    New Departure Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={resubmitStartDate}
                    onChange={(e) => setResubmitStartDate(e.target.value)}
                    className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1.5">
                    New Arrival Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={resubmitEndDate}
                    onChange={(e) => setResubmitEndDate(e.target.value)}
                    className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <p className="text-[12px] text-[#86868B] leading-relaxed">
                Upon resubmission, this request will restart verification at <strong className="text-[#1D1D1F] font-semibold">Step 1 (Section Chief)</strong> with your updated dates.
              </p>

              <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-[#E5E5E7]">
                <button
                  type="button"
                  onClick={() => setResubmitModalRequest(null)}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-white border border-[#E5E5E7] text-[#1D1D1F] hover:bg-[#F2F2F7] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={resubmitLoading || !resubmitStartDate || !resubmitEndDate}
                  onClick={handleResubmit}
                  className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 transition-colors bg-[#1B4332] hover:bg-[#143225] text-white disabled:opacity-50 cursor-pointer"
                >
                  {resubmitLoading ? 'Resubmitting...' : 'Confirm Resubmission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Travel Order Printable Document Modal */}
      <TravelOrderModal
        isOpen={!!travelOrderModalRequest}
        onClose={() => setTravelOrderModalRequest(null)}
        request={travelOrderModalRequest}
      />
    </>
  );
}

export default function EmployeeDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[13px] text-[#86868B]">Loading Employee Portal...</div>}>
      <EmployeeContent />
    </Suspense>
  );
}
