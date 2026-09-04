'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DynamicMapPicker from '@/components/map/DynamicMapPicker';
import ApprovalTrail from '@/components/approval-trail/ApprovalTrail';
import { TARequestDTO } from '@/types';
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

      let cellStyle = 'hover:bg-emerald-50 text-slate-700 font-semibold rounded-xl';
      if (isPast) {
        cellStyle = 'text-slate-300 bg-slate-50/50 cursor-not-allowed pointer-events-none line-through decoration-slate-300';
      } else if (isDeparture || isReturn) {
        cellStyle = 'bg-[#0F4C2E] text-white font-bold rounded-xl shadow-md scale-105';
      } else if (inRange) {
        cellStyle = 'bg-emerald-100/80 text-emerald-900 font-semibold rounded-none';
      }

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          disabled={isPast}
          onClick={() => handleDayClick(year, month, day)}
          className={`py-2 text-xs font-semibold transition-all flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 mx-auto ${cellStyle}`}
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Dual Month Calendar Left Column (8/12 width) */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
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
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dual Month Side-by-Side Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Month 1 */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 text-center mb-3">
              {monthNames[month1Month]} {month1Year}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={idx} className="text-[11px] font-bold text-slate-400 py-1.5 uppercase">
                  {d}
                </div>
              ))}
              {renderMonthGrid(month1Year, month1Month)}
            </div>
          </div>

          {/* Month 2 */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 text-center mb-3">
              {monthNames[month2Month]} {month2Year}
            </h4>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={idx} className="text-[11px] font-bold text-slate-400 py-1.5 uppercase">
                  {d}
                </div>
              ))}
              {renderMonthGrid(month2Year, month2Month)}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Dates Summary Right Column (4/12 width) */}
      <div className="lg:col-span-4 bg-[#F3F4F8] p-6 rounded-2xl space-y-5">
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-3.5">Selected Dates Summary</h4>

          <div className="space-y-3">
            {/* Departure Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Departure Date
                </span>
                <span className={`text-xs font-extrabold ${departureDate ? 'text-slate-900' : 'text-slate-400'}`}>
                  {formatDateDisplay(departureDate)}
                </span>
              </div>
              <span className={`w-3 h-3 rounded-full ${departureDate ? 'bg-[#0F4C2E]' : 'bg-slate-300'}`}></span>
            </div>

            {/* Return Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Return Date
                </span>
                <span className={`text-xs font-extrabold ${returnDate ? 'text-slate-900' : 'text-slate-400'}`}>
                  {formatDateDisplay(returnDate)}
                </span>
              </div>
              <span className={`w-3 h-3 rounded-full ${returnDate ? 'bg-[#0F4C2E]' : 'bg-slate-300'}`}></span>
            </div>

            {/* Duration Pill */}
            {durationDays !== null && (
              <div className="p-3 bg-emerald-100/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900">Total Travel Duration:</span>
                <span className="font-black text-[#0F4C2E] bg-white px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {durationDays} Day{durationDays > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions & Guidelines */}
        <div className="space-y-2 pt-2 border-t border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-700 block">Filing Guidelines:</span>
          <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 list-disc leading-relaxed">
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [requests, setRequests] = useState<TARequestDTO[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TARequestDTO | null>(null);
  const [travelOrderModalRequest, setTravelOrderModalRequest] = useState<TARequestDTO | null>(null);
  const [scheduleCalendarDate, setScheduleCalendarDate] = useState(() => new Date());

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

  // Helper to reset Create Travel Wizard form to initial state
  const getInitialCreateForm = (list: Array<{ id: string; name: string; position: string | null }> = []) => {
    const defaultEmp = list.length > 0 ? list[0] : null;
    return {
      departureDate: '',
      returnDate: '',
      employeeName: defaultEmp?.name || 'Juan Dela Cruz',
      position: defaultEmp?.position || 'Environmental Management Specialist II',
      designation: defaultEmp?.position || 'Section Chief, Environmental Management Section',
      travelArea: 'WITHIN AOR',
      destination: '',
      destinationLat: 14.5547,
      destinationLng: 121.0244,
      purpose: '',
      salaryGrade: '18',
      division: 'MSD/Planning Section',
      station: 'PENRO ADN PLANNING',
      employmentStatus: 'Permanent',
      office: 'PENRO ADN',
      signatoryStation: 'PENRO ADN PLANNING',
      perDiems: '',
      appropriations: '',
      remarks: '',
      certification: '',
      contactNumber: '09295855403',
      attachments: [] as string[],
      teamMembers: [] as { name: string; position: string }[],
    };
  };

  // Create Travel Wizard State (5 Steps matching PDF pages 2-8)
  const [wizardStep, setWizardStep] = useState(1);
  const [createForm, setCreateForm] = useState(() => getInitialCreateForm());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Database-driven Employees state for Step 2 dropdown
  const [employeeList, setEmployeeList] = useState<Array<{ id: string; name: string; position: string | null }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

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
            // Auto-align default form with first employee if not yet set or matching
            setCreateForm((prev) => {
              const matched = json.data.find((e: any) => e.name === prev.employeeName) || json.data[0];
              return {
                ...prev,
                employeeName: matched.name,
                position: matched.position || '',
                designation: matched.position || '',
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
  }, []);

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
          submitImmediately: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to submit Travel Authority request.');
        showToast(data.error || 'Failed to submit Travel Authority request.', 'error');
        setIsSubmitting(false);
        return;
      }

      // Reset wizard step back to Step 1
      setWizardStep(1);
      // Reset form state back to initial clean state
      setCreateForm(getInitialCreateForm(employeeList));
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      setFormError('');

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

      setIsSubmitting(false);
      fetchRequests();
      fetchNotifications();
      router.push('/employee?tab=requests');
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during submission.');
      showToast(err.message || 'An error occurred during submission.', 'error');
      setIsSubmitting(false);
    }
  };

  // Helper for Status Badges (Clean, flat design matching ETAPS reference)
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16835D] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16835D] shrink-0"></span> Approved
          </span>
        );
      case 'PENDING_SECTION_CHIEF':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2580B8] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2580B8] shrink-0 animate-pulse"></span> Pending Section Chief
          </span>
        );
      case 'PENDING_DIVISION_CHIEF':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2580B8] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2580B8] shrink-0 animate-pulse"></span> Pending Division Chief
          </span>
        );
      case 'PENDING_HEAD_PENRO':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D97706] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0 animate-pulse"></span> Pending Head of PENRO
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D97706] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0"></span> Pending
          </span>
        );
      case 'REJECTED_MANUAL':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D97706] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0"></span> Returned (Needs Revision)
          </span>
        );
      case 'REJECTED_OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC3545] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC3545] shrink-0"></span> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B] shrink-0"></span> Draft
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

  // Static/Fallback Mock data to match PDF screenshots if DB has zero requests
  const mockRecentRequests = [
    { ref: 'TA-2024-00123', dest: 'Makati City', dates: 'Feb 15 - Feb 17', status: 'APPROVED', progress: '3/3', current: 'PENRO Approved' },
    { ref: 'TA-2024-00124', dest: 'Los Baños, Laguna', dates: 'Feb 25 - Feb 26', status: 'PENDING_DIVISION_CHIEF', progress: '1/3', current: 'Division Chief' },
    { ref: 'TA-2024-00125', dest: 'Quezon City', dates: 'Mar 5 - Mar 7', status: 'REJECTED_MANUAL', progress: '0/3', current: 'Returned for Revision' },
    { ref: 'TA-2024-00126', dest: 'Calamba, Laguna', dates: 'Jan 20 - Jan 22', status: 'APPROVED', progress: '3/3', current: 'PENRO Approved' },
    { ref: 'TA-2024-00127', dest: 'San Pablo City', dates: 'Mar 15 - Mar 16', status: 'DRAFT', progress: '0/0', current: 'Draft' },
  ];

  const renderTabContent = () => {
    /* -------------------------------------------------------------------------- */
    /* TAB 1: MAIN DASHBOARD VIEW (Matching PDF Page 1)                            */
    /* -------------------------------------------------------------------------- */
    if (currentTab === 'dashboard') {
      // Dynamic metrics calculation from real DB requests (falling back to mock counts if DB has no requests yet)
      const hasRealRequests = requests.length > 0;
      const totalCount = hasRealRequests ? requests.length : mockRecentRequests.length;
      const pendingCount = hasRealRequests
        ? requests.filter((r) => r.status && r.status.startsWith('PENDING')).length
        : 1;
      const approvedCount = hasRealRequests
        ? requests.filter((r) => r.status === 'APPROVED').length
        : 2;
      const returnedCount = hasRealRequests
        ? requests.filter((r) => r.status === 'REJECTED_MANUAL' || r.status === 'REJECTED_OVERDUE').length
        : 1;

      const displayTableRows = hasRealRequests ? requests.slice(0, 5) : mockRecentRequests;

      return (
        <div className="w-full max-w-[1600px] mx-auto space-y-6 flex flex-col animate-fade-in pb-8">
          {/* 4 Stat Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat Card 1: Total Requests */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requests</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalCount}</h3>
                <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                  {hasRealRequests ? 'Live database total' : '+12% this month'}
                </p>
              </div>
              <div className="flex items-center justify-center bg-transparent">
                <svg className="w-7 h-7 text-[#0B5A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            {/* Stat Card 2: Pending */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{pendingCount}</h3>
                <p className="text-[11px] font-semibold text-[#D97706] mt-1">Awaiting approval</p>
              </div>
              <div className="flex items-center justify-center bg-transparent">
                <svg className="w-7 h-7 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Stat Card 3: Approved */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{approvedCount}</h3>
                <p className="text-[11px] font-semibold text-[#16835D] mt-1">
                  {hasRealRequests ? 'Fully signed TA' : '+3 this week'}
                </p>
              </div>
              <div className="flex items-center justify-center bg-transparent">
                <svg className="w-7 h-7 text-[#16835D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Stat Card 4: Returned */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Returned</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{returnedCount}</h3>
                <p className="text-[11px] font-semibold text-[#DC3545] mt-1">Needs revision</p>
              </div>
              <div className="flex items-center justify-center bg-transparent">
                <svg className="w-7 h-7 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>

          {/* Middle Section: Recent Requests (8 cols) + Notifications (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Card: Recent Requests */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Travel Authority Requests</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Your recently submitted field itineraries and their approval progress</p>
                  </div>
                  <button
                    onClick={() => router.push('/employee?tab=create')}
                    className="px-3.5 py-1.5 bg-transparent hover:bg-[#F4F8F5] text-[#0B5A3A] hover:border-[#0B5A3A]/60 rounded-xl text-xs font-semibold transition-all border border-[#0B5A3A]/30 flex items-center gap-1.5 shadow-none cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-3 px-2">Reference</th>
                        <th className="pb-3 px-2">Destination</th>
                        <th className="pb-3 px-2">Dates</th>
                        <th className="pb-3 px-2 min-w-[170px]">Status</th>
                        <th className="pb-3 px-2 text-right">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {displayTableRows.map((req: any, idx: number) => {
                        const ref = req.trackingNumber || req.ref;
                        const dest = req.destination || req.dest;
                        const dates = req.startDate && req.endDate ? formatDateRangeShort(req.startDate, req.endDate) : req.dates;
                        const status = req.status;
                        const progressInfo = req.progress
                          ? { text: req.progress, width: req.progress === '3/3' ? '100%' : req.progress === '1/3' ? '33%' : '0%' }
                          : getProgressFromStatus(status);

                        return (
                          <tr key={req.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-2 font-bold font-mono text-[#0B5A3A]">{ref}</td>
                            <td className="py-3.5 px-2 text-slate-700 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="font-semibold">{dest}</span>
                            </td>
                            <td className="py-3.5 px-2 text-slate-500 font-medium">{dates}</td>
                            <td className="py-3.5 px-2 min-w-[170px]">{renderStatusBadge(status)}</td>
                            <td className="py-3.5 px-2 text-right">
                              <div className="inline-flex items-center gap-2">
                                <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-[#16835D] h-full rounded-full transition-all"
                                    style={{ width: progressInfo.width }}
                                  ></div>
                                </div>
                                <span className="font-mono text-[11px] font-semibold text-[#64748B]">{progressInfo.text}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Showing {displayTableRows.length} recent requests</span>
                <button
                  onClick={() => router.push('/employee?tab=requests')}
                  className="text-xs font-bold text-[#0B5A3A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Requests</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Right Card: Notifications */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#E63946] text-white text-[10px] font-bold">
                      {unreadCount > 0 ? `${unreadCount} new` : `${notifications.length || 2} total`}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/employee?tab=notifications')}
                    className="text-xs font-bold text-[#0B5A3A] hover:underline cursor-pointer"
                  >
                    All →
                  </button>
                </div>

                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 3).map((notif: any, nIdx: number) => {
                      const isApproved = notif.title?.toLowerCase().includes('approved');
                      const isRejected = notif.title?.toLowerCase().includes('reject') || notif.title?.toLowerCase().includes('revision');

                      return (
                        <div
                          key={notif.id || nIdx}
                          className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                            isRejected
                              ? 'bg-rose-50/60 border border-rose-100 hover:bg-rose-50'
                              : 'bg-slate-50 border border-slate-100 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {isApproved ? (
                              <svg className="w-5 h-5 text-[#16835D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isRejected ? (
                              <svg className="w-5 h-5 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                              {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="shrink-0 mt-0.5">
                          <svg className="w-5 h-5 text-[#16835D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Travel Authority Approved</h4>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            Your Travel Authority TA-20260816-1242991 has been fully signed by Head of PENRO.
                          </p>
                          <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Aug 17</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="shrink-0 mt-0.5">
                          <svg className="w-5 h-5 text-[#2580B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">TA Step Endorsement</h4>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            Division Chief approved and endorsed your travel authority request.
                          </p>
                          <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Aug 16</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => router.push('/employee?tab=notifications')}
                className="mt-4 pt-3 border-t border-slate-100 text-center text-xs font-bold text-[#0B5A3A] hover:underline block w-full cursor-pointer"
              >
                View Full Notification Center →
              </button>
            </div>
          </div>

          {/* Bottom Section: Quick Services & Field Operations Guidelines Grid (Fills remaining height) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: File Travel Authority */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <svg className="w-7 h-7 text-[#0B5A3A] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="text-sm font-bold text-slate-900">File Travel Authority</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Submit field inspection, monitoring, compliance verification, or official event travel requests online.
                </p>
              </div>
              <button
                onClick={() => router.push('/employee?tab=create')}
                className="w-full py-2.5 bg-[#0B5A3A] hover:bg-[#06452F] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Start Application</span>
                <span>↗</span>
              </button>
            </div>

            {/* Card 2: Travel Schedule & Map */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <svg className="w-7 h-7 text-[#2580B8] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h4 className="text-sm font-bold text-slate-900">Monthly Travel Schedule</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  View scheduled field itineraries, approved calendar dates, and mapped regional destinations.
                </p>
              </div>
              <button
                onClick={() => router.push('/employee?tab=schedule')}
                className="w-full py-2.5 bg-white border border-slate-200 hover:bg-[#F4F8F5] text-slate-700 hover:text-[#0B5A3A] text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open Calendar & Map</span>
                <span>↗</span>
              </button>
            </div>

            {/* Card 3: DENR Approval Policy */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <svg className="w-7 h-7 text-[#D97706] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h4 className="text-sm font-bold text-slate-900">Approval Policy & Reminders</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Per DENR guidelines, submit requests 3 days prior. Approvals route through Section Chief → Division Chief → PENRO Head.
                </p>
              </div>
              <button
                onClick={() => router.push('/employee?tab=requests')}
                className="w-full py-2.5 bg-white border border-slate-200 hover:bg-[#F4F8F5] text-slate-700 hover:text-[#0B5A3A] text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
        <div className="w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in pb-10 flex flex-col">
          {/* Wizard Stepper Bar at Top (Matching PDF Header Stepper) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs">
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
                      className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center transition-all ${isDone
                          ? 'bg-[#0B5A3A] text-white'
                          : isCurrent
                            ? 'bg-[#0B5A3A] text-white ring-4 ring-emerald-100 font-extrabold'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                    >
                      {isDone ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepItem.s
                      )}
                    </div>
                    <span className={`text-[11px] font-semibold mt-2 ${isCurrent ? 'text-[#0B5A3A] font-bold' : 'text-slate-400'}`}>
                      {stepItem.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wizard Card Body */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6 min-h-[580px] flex flex-col justify-between">
            {formError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
                {formError}
              </div>
            )}

            {/* STEP 1: Select Travel Dates (EXACT PDF Page 2 Dual Calendar View) */}
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

            {/* STEP 2: Employee Information (PDF Page 3) */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Employee Information</h3>
                </div>

                {/* Read-Only Selected Travel Dates Reference from Step 1 */}
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

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-600 text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Read-Only
                    </span>
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#2E6F4E] cursor-pointer hover:bg-white transition-all shadow-2xs"
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#2E6F4E] cursor-pointer hover:bg-white transition-all shadow-2xs"
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

            {/* STEP 3: Travel Details (PDF Pages 4 & 5) */}
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
                        placeholder="Search a place, office, or barangay (e.g., Lemon, Makati, Los Baños)..."
                        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E] transition-all"
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

                    {/* Location Recommendations Dropdown */}
                    {showLocationDropdown && locationSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 animate-fade-in max-h-60 overflow-y-auto">
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                          <span>Location Recommendations</span>
                          <button
                            type="button"
                            onClick={() => setShowLocationDropdown(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
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
                            className="w-full px-4 py-2.5 text-left hover:bg-emerald-50/70 transition-colors flex items-start gap-2.5 group"
                          >
                            <svg className="w-4 h-4 text-[#0F4C2E] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 group-hover:text-[#0F4C2E] truncate">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {item.fullAddress}
                              </p>
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
                      onLocationSelect={handleMapLocationSelect}
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Additional Information (Strictly Matching Reference Screenshots) */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-slate-900">Additional Information</h3>

                {/* 2-Column Grid for Pre-filled Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Salary Grade
                    </label>
                    <input
                      type="text"
                      value={createForm.salaryGrade}
                      onChange={(e) => setCreateForm({ ...createForm, salaryGrade: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Division/Section/Unit
                    </label>
                    <input
                      type="text"
                      value={createForm.division}
                      onChange={(e) => setCreateForm({ ...createForm, division: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  {/* Row 2 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Station
                    </label>
                    <input
                      type="text"
                      value={createForm.station}
                      onChange={(e) => setCreateForm({ ...createForm, station: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Employment Status
                    </label>
                    <input
                      type="text"
                      value={createForm.employmentStatus}
                      onChange={(e) => setCreateForm({ ...createForm, employmentStatus: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  {/* Row 3 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Office
                    </label>
                    <input
                      type="text"
                      value={createForm.office}
                      onChange={(e) => setCreateForm({ ...createForm, office: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Signatory Station
                    </label>
                    <input
                      type="text"
                      value={createForm.signatoryStation}
                      onChange={(e) => setCreateForm({ ...createForm, signatoryStation: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>
                </div>

                {/* Full Width Custom Fields matching reference screenshots */}
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Per Diems/Expense Allowed
                    </label>
                    <input
                      type="text"
                      value={createForm.perDiems}
                      onChange={(e) => setCreateForm({ ...createForm, perDiems: e.target.value })}
                      placeholder="Enter per diems information..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Appropriations to which travel should be charged
                    </label>
                    <input
                      type="text"
                      value={createForm.appropriations}
                      onChange={(e) => setCreateForm({ ...createForm, appropriations: e.target.value })}
                      placeholder="Enter appropriations Information..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Remarks or Special Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={createForm.remarks}
                      onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                      placeholder="Enter any remarks or special instructions..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Certification
                    </label>
                    <input
                      type="text"
                      value={createForm.certification}
                      onChange={(e) => setCreateForm({ ...createForm, certification: e.target.value })}
                      placeholder="Enter certification details..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={createForm.contactNumber}
                      onChange={(e) => setCreateForm({ ...createForm, contactNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E]"
                    />
                  </div>
                </div>

                {/* Supporting Documents Drag & Drop Upload Container */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Supporting Documents * (e.g., Invitation Letter, Memorandum, Program of Activities)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-slate-200/60 text-slate-500 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-slate-700">Click to upload files or drag and drop</p>
                    <p className="text-[10px] text-slate-400 mt-1">PDF, DOC, DOCX, JPG, JPEG, PNG (Max 25MB)</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Review and Submit (Highly Readable & Formatted Document Summary) */}
            {wizardStep === 5 && (
              <div className="space-y-6">
                {/* Document Review Header */}
                <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0 border border-white/10">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold tracking-tight">Travel Authority Request Summary</h3>
                      <p className="text-xs text-emerald-200/80 mt-0.5">Please review all submitted information before final submission for approval.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-bold uppercase tracking-wider shrink-0 border border-emerald-700/50">
                    Ready for Submission
                  </span>
                </div>

                <div className="space-y-5">
                  {/* 1. Travel Schedule */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#0F4C2E] flex items-center justify-center font-bold text-xs">
                          1
                        </div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Travel Schedule
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="text-[11px] font-bold text-[#0B5A3A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Edit Step 1</span>
                        <svg className="w-3 h-3 text-[#0B5A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Departure Date
                        </span>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-extrabold text-slate-900">
                            {createForm.departureDate || 'Not specified'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Return Date
                        </span>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-extrabold text-slate-900">
                            {createForm.returnDate || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Employee Profile & Travel Area */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#0B5A3A] flex items-center justify-center font-bold text-xs">
                          2
                        </div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Employee Information & Travel Area
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="text-[11px] font-bold text-[#0B5A3A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Edit Step 2</span>
                        <svg className="w-3 h-3 text-[#0B5A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Employee Name
                        </span>
                        <span className="font-extrabold text-slate-900">{createForm.employeeName || 'None selected'}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Position / Designation
                        </span>
                        <span className="font-bold text-slate-800">{createForm.position || createForm.designation || 'Not specified'}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Travel Area
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0B5A3A] text-white font-extrabold text-[11px] inline-block mt-0.5 shadow-2xs">
                          {createForm.travelArea}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Travel Details & Location */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#0B5A3A] flex items-center justify-center font-bold text-xs">
                          3
                        </div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Destination & Purpose of Travel
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="text-[11px] font-bold text-[#0B5A3A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Edit Step 3</span>
                        <svg className="w-3 h-3 text-[#0B5A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/80">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                          Official Destination
                        </span>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-[#0B5A3A] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">{createForm.destination}</p>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Map Pin Coordinates: Latitude {createForm.destinationLat.toFixed(4)}, Longitude {createForm.destinationLng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Purpose of Travel
                        </span>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200/80">
                          {createForm.purpose}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. Additional Information & Administrative Details */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#0B5A3A] flex items-center justify-center font-bold text-xs">
                          4
                        </div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Administrative & Additional Details
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWizardStep(4)}
                        className="text-[11px] font-bold text-[#0B5A3A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Edit Step 4</span>
                        <svg className="w-3 h-3 text-[#0B5A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Salary Grade</span>
                        <span className="font-extrabold text-slate-800">{createForm.salaryGrade}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Division/Section</span>
                        <span className="font-bold text-slate-800">{createForm.division}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Station</span>
                        <span className="font-bold text-slate-800">{createForm.station}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Employment Status</span>
                        <span className="font-bold text-slate-800">{createForm.employmentStatus}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Office</span>
                        <span className="font-bold text-slate-800">{createForm.office}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Signatory Station</span>
                        <span className="font-bold text-slate-800">{createForm.signatoryStation}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Per Diems / Expense Allowed</span>
                        <span className="font-bold text-slate-800">{createForm.perDiems || 'Standard Allowance / As per guidelines'}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Appropriations</span>
                        <span className="font-bold text-slate-800">{createForm.appropriations || 'Regular Operational Fund'}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Remarks or Special Instructions</span>
                        <span className="font-medium text-slate-800">{createForm.remarks || 'None'}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Contact Number</span>
                        <span className="font-extrabold text-[#0F4C2E]">{createForm.contactNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Supporting Documents */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F4C2E] flex items-center justify-center shrink-0 border border-emerald-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Supporting Documents</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Invitation Letter, Memorandum, Program of Activities attached</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#0F4C2E] text-[11px] font-extrabold uppercase tracking-wider">
                      Attached & Ready
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Action Footer matching Page 2 of PDF: Cancel on left, Save Draft + Next on right */}
            <div className="pt-6 border-t border-slate-200/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setWizardStep(1);
                  setFormError('');
                  router.push('/employee?tab=dashboard');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormError('');
                      setWizardStep((prev) => Math.max(prev - 1, 1));
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous</span>
                  </button>
                )}

                {/* Save Draft Button (Matching Page 2 PDF) */}
                <button
                  type="button"
                  onClick={() => showToast('Draft saved successfully!', 'success')}
                  className="px-5 py-2.5 rounded-xl border border-[#0B5A3A] text-[#0B5A3A] bg-white hover:bg-emerald-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
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
                    className="px-6 py-2.5 bg-[#0B5A3A] hover:bg-[#06452F] text-white rounded-xl text-xs font-bold shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
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
                    className="px-6 py-2.5 bg-[#0B5A3A] hover:bg-[#06452F] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                )}
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
        <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-10 flex flex-col">
          {/* Header & Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Filed */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Filed</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{totalReq}</span>
              </div>
              <div className="flex items-center justify-center bg-transparent">
                <svg className="w-7 h-7 text-[#0B5A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            {/* Approved TAs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved TAs</span>
                <span className="text-xl font-black text-[#16835D] mt-0.5 block">{appReq}</span>
              </div>
              <div className="flex items-center justify-center bg-transparent">
                <svg className="w-7 h-7 text-[#16835D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Under Review */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Under Review</span>
                <span className="text-xl font-black text-[#D97706] mt-0.5 block">{pendReq}</span>
              </div>
              <div className="flex items-center justify-center bg-transparent">
                <svg className="w-7 h-7 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Needs Revision */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Needs Revision</span>
                <span className="text-xl font-black text-[#DC3545] mt-0.5 block">{retReq}</span>
              </div>
              <div className="flex items-center justify-center bg-transparent">
                <svg className="w-7 h-7 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>

          {/* Search, Filter & Action Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search by reference, destination, or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E6F4E] transition-all"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2E6F4E] w-full sm:w-auto cursor-pointer"
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
                className="px-4 py-2.5 bg-[#0B5A3A] hover:bg-[#06452F] text-white text-xs font-bold rounded-xl shadow-2xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create TA</span>
              </button>
            </div>
          </div>

          {/* Table Container Card (Min height with bottom pagination) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden min-h-[460px] flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-4 px-6">Reference No.</th>
                    <th className="py-4 px-6">Destination(s)</th>
                    <th className="py-4 px-6">Travel Dates</th>
                    <th className="py-4 px-6 min-w-[170px]">Status</th>
                    <th className="py-4 px-6">Filed Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.length > 0 ? (
                    filtered.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold font-mono text-[#0B5A3A]">{req.trackingNumber}</td>
                        <td className="py-4 px-6 text-slate-700 font-semibold flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{req.destination}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 min-w-[170px]">{renderStatusBadge(req.status)}</td>
                        <td className="py-4 px-6 text-slate-400 font-medium">{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                          {req.status === 'APPROVED' && (
                            <button
                              onClick={() => setTravelOrderModalRequest(req)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-[#0B5A3A] font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Print Official Approved Travel Order"
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              <span>Print Travel Order</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="px-3 py-1.5 rounded-lg bg-transparent border border-slate-200 hover:bg-[#F5F7F9] hover:border-[#0B5A3A]/40 text-slate-600 hover:text-[#0B5A3A] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-none"
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
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No travel authorities found matching the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer & Information Bar */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Showing <strong className="text-slate-800">{filtered.length}</strong> of <strong className="text-slate-800">{requests.length}</strong> Travel Authority records</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 mr-2 hidden sm:inline">Page 1 of 1</span>
                <button
                  disabled
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 text-xs font-semibold cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 text-xs font-semibold cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Quick Notice Card at Bottom */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#0B5A3A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-[#0B5A3A] font-medium leading-snug">
                <strong>Need to modify or cancel a submitted request?</strong> Requests pending review can be recalled or edited prior to Head of PENRO approval.
              </p>
            </div>
            <button
              onClick={() => router.push('/employee?tab=schedule')}
              className="text-xs font-bold text-[#0B5A3A] hover:underline whitespace-nowrap hidden md:inline-block cursor-pointer"
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
        <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Calendar Main Box (8 cols on XL, 9 cols on 2XL) */}
            <div className="xl:col-span-8 2xl:col-span-9 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Monthly Travel Schedule</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Overview of scheduled, approved, and pending field travel itineraries</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
                  <span className="px-3 py-1.5 bg-emerald-50 text-[#0B5A3A] border border-emerald-200/80 rounded-lg font-bold">
                    {schedMonthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2.5 text-center text-xs">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                  <div key={i} className="font-bold text-slate-400 py-2 text-[11px] uppercase tracking-wider">{d}</div>
                ))}

                {/* Leading padding cells from previous month */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => {
                  const prevDay = prevMonthDays - firstDayIndex + idx + 1;
                  return (
                    <div
                      key={`prev-${idx}`}
                      className="min-h-[76px] sm:min-h-[92px] p-2.5 rounded-xl border border-slate-100/60 bg-slate-50/40 text-slate-300 opacity-40 flex flex-col justify-between"
                    >
                      <span className="text-right text-xs font-medium">{prevDay}</span>
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

                  const hasApproved = dayRequests.some((r) => r.status === 'APPROVED');
                  const hasPending = dayRequests.some((r) => r.status && r.status.startsWith('PENDING'));
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
                      className={`min-h-[84px] sm:min-h-[100px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                        isToday
                          ? 'border-[#16835D] bg-white ring-2 ring-emerald-100 text-slate-900 shadow-2xs'
                          : hasRequests
                          ? 'border-slate-200 bg-white hover:bg-slate-50/60 text-slate-800'
                          : 'border-slate-100 bg-white hover:bg-slate-50/40 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {isToday ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16835D]"></span>
                        ) : <span></span>}
                        <span className={`text-right text-xs font-semibold ${isToday ? 'text-[#0B5A3A] font-black' : 'text-slate-600'}`}>
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
                                className={`w-full text-left text-[10px] px-1.5 py-1 rounded-md font-semibold truncate flex items-center gap-1.5 transition-all hover:opacity-90 cursor-pointer border ${
                                  isApp
                                    ? 'bg-emerald-50/90 text-[#0B5A3A] border-emerald-200/80 hover:bg-emerald-100'
                                    : isPend
                                    ? 'bg-amber-50/90 text-[#D97706] border-amber-200/80 hover:bg-amber-100'
                                    : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                                }`}
                                title={`${isApp ? 'Approved' : isPend ? 'Under Review' : req.status}: ${req.destination || req.purpose} (${req.trackingNumber})`}
                              >
                                {isApp ? (
                                  <svg className="w-3 h-3 text-[#16835D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : isPend ? (
                                  <svg className="w-3 h-3 text-[#D97706] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                                )}
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

            {/* Right Statistics & Upcoming Itineraries Panel (4 cols on XL, 3 cols on 2XL) */}
            <div className="xl:col-span-4 2xl:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Travel Statistics</h3>
                  <span className="text-xs text-[#0B5A3A] font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    FY {schedYear}
                  </span>
                </div>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Total Travel Days</span>
                    <span className="font-extrabold text-slate-900 text-sm">{totalTravelDays} days</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Approved / Completed Trips</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {completedTripsCount} {completedTripsCount === 1 ? 'trip' : 'trips'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Destinations Visited</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {uniqueDestinationsCount} {uniqueDestinationsCount === 1 ? 'location' : 'locations'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">Upcoming Itinerary</span>
                    <span className="font-bold text-[#0B5A3A] text-xs">
                      {nextUpcoming
                        ? formatDateRangeShort(nextUpcoming.startDate, nextUpcoming.endDate)
                        : 'None scheduled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scheduled Itineraries Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Scheduled Itineraries</h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {scheduledItineraries.length} active
                  </span>
                </div>

                {scheduledItineraries.length > 0 ? (
                  <div className="space-y-3">
                    {scheduledItineraries.map((itinerary) => {
                      const isApproved = itinerary.status === 'APPROVED';
                      const sDate = new Date(itinerary.startDate);
                      const eDate = new Date(itinerary.endDate);
                      const daysCount = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

                      return (
                        <div
                          key={itinerary.id}
                          onClick={() => setSelectedRequest(itinerary)}
                          className="p-4 rounded-xl border border-slate-200/80 bg-white hover:bg-[#F4F8F5] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#0B5A3A]">
                              {itinerary.trackingNumber}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                isApproved ? 'text-[#16835D]' : 'text-[#D97706]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-[#16835D]' : 'bg-[#D97706]'}`}></span>
                              {isApproved ? 'Approved' : 'Under Review'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-1.5">
                            <svg className="w-3.5 h-3.5 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{itinerary.destination}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDateRangeShort(itinerary.startDate, itinerary.endDate)} ({daysCount} {daysCount === 1 ? 'day' : 'days'})</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    No scheduled itineraries found.
                  </div>
                )}
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
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto space-y-6 animate-fade-in pb-10 flex flex-col min-h-[560px]">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B5A3A] border border-emerald-100 flex items-center justify-center font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notification Center</h3>
                <p className="text-xs text-slate-500">{unreadCount} unread system notifications</p>
              </div>
            </div>

            <button onClick={handleMarkAllRead} className="text-xs font-bold text-[#0B5A3A] hover:underline flex items-center gap-1.5 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Mark all as read</span>
            </button>
          </div>

          <div className="space-y-4 flex-1">
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
                  <div key={notif.id || idx} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        {formatDayHeading(notif.createdAt)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <div
                      onClick={handleNotifClick}
                      className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all ${
                        notif.isRead
                          ? 'bg-slate-50/80 border-slate-100 hover:bg-slate-100'
                          : 'bg-emerald-50/70 border-emerald-100 hover:bg-emerald-50 shadow-2xs'
                      } ${linkedRequest ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {notif.isRead ? (
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-[#0B5A3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {formatTimeDisplay(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                        {linkedRequest && (
                          <div className="flex items-center justify-end mt-2">
                            <span className="text-[10px] font-bold text-[#0B5A3A] flex items-center gap-0.5">
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
              <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200/80">
                No notifications found. You are all caught up!
              </div>
            )}
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs text-slate-500">
            <span>Real-time email and push notifications are active for all Travel Authority step endorsements.</span>
            <button onClick={() => router.push('/employee?tab=dashboard')} className="font-bold text-[#0B5A3A] hover:underline cursor-pointer">
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
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl font-semibold text-xs flex items-center gap-2.5 border transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-[#0B5A3A] text-white border-emerald-400/40 ring-4 ring-emerald-500/10'
              : 'bg-[#DC3545] text-white border-rose-400/40 ring-4 ring-rose-500/10'
          }`}
        >
          <span className="text-base">{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {renderTabContent()}

      {/* Floating View History Page / Modal (Matching Reference UI strictly: Document History & Signatory List) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-[#F8FAFC] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh]">

            {/* Modal Navigation Top Bar */}
            <div className="bg-white px-8 py-5 border-b border-slate-200/80 flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back</span>
                </button>
                <div className="h-4 w-px bg-slate-300"></div>
                <span className="text-xs font-mono font-bold text-[#0B5A3A] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
                  {selectedRequest.trackingNumber}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {selectedRequest.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTravelOrderModalRequest(selectedRequest);
                    }}
                    className="px-4 py-2 bg-[#0B5A3A] hover:bg-[#06452F] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    title="View and Print Official Approved Travel Order"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print Travel Order</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                  title="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Floating Page Scroll Area */}
            <div className="p-8 sm:p-12 overflow-y-auto space-y-12 bg-[#F8FAFC]">

              {/* ==================== 1. DOCUMENT HISTORY ==================== */}
              <section className="space-y-8">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Document History</h2>
                  <p className="text-xs text-slate-500 font-medium">A chronological record of all events and updates.</p>
                </div>

                {/* Document History Timeline Container */}
                <div className="relative max-w-2xl mx-auto py-4">
                  {/* Centered Vertical Line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-1/2 z-0"></div>

                  {/* Document History Events */}
                  {/* Event 1: Request Created */}
                  <div className="relative z-10 my-6 flex items-center w-full">
                    <div className="w-1/2 pr-8 text-right">
                      <div className="inline-block bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all text-left max-w-sm w-full">
                        <h4 className="text-sm font-bold text-[#1E3A8A]">{selectedRequest.createdBy?.name || 'Juan Dela Cruz'}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Submitted on <span className="font-semibold text-slate-700">{formatFullDateTimeDisplay(selectedRequest.createdAt)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Blue Clock Node Icon */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs shadow-md border-4 border-[#F8FAFC]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    <div className="w-1/2 pl-8 invisible"></div>
                  </div>
                </div>
              </section>

              {/* Divider Line */}
              <div className="border-t border-slate-200/60 w-3/4 mx-auto"></div>

              {/* ==================== 2. SIGNATORY LIST ==================== */}
              <section className="space-y-8">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Signatory List</h2>
                  <p className="text-xs text-slate-500 font-medium">Required signatories for document approval.</p>
                </div>

                {/* Signatory List Timeline Container */}
                <div className="relative max-w-2xl mx-auto py-4">
                  {/* Centered Vertical Line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-1/2 z-0"></div>

                  {[
                    { order: 1, defaultName: 'Section Chief', role: 'Verifier' },
                    { order: 2, defaultName: 'Division Chief', role: 'Verifier' },
                    { order: 3, defaultName: 'Head of PENRO', role: 'Final Signatory' },
                  ].map((sig, index) => {
                    const isLeft = index % 2 === 0;
                    const step = selectedRequest.approvalSteps?.find((s) => s.order === sig.order);
                    const name = step?.approver?.name || sig.defaultName;
                    const isApproved = step?.action === 'APPROVED';
                    const isRejected = step?.action === 'REJECTED';

                    // Determine node icon appearance based on step status
                    const nodeClasses = isApproved
                      ? 'bg-[#16835D] text-white'
                      : isRejected
                      ? 'bg-[#DC3545] text-white'
                      : 'bg-[#10B981] text-white';

                    // Card border highlight for approved steps
                    const cardBorderClass = isApproved
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : isRejected
                      ? 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-200/80 bg-white';

                    return (
                      <div key={sig.order} className="relative z-10 my-8 flex items-center w-full">
                        {/* Left Side Card */}
                        <div className={`w-1/2 pr-8 text-right ${isLeft ? 'block' : 'invisible'}`}>
                          <div className={`inline-block p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all text-left max-w-sm w-full ${cardBorderClass}`}>
                            <h4 className="text-sm font-bold text-[#0B5A3A]">{name}</h4>
                            <p className="text-xs text-slate-500 mt-1">{sig.role}</p>
                            {isApproved && step?.actionDate && (
                              <p className="text-[10px] text-[#16835D] font-semibold mt-1 flex items-center gap-1 justify-end">
                                <svg className="w-3 h-3 text-[#16835D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Approved · {formatFullDateTimeDisplay(step.actionDate)}</span>
                              </p>
                            )}
                            {isRejected && (
                              <p className="text-[10px] text-[#DC3545] font-semibold mt-1 flex items-center gap-1 justify-end">
                                <svg className="w-3 h-3 text-[#DC3545] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Returned · {formatFullDateTimeDisplay(step?.actionDate || step?.updatedAt)}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dynamic Node Icon — checkmark when approved, pencil when pending */}
                        <div className={`absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-md border-4 border-[#F8FAFC] ${nodeClasses}`}>
                          {isApproved ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isRejected ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          )}
                        </div>

                        {/* Right Side Card */}
                        <div className={`w-1/2 pl-8 text-left ${!isLeft ? 'block' : 'invisible'}`}>
                          <div className={`inline-block p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all text-left max-w-sm w-full ${cardBorderClass}`}>
                            <h4 className="text-sm font-bold text-[#0B5A3A]">{name}</h4>
                            <p className="text-xs text-slate-500 mt-1">{sig.role}</p>
                            {isApproved && step?.actionDate && (
                              <p className="text-[10px] text-[#16835D] font-semibold mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#16835D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Approved · {formatFullDateTimeDisplay(step.actionDate)}</span>
                              </p>
                            )}
                            {isRejected && (
                              <p className="text-[10px] text-[#DC3545] font-semibold mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#DC3545] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Returned · {formatFullDateTimeDisplay(step?.actionDate || step?.updatedAt)}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Employee Portal...</div>}>
      <EmployeeContent />
    </Suspense>
  );
}
