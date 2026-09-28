'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { exportApprovalHistoryToCSV, printApprovalHistoryReport } from '@/utils/export';

function StaffDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const { data: session } = useSession();
  const user = session?.user as any;
  const userRole = user?.role || 'SECTION_CHIEF';

  const [requests, setRequests] = useState<TARequestDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Review View State
  const [reviewRequest, setReviewRequest] = useState<TARequestDTO | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);

  // Automatically reverse-geocode coordinates to show complete, exact address
  useEffect(() => {
    if (!reviewRequest) {
      setResolvedAddress('');
      return;
    }

    setResolvedAddress(reviewRequest.destination || '');

    if (reviewRequest.destinationLat && reviewRequest.destinationLng) {
      let isMounted = true;
      setIsResolvingAddress(true);

      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${reviewRequest.destinationLat}&lon=${reviewRequest.destinationLng}`,
        { headers: { 'User-Agent': 'TAPS-App' } }
      )
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          const formatted = formatNominatimAddress(data);
          if (formatted) {
            setResolvedAddress(formatted);
          }
        })
        .catch((err) => {
          console.error('Failed to resolve full destination address:', err);
        })
        .finally(() => {
          if (isMounted) setIsResolvingAddress(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [reviewRequest?.id, reviewRequest?.destinationLat, reviewRequest?.destinationLng, reviewRequest?.destination]);

  // Reset active review/modal view whenever sidebar tab changes or reset event occurs
  useEffect(() => {
    setReviewRequest(null);
    setShowApproveModal(false);
    setShowHistoryModal(false);
  }, [currentTab]);

  useEffect(() => {
    const handleResetViews = () => {
      setReviewRequest(null);
      setShowApproveModal(false);
      setShowHistoryModal(false);
    };
    window.addEventListener('taps:reset-views', handleResetViews);
    return () => window.removeEventListener('taps:reset-views', handleResetViews);
  }, []);

  // Selection & Search State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Modals & Signature State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [hasDigitalSignature, setHasDigitalSignature] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ta-requests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setRequests(data.data);
        } else {
          setRequests([]);
        }
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchNotifications();
    // Reduced from 15s to 60s — Supabase Realtime handles instant delivery via layout hook,
    // this is now a safety-net fallback only
    const interval = setInterval(fetchNotifications, 60000);

    // Listen for realtime push-based notification refresh events
    const handleRealtimeRefresh = () => {
      fetchNotifications();
      fetchRequests(); // Also refresh pending requests when a new notification arrives
    };
    window.addEventListener('taps:refresh-notifications', handleRealtimeRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('taps:refresh-notifications', handleRealtimeRefresh);
    };
  }, []);



  /**
   * renderStatusBadge — role-aware badge so each verifier sees the correct
   * label for a request's current position in the chain.
   *
   * e.g. A Section Chief viewing a PENDING_DIVISION_CHIEF request should see
   * "Endorsed" (they already passed it), NOT a generic "PENDING".
   */
  const renderStatusBadge = (status: string, role: string = userRole) => {
    // Fully terminal statuses are the same for everyone
    if (status === 'APPROVED')
      return (
        <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block uppercase tracking-wider">
          APPROVED
        </span>
      );
    if (status === 'REJECTED_MANUAL' || status === 'DISAPPROVED')
      return (
        <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-block uppercase tracking-wider">
          RETURNED
        </span>
      );
    if (status === 'REJECTED_OVERDUE')
      return (
        <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-block uppercase tracking-wider">
          OVERDUE
        </span>
      );
    if (status === 'DRAFT')
      return (
        <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-purple-100 text-purple-800 border border-purple-200 inline-block uppercase tracking-wider">
          DRAFT
        </span>
      );

    // Role-aware labels for requests still in the pipeline
    // Determine if this verifier's step is already done (status is further in chain)
    const stepOrder: Record<string, number> = {
      PENDING_SECTION_CHIEF: 1,
      PENDING_DIVISION_CHIEF: 2,
      PENDING_HEAD_PENRO: 3,
    };
    const roleStep: Record<string, number> = {
      SECTION_CHIEF: 1,
      DIVISION_CHIEF: 2,
      HEAD_PENRO: 3,
    };
    const currentStep = stepOrder[status] ?? 0;
    const myStep = roleStep[role] ?? 0;

    if (myStep > 0 && currentStep > myStep) {
      // This verifier already endorsed — request passed their step
      return (
        <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-sky-100 text-sky-800 border border-sky-200 inline-block uppercase tracking-wider">
          ENDORSED
        </span>
      );
    }
    if (myStep > 0 && currentStep === myStep) {
      // Request is currently sitting at this verifier's step
      return (
        <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-block uppercase tracking-wider">
          FOR REVIEW
        </span>
      );
    }
    // Fallback — steps before this verifier (should rarely appear in their history)
    return (
      <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-slate-100 text-slate-600 border border-slate-200 inline-block uppercase tracking-wider">
        IN PROGRESS
      </span>
    );
  };

  const handleAction = async (action: 'APPROVED' | 'REJECTED') => {
    if (!reviewRequest) return;
    setActionLoading(true);
    setActionError('');

    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: reviewRequest.id,
          action,
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Failed to process approval action.');
        setActionLoading(false);
        return;
      }

      setShowApproveModal(false);
      const reqRef = reviewRequest;
      setReviewRequest(null);
      setRemarks('');
      setHasDigitalSignature(false);
      fetchRequests();
      fetchNotifications();

      if (typeof window !== 'undefined') {
        const actionTitle = action === 'APPROVED' ? 'Travel Endorsement Approved' : 'Travel Request Returned';
        const actionMsg = action === 'APPROVED'
          ? `TA Request ${reqRef.trackingNumber || ''} has been endorsed and forwarded to the next signatory.`
          : `TA Request ${reqRef.trackingNumber || ''} has been returned with your remarks.`;

        window.dispatchEvent(
          new CustomEvent('taps:new-notification', {
            detail: {
              id: `notif-${Date.now()}`,
              title: actionTitle,
              message: actionMsg,
              createdAt: new Date().toISOString(),
              requestId: reqRef.id,
              isRead: false,
            },
          })
        );
        window.dispatchEvent(new CustomEvent('taps:refresh-notifications'));
      }
    } catch (err: any) {
      setActionError(err.message || 'An error occurred during submission.');
    } finally {
      setActionLoading(false);
    }
  };

  const displayList = requests;

  const filteredRequests = displayList.filter((r) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      r.trackingNumber?.toLowerCase().includes(query) ||
      r.createdBy?.name?.toLowerCase().includes(query) ||
      r.destination?.toLowerCase().includes(query) ||
      r.purpose?.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PENDING'
        ? r.status.startsWith('PENDING')
        : r.status === statusFilter;

    let matchesDateRange = true;
    if (startDateFilter) {
      const start = new Date(startDateFilter).getTime();
      const filedDate = new Date(r.createdAt).getTime();
      if (filedDate < start) matchesDateRange = false;
    }
    if (endDateFilter) {
      const end = new Date(endDateFilter);
      end.setHours(23, 59, 59, 999);
      const filedDate = new Date(r.createdAt).getTime();
      if (filedDate > end.getTime()) matchesDateRange = false;
    }

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Role-based pending queue: Only show requests that currently require THIS verifier role's action
  const pendingRequests = displayList.filter((r) => {
    const pendingStatusForRole: Record<string, string> = {
      SECTION_CHIEF: 'PENDING_SECTION_CHIEF',
      DIVISION_CHIEF: 'PENDING_DIVISION_CHIEF',
      HEAD_PENRO: 'PENDING_HEAD_PENRO',
    };
    const myPendingStatus = pendingStatusForRole[userRole];

    const stepRoleMap: Record<string, number> = {
      SECTION_CHIEF: 1,
      DIVISION_CHIEF: 2,
      HEAD_PENRO: 3,
    };
    const myRoleOrder = stepRoleMap[userRole] ?? 0;
    const myStepObj = r.approvalSteps?.find((s: any) => s.order === myRoleOrder);
    const prevStepsApproved = (r.approvalSteps || [])
      .filter((s: any) => s.order < myRoleOrder)
      .every((s: any) => s.action === 'APPROVED');

    return (
      r.status === myPendingStatus ||
      (myStepObj?.action === 'PENDING' && (myRoleOrder === 1 || prevStepsApproved) && r.status !== 'REJECTED_MANUAL' && r.status !== 'REJECTED_OVERDUE' && r.status !== 'APPROVED')
    );
  });

  const approvedCount = displayList.filter((r) => r.status === 'APPROVED').length;
  const pendingCount = pendingRequests.length;
  const ongoingCount = displayList.filter((r) => r.status === 'DRAFT').length;

  /* -------------------------------------------------------------------------- */
  /* REVIEW TA REQUEST DETAIL VIEW (Strictly Matching PDF Pages 4, 5 & 6)       */
  /* -------------------------------------------------------------------------- */
  if (reviewRequest) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setReviewRequest(null)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              ← Back
            </button>
            <div>
              <h2 className="text-lg font-black text-slate-900">Review TA Request</h2>
              <p className="text-xs font-semibold text-slate-500">
                {reviewRequest.trackingNumber} • Submitted on {formatDateDisplay(reviewRequest.createdAt)}
              </p>
            </div>
          </div>
          <div>{renderStatusBadge(reviewRequest.status)}</div>
        </div>

        {actionError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
            {actionError}
          </div>
        )}

        {/* 2-Column Main Review Layout (2/3 + 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Request Details Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">Request Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    EMPLOYEE NAME
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {reviewRequest.createdBy?.name || 'Maria Santos'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    DESTINATION
                  </span>
                  <p className="font-bold text-slate-800 flex items-start gap-1.5">
                    <svg className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="leading-snug">{resolvedAddress || reviewRequest.destination}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    POSITION & DIVISION
                  </span>
                  <p className="font-bold text-slate-800">
                    Environmental Management Specialist II
                  </p>
                  <p className="text-[11px] text-slate-500">{reviewRequest.createdBy?.section || 'Conservation and Development'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    TRAVEL DATES
                  </span>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDateDisplay(reviewRequest.startDate)} - {formatDateDisplay(reviewRequest.endDate)}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  PURPOSE OF TRAVEL
                </span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-700 font-medium leading-relaxed">
                  {reviewRequest.purpose}
                </div>
              </div>
            </div>

            {/* 2. Destination Map Card (Matching PDF Page 6) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">Destination Map</h3>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 relative">
                <DynamicMapPicker
                  initialLat={reviewRequest.destinationLat || 7.0097}
                  initialLng={reviewRequest.destinationLng || 125.2708}
                  onLocationSelect={() => {}}
                  readOnly={true}
                  locationName={resolvedAddress || reviewRequest.destination}
                />
                <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200/90 shadow-md text-xs z-10 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-800 shrink-0"></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Specific Location Address
                    </span>
                    {isResolvingAddress && (
                      <span className="text-[10px] text-slate-400 font-medium animate-pulse">Resolving...</span>
                    )}
                  </div>
                  <p className="font-extrabold text-slate-900 text-xs leading-snug">
                    {resolvedAddress || reviewRequest.destination}
                  </p>
                  {reviewRequest.destinationLat && reviewRequest.destinationLng && (
                    <p className="text-[10px] font-mono text-slate-500">
                      Coordinates: {reviewRequest.destinationLat.toFixed(5)}° N, {reviewRequest.destinationLng.toFixed(5)}° E
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Attachments Card — Outlier Premium Design */}
            {(() => {
              const attachments: { name: string; type: string; size: string; color: 'rose' | 'blue' | 'violet'; icon: 'doc' | 'mail' }[] = (reviewRequest as any).attachments || [];
              const hasFiles = attachments.length > 0;
              return (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.373L8.557 18.315a1.5 1.5 0 11-2.122-2.122l7.694-7.694" />
                        </svg>
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900">Attachments</h3>
                    </div>
                    {hasFiles && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200/80">
                        {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                      </span>
                    )}
                  </div>

                  {hasFiles ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachments.map((file, idx) => {
                        const gradients: Record<string, string> = {
                          rose: 'from-rose-400 to-orange-500',
                          blue: 'from-blue-400 to-indigo-600',
                          violet: 'from-violet-400 to-purple-600',
                        };
                        const badgeColors: Record<string, string> = {
                          rose: 'bg-rose-100 text-rose-600',
                          blue: 'bg-blue-100 text-blue-600',
                          violet: 'bg-violet-100 text-violet-600',
                        };
                        return (
                          <div key={idx} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/0 to-violet-100/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative p-4 flex items-center gap-3.5">
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[file.color] || gradients.rose} flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                                {file.icon === 'mail' ? (
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                ) : (
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-extrabold text-slate-900 truncate">{file.name}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{file.type}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColors[file.color] || badgeColors.rose}`}>PDF</span>
                                  <span className="text-[9px] text-slate-400 font-medium">{file.size}</span>
                                </div>
                              </div>
                              <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-violet-600 flex items-center justify-center shrink-0 transition-colors duration-300">
                                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">No files attached</p>
                        <p className="text-[10px] text-slate-300 mt-0.5">The employee did not attach any files to this request.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right Column (1/3 width): Action Box + Timeline */}
          <div className="space-y-6">
            {/* Determine if the logged-in verifier still needs to act on this request */}
            {(() => {
              const pendingStatusForRole: Record<string, string> = {
                SECTION_CHIEF: 'PENDING_SECTION_CHIEF',
                DIVISION_CHIEF: 'PENDING_DIVISION_CHIEF',
                HEAD_PENRO: 'PENDING_HEAD_PENRO',
              };
              const myPendingStatus = pendingStatusForRole[userRole];

              const stepRoleMap: Record<string, number> = {
                SECTION_CHIEF: 1,
                DIVISION_CHIEF: 2,
                HEAD_PENRO: 3,
              };
              const myRoleOrder = stepRoleMap[userRole] ?? 0;
              const myStepObj = reviewRequest.approvalSteps?.find((s: any) => s.order === myRoleOrder);
              const prevStepsApproved = (reviewRequest.approvalSteps || [])
                .filter((s: any) => s.order < myRoleOrder)
                .every((s: any) => s.action === 'APPROVED');

              const requiresMyAction =
                reviewRequest.status === myPendingStatus ||
                (myStepObj?.action === 'PENDING' && (myRoleOrder === 1 || prevStepsApproved) && reviewRequest.status !== 'REJECTED_MANUAL' && reviewRequest.status !== 'REJECTED_OVERDUE' && reviewRequest.status !== 'APPROVED');

              if (requiresMyAction) {
                // ── ACTIVE ACTION PANEL ──────────────────────────────────
                return (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                    <div className="bg-[#0F4C2E] text-white p-4 font-bold text-xs uppercase tracking-wider">
                      Your Action Required
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Digital Signature Container */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          DIGITAL SIGNATURE
                        </label>
                        <div
                          onClick={() => setHasDigitalSignature(!hasDigitalSignature)}
                          className={`h-28 rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                            hasDigitalSignature
                              ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800'
                              : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-emerald-500 hover:bg-emerald-50/30'
                          }`}
                        >
                          {hasDigitalSignature ? (
                            <div className="space-y-1">
                              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-xs">
                                ✓
                              </div>
                              <p className="text-xs font-extrabold text-emerald-900">Digital Signature Affixed</p>
                              <p className="text-[10px] text-emerald-700 font-mono">{user?.name || userRole}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <svg className="w-6 h-6 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <p className="text-xs font-bold text-slate-600">Click to sign as Verifier</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Remarks Field */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          REMARKS (OPTIONAL)
                        </label>
                        <textarea
                          rows={3}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Add comments or instructions..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleAction('REJECTED')}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 text-xs font-bold transition-all shadow-2xs"
                        >
                          Return
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowApproveModal(true)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 rounded-xl bg-[#0F4C2E] hover:bg-[#165E3A] text-white text-xs font-bold shadow-md transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── READ-ONLY: Already processed (or not yet at this step) ─
              const myStep = reviewRequest.approvalSteps?.find((s: any) => {
                const stepRoleMap: Record<string, number> = {
                  SECTION_CHIEF: 1,
                  DIVISION_CHIEF: 2,
                  HEAD_PENRO: 3,
                };
                return s.order === stepRoleMap[userRole];
              });

              const isProcessed = myStep && myStep.action !== 'PENDING';
              const stepOrder: Record<string, number> = {
                PENDING_SECTION_CHIEF: 1,
                PENDING_DIVISION_CHIEF: 2,
                PENDING_HEAD_PENRO: 3,
              };
              const roleStep: Record<string, number> = {
                SECTION_CHIEF: 1,
                DIVISION_CHIEF: 2,
                HEAD_PENRO: 3,
              };
              const currentStep = stepOrder[reviewRequest.status] ?? 99;
              const myStepNum = roleStep[userRole] ?? 0;
              const isUpcoming = myStepNum > 0 && currentStep < myStepNum;

              return (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                  <div className={`p-4 font-bold text-xs uppercase tracking-wider ${
                    isProcessed
                      ? 'bg-emerald-700 text-white'
                      : isUpcoming
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isProcessed ? '✓ You Have Already Processed This' : 'Awaiting Earlier Step'}
                  </div>
                  <div className="p-5 space-y-3">
                    {isProcessed && myStep ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                            ✓
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">
                              {myStep.action === 'APPROVED' ? 'Endorsed' : 'Returned'}
                            </p>
                            <p className="text-[10px] text-slate-500">{formatDateDisplay(myStep.actionDate)}</p>
                          </div>
                        </div>
                        {myStep.remarks && (
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Your Remarks</p>
                            <p className="text-xs text-slate-700">{myStep.remarks}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 pt-1">
                          No further action needed from you on this request.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">
                        This request has not yet reached your review step. You will be notified when it requires your action.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Dynamic Real-time Approval Timeline */}
            <ApprovalTrail
              status={reviewRequest.status}
              approvalSteps={reviewRequest.approvalSteps}
            />
          </div>
        </div>

        {/* Approve Confirmation Modal (Strictly Matching PDF Page 7) */}
        {showApproveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-[#0F4C2E] text-white p-4 font-bold text-sm flex items-center gap-2.5">
                <svg className="w-5 h-5 text-emerald-200 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Approve Confirmation</span>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-700">
                  Are you sure you want to approve this travel request for{' '}
                  <strong className="text-slate-900 font-extrabold">
                    {reviewRequest.createdBy?.name || 'Maria Santos'}
                  </strong>
                  ?
                </p>

                {/* Legal Consent Callout */}
                <div className="p-4 bg-sky-50 border border-sky-200/80 rounded-xl space-y-1">
                  <p className="text-[11px] text-sky-900 font-semibold leading-relaxed">
                    <strong className="font-extrabold text-sky-950">Notice:</strong> By clicking 'Affix Signature,' you hereby affirm your explicit intention to authenticate and approve this electronic document and the transaction it embodies. This action serves as your legal consent and is equivalent to a physical handwritten signature.
                  </p>
                </div>

                <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowApproveModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('APPROVED')}
                    className="px-6 py-2.5 rounded-xl bg-[#0F4C2E] hover:bg-[#165E3A] text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all"
                  >
                    {actionLoading ? 'Affixing Signature...' : 'Affix Signature'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document History Modal (Strictly Matching PDF Page 8) */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Document History</h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6 relative pl-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Event 1: Document Submitted */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Document Filed & Submitted</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Applicant: <span className="font-semibold text-slate-800">{reviewRequest.createdBy?.name || 'Juan Dela Cruz'}</span></p>
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
                      {formatFullDateTimeDisplay(reviewRequest.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Dynamic Signatory Steps */}
                {[
                  { order: 1, defaultTitle: 'Section Chief Verification', defaultRole: 'Section Chief' },
                  { order: 2, defaultTitle: 'Division Chief Review & Endorsement', defaultRole: 'Division Chief' },
                  { order: 3, defaultTitle: 'Head of PENRO Final Approval', defaultRole: 'Head of PENRO' },
                ].map((stepDef) => {
                  const step = reviewRequest.approvalSteps?.find((s) => s.order === stepDef.order);
                  const isApproved = step?.action === 'APPROVED';
                  const isRejected = step?.action === 'REJECTED';
                  const approverName = step?.approver?.name || stepDef.defaultRole;

                  return (
                    <div key={stepDef.order} className="relative flex items-start gap-3">
                      <div
                        className={`absolute -left-6 top-0 w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${
                          isApproved
                            ? 'bg-emerald-600 text-white'
                            : isRejected
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isApproved ? '✓' : isRejected ? '✕' : stepDef.order + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{stepDef.defaultTitle}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Signatory: <span className="font-semibold text-slate-800">{approverName}</span>
                        </p>
                        {isApproved && (
                          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">
                            ✓ Approved · {formatFullDateTimeDisplay(step?.actionDate || step?.updatedAt)}
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[10px] text-rose-700 mt-0.5 block font-semibold">
                            ✕ Returned / Rejected · {formatFullDateTimeDisplay(step?.actionDate || step?.updatedAt)}
                          </span>
                        )}
                        {!isApproved && !isRejected && (
                          <span className="text-[10px] text-amber-700 mt-0.5 inline-flex items-center gap-1 font-medium">
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Awaiting Action</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* TAB 1: DASHBOARD VIEW (Strictly Matching PDF Page 1)                       */
  /* -------------------------------------------------------------------------- */
  if (currentTab === 'dashboard') {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in">
        {/* 4 Stat Cards Row (Matching PDF Page 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Stat 1: Total */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{displayList.length}</h3>
            </div>
          </div>

          {/* Stat 2: Approved */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{approvedCount}</h3>
            </div>
          </div>

          {/* Stat 3: Pending */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{pendingCount}</h3>
            </div>
          </div>

          {/* Stat 4: Ongoing */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ongoing</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{ongoingCount}</h3>
            </div>
          </div>
        </div>

        {/* 2-Column Grid (2/3 + 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2/3): Recent Approval Activity Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900">Recent Approval Activity</h3>
              <button
                onClick={() => router.push('/staff?tab=pending')}
                className="text-xs font-bold text-[#0F4C2E] hover:underline"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">PERSONNEL</th>
                    <th className="pb-3">DESTINATION & PURPOSE</th>
                    <th className="pb-3">TRAVEL DATES</th>
                    <th className="pb-3">DATE FILED</th>
                    <th className="pb-3">STATUS</th>
                    <th className="pb-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayList.map((req, idx) => (
                    <tr key={req.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 font-bold text-slate-900">
                        {req.createdBy?.name || 'Maria Santos'}
                      </td>
                      <td className="py-4 max-w-xs">
                        <p className="font-bold text-slate-800 truncate">{req.destination}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{req.purpose}</p>
                      </td>
                      <td className="py-4 text-slate-600 font-medium">
                        {formatDateRangeShort(req.startDate, req.endDate)}
                      </td>
                      <td className="py-4 text-slate-400 font-medium">{formatDateDisplay(req.createdAt)}</td>
                      <td className="py-4">{renderStatusBadge(req.status)}</td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => setReviewRequest(req)}
                          className="text-xs font-bold text-[#0F4C2E] hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column (1/3): Approval Workflow SOP Card (Matching PDF Page 1) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-[#1B4332] text-white p-5">
                <h3 className="text-sm font-extrabold">Approval Workflow</h3>
                <p className="text-[11px] text-emerald-200 mt-0.5">Standard operating procedure</p>
              </div>

              <div className="p-6">
                <div className="relative">
                  {[
                    {
                      step: 'Step 1 – Employee',
                      description: 'Submits Travel Authority request with attachments.',
                    },
                    {
                      step: 'Step 2 – Verifier',
                      description: 'First review of purpose and itinerary.',
                    },
                    {
                      step: 'Step 3 – Verifier',
                      description: 'Second review and endorsement.',
                    },
                    {
                      step: 'Step 4 – Approver',
                      description: 'Final approval and digital signature.',
                    },
                  ].map((item, idx, arr) => (
                    <div key={idx} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      {/* Single vertical line connecting nodes from Step 1 through Step 4 */}
                      {idx < arr.length - 1 && (
                        <div
                          className="absolute left-[7px] top-2.5 h-full w-[2px] bg-slate-200"
                          aria-hidden="true"
                        />
                      )}

                      {/* Small, minimal circular node positioned directly on the timeline */}
                      <div className="relative z-10 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="w-4 h-4 rounded-full border-2 border-[#1B4332] bg-white ring-4 ring-white flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#1B4332]" />
                        </div>
                      </div>

                      {/* Step Title & Description to the right */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <h4 className="font-extrabold text-slate-900 text-xs tracking-tight">
                          {item.step}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* TAB 2: PENDING APPROVALS VIEW (Strictly Matching PDF Page 2)               */
  /* -------------------------------------------------------------------------- */
  if (currentTab === 'pending') {
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedIds(pendingRequests.map((r) => r.id));
      } else {
        setSelectedIds([]);
      }
    };

    const handleToggleSelect = (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    };

    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Pending Approvals</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Requests requiring your immediate action ({pendingRequests.length})
            </p>
          </div>

          {/* Search & Filter Header Bar */}
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <input
                type="text"
                placeholder="Search Personnel, ID, Dest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-4 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={pendingRequests.length > 0 && selectedIds.length === pendingRequests.length}
                      className="rounded border-slate-300 text-[#0F4C2E] focus:ring-[#0F4C2E]"
                    />
                  </th>
                  <th className="py-4 px-4">PERSONNEL</th>
                  <th className="py-4 px-4">DESTINATION</th>
                  <th className="py-4 px-4 max-w-xs">PURPOSE</th>
                  <th className="py-4 px-4">TRAVEL DATES</th>
                  <th className="py-4 px-4">DATE FILED</th>
                  <th className="py-4 px-4">STATUS</th>
                  <th className="py-4 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((req, idx) => {
                    const isSelected = selectedIds.includes(req.id);

                    return (
                      <tr key={req.id || idx} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(req.id)}
                            className="rounded border-slate-300 text-[#0F4C2E] focus:ring-[#0F4C2E]"
                          />
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">
                          <div>{req.createdBy?.name || 'Maria Santos'}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID-2021-045</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800">{req.destination}</td>
                        <td className="py-4 px-4 text-slate-600 max-w-xs leading-relaxed">{req.purpose}</td>
                        <td className="py-4 px-4 text-slate-600 font-medium">
                          {formatDateRangeShort(req.startDate, req.endDate)}
                        </td>
                        <td className="py-4 px-4 text-slate-400 font-medium">{formatDateDisplay(req.createdAt)}</td>
                        <td className="py-4 px-4">{renderStatusBadge(req.status)}</td>
                        <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setReviewRequest(req);
                              setShowApproveModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => {
                              setReviewRequest(req);
                              handleAction('REJECTED');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                          >
                            Disapprove
                          </button>

                          <button
                            onClick={() => setReviewRequest(req)}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition-colors shadow-2xs inline-flex items-center gap-1"
                          >
                            <span>📄</span>
                            <span>View Docs</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                      No pending requests requiring your action.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Selection Action Bar (Matching PDF Page 2) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <span className="text-xs font-bold text-slate-500">
            {selectedIds.length} request(s) selected
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert('Printing selected requests...')}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>

            <button
              onClick={() => {
                if (selectedIds.length === 0) return alert('Select at least 1 request to approve.');
                alert(`Approved ${selectedIds.length} request(s) successfully!`);
              }}
              className="px-5 py-2 bg-[#81B29A] hover:bg-[#689F86] text-white rounded-xl text-xs font-extrabold shadow-md transition-all"
            >
              Approve Selected
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* TAB 3: APPROVAL HISTORY VIEW (Strictly Matching PDF Page 3)                */
  /* -------------------------------------------------------------------------- */
  if (currentTab === 'history') {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Approval History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Archive of all processed travel authority requests ({filteredRequests.length} record{filteredRequests.length === 1 ? '' : 's'})
            </p>
          </div>

          {/* Export Report Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs self-start sm:self-auto transition-all cursor-pointer"
            >
              <span>📥</span>
              <span>Export Report</span>
              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-fade-in space-y-1">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      exportApprovalHistoryToCSV(filteredRequests, userRole);
                    }}
                    className="w-full px-3 py-2.5 text-left text-xs rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-[#0F4C2E] flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <span className="text-lg">📊</span>
                    <div>
                      <div className="font-bold text-slate-800">Export to CSV / Excel</div>
                      <div className="text-[10px] text-slate-400">Download spreadsheet (.csv)</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      printApprovalHistoryReport({
                        requests: filteredRequests,
                        userRole,
                        userName: user?.name || 'Authorized Official',
                        userPosition:
                          user?.position ||
                          (userRole === 'DIVISION_CHIEF'
                            ? 'Chief, Technical Services Division'
                            : userRole === 'SECTION_CHIEF'
                            ? 'Section Chief'
                            : 'Head of PENRO'),
                        statusFilter,
                        searchQuery,
                      });
                    }}
                    className="w-full px-3 py-2.5 text-left text-xs rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-[#0F4C2E] flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <span className="text-lg">🖨️</span>
                    <div>
                      <div className="font-bold text-slate-800">Print / Save as PDF</div>
                      <div className="text-[10px] text-slate-400">Official government summary report</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filter Bar matching PDF Page 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search by Employee Name or TA Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F4C2E]"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED_MANUAL">Disapproved</option>
              <option value="DRAFT">Ongoing</option>
            </select>

            <button
              onClick={() => setShowDateRangeModal(true)}
              className={`px-4 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                startDateFilter || endDateFilter
                  ? 'bg-emerald-50 border-emerald-300 text-[#0F4C2E] font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>📅</span>
              <span>
                {startDateFilter || endDateFilter
                  ? `${startDateFilter ? formatDateDisplay(startDateFilter) : 'Start'} – ${endDateFilter ? formatDateDisplay(endDateFilter) : 'Now'}`
                  : 'Date Range'}
              </span>
              {(startDateFilter || endDateFilter) && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setStartDateFilter('');
                    setEndDateFilter('');
                  }}
                  className="ml-1 text-slate-400 hover:text-rose-600 font-bold"
                  title="Clear Date Range"
                >
                  ✕
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Date Range Modal */}
        {showDateRangeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📅</span> Filter by Filing Date Range
                </h3>
                <button
                  onClick={() => setShowDateRangeModal(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0F4C2E]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Quick Presets</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setStartDateFilter(today);
                        setEndDateFilter(today);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 7);
                        setStartDateFilter(d.toISOString().split('T')[0]);
                        setEndDateFilter(new Date().toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 30);
                        setStartDateFilter(d.toISOString().split('T')[0]);
                        setEndDateFilter(new Date().toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDateFilter('');
                        setEndDateFilter('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStartDateFilter('');
                    setEndDateFilter('');
                    setShowDateRangeModal(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={() => setShowDateRangeModal(false)}
                  className="px-5 py-2 bg-[#0F4C2E] hover:bg-[#0B3A23] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-4 px-6">TA NUMBER</th>
                  <th className="py-4 px-6">PERSONNEL</th>
                  <th className="py-4 px-6">DESTINATION</th>
                  <th className="py-4 px-6 max-w-xs">PURPOSE</th>
                  <th className="py-4 px-6">TRAVEL DATES</th>
                  <th className="py-4 px-6">DATE FILED</th>
                  <th className="py-4 px-6">STATUS</th>
                  <th className="py-4 px-6">ACTION DATE</th>
                  <th className="py-4 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req, idx) => (
                    <tr key={req.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-[#0F4C2E]">{req.trackingNumber}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <div>{req.createdBy?.name || 'Maria Santos'}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{req.createdBy?.section || 'Conservation and Develop...'}</div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800">{req.destination}</td>
                      <td className="py-4 px-6 text-slate-600 max-w-xs truncate">{req.purpose}</td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {formatDateRangeShort(req.startDate, req.endDate)}
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-medium">{formatDateDisplay(req.createdAt)}</td>
                      <td className="py-4 px-6">{renderStatusBadge(req.status)}</td>
                      <td className="py-4 px-6 text-slate-400">
                        {(() => {
                          const stepRoleMap: Record<string, number> = {
                            SECTION_CHIEF: 1,
                            DIVISION_CHIEF: 2,
                            HEAD_PENRO: 3,
                          };
                          const myStepNum = stepRoleMap[userRole];
                          const myStep = req.approvalSteps?.find((s: any) => s.order === myStepNum);
                          if (myStep?.actionDate && myStep?.action !== 'PENDING') {
                            return formatDateDisplay(myStep.actionDate);
                          }
                          if (req.status === 'APPROVED') return formatDateDisplay(req.updatedAt || req.createdAt);
                          return '-';
                        })()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setReviewRequest(req)}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      No travel authority records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* TAB 4: NOTIFICATIONS CENTER FOR STAFF / SIGNATORIES                       */
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
              <h3 className="text-sm font-bold text-slate-900">Signatory Notification Center</h3>
              <p className="text-xs text-slate-500">{unreadCount} unread system notification{unreadCount === 1 ? '' : 's'}</p>
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
              // Find the linked TA request (if any) so we can navigate to it on click
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
                // 2. Open TA request review detail
                if (linkedRequest) {
                  setReviewRequest(linkedRequest);
                } else if (notif.requestId) {
                  try {
                    const res = await fetch('/api/ta-requests');
                    if (res.ok) {
                      const data = await res.json();
                      if (data.success && Array.isArray(data.data)) {
                        setRequests(data.data);
                        const fresh = data.data.find((r: any) => r.id === notif.requestId);
                        if (fresh) setReviewRequest(fresh);
                      }
                    }
                  } catch (e) {
                    console.error('Error fetching target request', e);
                  }
                }
              };

              return (
                <div key={notif.id || idx} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
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
                        ? 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                        : 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50'
                    } ${linkedRequest || notif.requestId ? 'cursor-pointer' : 'cursor-default'}`}
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
                      {(linkedRequest || notif.requestId) && (
                        <div className="flex items-center justify-end mt-2">
                          <span className="text-[10px] font-bold text-[#0B5A3A] flex items-center gap-0.5">
                            Review Request →
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
          <span>Real-time email and push notifications are active for all signatory step endorsements.</span>
          <button onClick={() => router.push('/staff?tab=dashboard')} className="font-bold text-[#0B5A3A] hover:underline cursor-pointer">
            Back to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function StaffSignatoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Signatory Portal...</div>}>
      <StaffDashboardContent />
    </Suspense>
  );
}
