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
import { getDivisionForSection } from '@/lib/constants/organization';

function StaffDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const { data: session } = useSession();
  const user = session?.user as any;
  const userRole = user?.role || 'SECTION_CHIEF';
  const userSection = user?.section || '';
  const userDivision = user?.division || '';

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
  const [showRejectModal, setShowRejectModal] = useState(false);
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
    const interval = setInterval(() => {
      fetchNotifications();
      fetchRequests();
    }, 15000);

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
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
          APPROVED
        </span>
      );
    if (status === 'REJECTED_MANUAL' || status === 'DISAPPROVED')
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
          RETURNED
        </span>
      );
    if (status === 'REJECTED_OVERDUE')
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
          OVERDUE
        </span>
      );
    if (status === 'DRAFT')
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
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
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
          ENDORSED
        </span>
      );
    }
    if (myStep > 0 && currentStep === myStep) {
      // Request is currently sitting at this verifier's step
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          FOR REVIEW
        </span>
      );
    }
    if (role === 'ADMIN') {
      const stepLabels: Record<string, string> = {
        PENDING_SECTION_CHIEF: 'SECTION CHIEF REVIEW',
        PENDING_DIVISION_CHIEF: 'DIVISION CHIEF REVIEW',
        PENDING_HEAD_PENRO: 'HEAD OF PENRO REVIEW',
      };
      return (
        <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          {stepLabels[status] || status}
        </span>
      );
    }
    // Fallback — steps before this verifier (should rarely appear in their history)
    return (
      <span className="h-5 inline-flex items-center justify-center gap-1.5 px-2 text-[10px] font-semibold rounded-[4px] bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
        IN PROGRESS
      </span>
    );
  };

  const handleAction = async (action: 'APPROVED' | 'REJECTED', targetRequest?: TARequestDTO, customRemarks?: string) => {
    const target = targetRequest || reviewRequest;
    if (!target) return;

    const finalRemarks = (customRemarks !== undefined ? customRemarks : remarks).trim();

    if (action === 'REJECTED' && !finalRemarks) {
      setActionError('A reason/remarks is required when returning a request.');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: target.id,
          action,
          remarks: finalRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Failed to process approval action.');
        setActionLoading(false);
        return;
      }

      setShowApproveModal(false);
      setShowRejectModal(false);
      const reqRef = target;
      setReviewRequest(null);
      setRemarks('');
      setHasDigitalSignature(false);

      // Optimistic instant dashboard status reflection
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== target.id) return r;
          const nextStatus =
            action === 'REJECTED'
              ? 'REJECTED_MANUAL'
              : target.status === 'PENDING_SECTION_CHIEF'
              ? 'PENDING_DIVISION_CHIEF'
              : target.status === 'PENDING_DIVISION_CHIEF'
              ? 'PENDING_HEAD_PENRO'
              : 'APPROVED';
          return {
            ...r,
            status: nextStatus as any,
          };
        })
      );

      fetchRequests();
      fetchNotifications();

      if (typeof window !== 'undefined') {
        const actionTitle = action === 'APPROVED' ? 'Travel Endorsement Approved' : 'Travel Request Returned';
        const remarksSuffix = finalRemarks ? ` Remarks: "${finalRemarks}"` : '';
        const actionMsg = action === 'APPROVED'
          ? `TA Request ${reqRef.trackingNumber || ''} has been endorsed and forwarded to the next signatory.${remarksSuffix}`
          : `TA Request ${reqRef.trackingNumber || ''} has been returned with your remarks.${finalRemarks ? ` Reason: "${finalRemarks}"` : ''}`;

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

  // ── STRICT HIERARCHICAL ROLE SCOPING ──────────────────────────────────────
  const stepRoleMap: Record<string, number> = {
    SECTION_CHIEF: 1,
    DIVISION_CHIEF: 2,
    HEAD_PENRO: 3,
  };
  const myRoleOrder = stepRoleMap[userRole] ?? 0;
  const effectiveUserDivision = userDivision || getDivisionForSection(userSection);

  // 1. Scoped Requests: Only requests within this verifier's jurisdiction and sequence
  const scopedRequests = requests.filter((r) => {
    if (userRole === 'ADMIN') return true;

    // Hide other users' drafts
    if (r.status === 'DRAFT' && r.createdById !== user?.id) return false;

    const reqSection = r.createdBy?.section;
    const effectiveReqDivision = r.createdBy?.division || getDivisionForSection(reqSection);

    // Section Chief: Only requests from their section/division
    if (userRole === 'SECTION_CHIEF') {
      if (userSection && reqSection) {
        if (reqSection.trim().toLowerCase() !== userSection.trim().toLowerCase()) return false;
      } else if (effectiveUserDivision && effectiveReqDivision) {
        if (effectiveReqDivision.trim().toLowerCase() !== effectiveUserDivision.trim().toLowerCase()) return false;
      }
      return true;
    }

    // Division Chief: Only requests from their division that have reached Step 2 or later
    if (userRole === 'DIVISION_CHIEF') {
      if (effectiveUserDivision && effectiveReqDivision) {
        if (effectiveReqDivision.trim().toLowerCase() !== effectiveUserDivision.trim().toLowerCase()) return false;
      }

      const step1 = r.approvalSteps?.find((s: any) => s.order === 1);
      const isStep1Approved = step1?.action === 'APPROVED';
      const step2 = r.approvalSteps?.find((s: any) => s.order === 2);
      const isStep2Actioned = step2 && step2.action !== 'PENDING';

      const reachedDivChief = isStep1Approved || isStep2Actioned || [
        'PENDING_DIVISION_CHIEF',
        'PENDING_HEAD_PENRO',
        'APPROVED',
        'REJECTED_MANUAL',
        'REJECTED_OVERDUE',
      ].includes(r.status);

      if (r.status === 'PENDING_SECTION_CHIEF' && !isStep1Approved) return false;
      return reachedDivChief;
    }

    // Head of PENRO: Only requests that have reached Step 3 or later
    if (userRole === 'HEAD_PENRO') {
      const step2 = r.approvalSteps?.find((s: any) => s.order === 2);
      const isStep2Approved = step2?.action === 'APPROVED';
      const step3 = r.approvalSteps?.find((s: any) => s.order === 3);
      const isStep3Actioned = step3 && step3.action !== 'PENDING';

      const reachedPenro = isStep2Approved || isStep3Actioned || [
        'PENDING_HEAD_PENRO',
        'APPROVED',
      ].includes(r.status);

      if ((r.status === 'PENDING_SECTION_CHIEF' || r.status === 'PENDING_DIVISION_CHIEF') && !isStep2Approved) return false;
      if (r.status === 'REJECTED_MANUAL' && !isStep2Approved) return false;
      return reachedPenro;
    }

    return true;
  });

  // 2. Pending Approvals: Requests currently waiting for THIS verifier's action
  const pendingRequests = scopedRequests.filter((r) => {
    const pendingStatusForRole: Record<string, string> = {
      SECTION_CHIEF: 'PENDING_SECTION_CHIEF',
      DIVISION_CHIEF: 'PENDING_DIVISION_CHIEF',
      HEAD_PENRO: 'PENDING_HEAD_PENRO',
    };
    const myPendingStatus = pendingStatusForRole[userRole];

    const myStepObj = r.approvalSteps?.find((s: any) => s.order === myRoleOrder);
    const prevStepsApproved = (r.approvalSteps || [])
      .filter((s: any) => s.order < myRoleOrder)
      .every((s: any) => s.action === 'APPROVED');

    const isPendingForMyRole = (
      r.status === myPendingStatus ||
      (myStepObj?.action === 'PENDING' && (myRoleOrder === 1 || prevStepsApproved) && r.status !== 'REJECTED_MANUAL' && r.status !== 'REJECTED_OVERDUE' && r.status !== 'APPROVED')
    );

    return isPendingForMyRole;
  });

  // 3. Approval History: Archive of requests this verifier has processed or that passed their step
  const historyRequests = scopedRequests.filter((r) => {
    if (myRoleOrder === 0) return true; // ADMIN

    const myStep = r.approvalSteps?.find((s: any) => s.order === myRoleOrder);
    const hasActed = myStep && myStep.action !== 'PENDING' && myStep.actionDate;

    const stepOrder: Record<string, number> = {
      PENDING_SECTION_CHIEF: 1,
      PENDING_DIVISION_CHIEF: 2,
      PENDING_HEAD_PENRO: 3,
    };
    const currentStepNum = stepOrder[r.status] ?? (r.status === 'APPROVED' ? 4 : 0);

    // If currently waiting for this verifier's review, keep in Pending Approvals, not History
    const isPendingMyAction = currentStepNum === myRoleOrder && myStep?.action === 'PENDING' && r.status !== 'REJECTED_MANUAL';
    if (isPendingMyAction) return false;

    return hasActed || (currentStepNum > myRoleOrder) || r.status === 'APPROVED';
  });

  // 4. Dashboard Activity: Prioritize pending items requiring action, followed by recently processed requests
  const dashboardActivityRequests = [
    ...pendingRequests,
    ...historyRequests.filter((hr) => !pendingRequests.some((pr) => pr.id === hr.id)),
  ];

  // 5. Filtered Requests for Approval History Tab
  const filteredRequests = historyRequests.filter((r) => {
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

  // 6. Stat Counters
  const totalCount = dashboardActivityRequests.length;
  const approvedCount = scopedRequests.filter((r) => r.status === 'APPROVED' || (r.approvalSteps?.find((s: any) => s.order === myRoleOrder)?.action === 'APPROVED')).length;
  const pendingCount = pendingRequests.length;
  const ongoingCount = scopedRequests.filter((r) => {
    const myStep = r.approvalSteps?.find((s: any) => s.order === myRoleOrder);
    const myEndorsed = myStep?.action === 'APPROVED';
    return myEndorsed && (r.status === 'PENDING_DIVISION_CHIEF' || r.status === 'PENDING_HEAD_PENRO');
  }).length;

  /* -------------------------------------------------------------------------- */
  /* REVIEW TA REQUEST DETAIL VIEW (Strictly Matching PDF Pages 4, 5 & 6)       */
  /* -------------------------------------------------------------------------- */
  if (reviewRequest) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white p-4 rounded-[8px] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setReviewRequest(null)}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors cursor-pointer"
            >
              ← Back
            </button>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-white">Review TA Request</h2>
              <p className="text-[12px] text-emerald-100/90 mt-0.5 flex items-center gap-2">
                <span className="font-mono font-semibold bg-white/15 px-1.5 py-0.5 rounded-[4px] text-white">
                  {reviewRequest.trackingNumber}
                </span>
                <span>• Submitted on {formatDateDisplay(reviewRequest.createdAt)}</span>
              </p>
            </div>
          </div>
          <div>{renderStatusBadge(reviewRequest.status)}</div>
        </div>

        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[13px] rounded-[6px] font-medium">
            {actionError}
          </div>
        )}

        {/* 2-Column Main Review Layout (2/3 + 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-5">
            {/* 1. Request Details Card */}
            <div className="bg-white border border-[#E5E5E7] border-t-4 border-t-[#0F4C2E] rounded-[8px] shadow-xs overflow-hidden">
              <div className="bg-emerald-950/[0.04] border-b border-[#E5E5E7] px-4 py-2.5 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-[6px] bg-emerald-50 text-[#0F4C2E] border border-emerald-200 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                <h3 className="text-[14px] font-semibold text-[#0F4C2E]">Request Details</h3>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1">
                      EMPLOYEE NAME
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0F4C2E] text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {(reviewRequest.createdBy?.name || 'M').charAt(0).toUpperCase()}
                      </span>
                      <p className="text-[13px] font-semibold text-[#1D1D1F]">
                        {reviewRequest.createdBy?.name || 'Maria Santos'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1">
                      DESTINATION
                    </span>
                    <p className="text-[13px] font-medium text-[#1D1D1F] flex items-start gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span className="leading-snug">{resolvedAddress || reviewRequest.destination}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1">
                      POSITION & UNIT
                    </span>
                    <p className="text-[13px] font-medium text-[#1D1D1F]">
                      {reviewRequest.createdBy?.position || 'Personnel'}
                    </p>
                    <p className="text-[12px] text-[#0F4C2E] font-medium">
                      {[reviewRequest.createdBy?.division, reviewRequest.createdBy?.section].filter(Boolean).join(' • ') || 'PENRO Agusan del Norte'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1">
                      TRAVEL DATES
                    </span>
                    <p className="text-[13px] font-medium text-[#1D1D1F] flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDateDisplay(reviewRequest.startDate)} - {formatDateDisplay(reviewRequest.endDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1.5">
                    PURPOSE OF TRAVEL
                  </span>
                  <div className="p-3 bg-emerald-50/40 rounded-[6px] border border-emerald-200/70 text-[13px] text-[#1D1D1F] font-normal leading-relaxed">
                    {reviewRequest.purpose}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Destination Map Card (Matching PDF Page 6) */}
            <div className="bg-white border border-[#E5E5E7] border-t-4 border-t-sky-500 rounded-[8px] shadow-xs overflow-hidden">
              <div className="bg-emerald-950/[0.04] border-b border-[#E5E5E7] px-4 py-2.5 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-[6px] bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </span>
                <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Destination Map</h3>
              </div>

              <div className="p-4">
                <div className="rounded-[6px] overflow-hidden border border-[#E5E5E7] relative">
                  <DynamicMapPicker
                    initialLat={reviewRequest.destinationLat || 7.0097}
                    initialLng={reviewRequest.destinationLng || 125.2708}
                    onLocationSelect={() => {}}
                    readOnly={true}
                    locationName={resolvedAddress || reviewRequest.destination}
                  />
                  <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md p-3 rounded-[6px] border border-emerald-200 shadow-xs z-10 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F4C2E]">
                        Specific Location Address
                      </span>
                      {isResolvingAddress && (
                        <span className="text-[11px] text-emerald-600 font-normal animate-pulse">Resolving...</span>
                      )}
                    </div>
                    <p className="font-medium text-[#1D1D1F] text-[13px] leading-snug">
                      {resolvedAddress || reviewRequest.destination}
                    </p>
                    {reviewRequest.destinationLat && reviewRequest.destinationLng && (
                      <p className="text-[11px] font-mono text-[#86868B]">
                        Coordinates: {reviewRequest.destinationLat.toFixed(5)}° N, {reviewRequest.destinationLng.toFixed(5)}° E
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Attachments Card */}
            {(() => {
              const rawAttachments: any[] = (reviewRequest as any).attachments || [];
              const attachments = rawAttachments.map((file) => {
                const name = file.name || 'document';
                const isWord = name.toLowerCase().endsWith('.doc') || name.toLowerCase().endsWith('.docx') || file.type?.includes('word');
                const isPdf = name.toLowerCase().endsWith('.pdf') || file.type?.includes('pdf');
                const color: 'rose' | 'blue' = isWord ? 'blue' : 'rose';
                const typeLabel = isWord ? 'Word Document' : isPdf ? 'PDF Document' : (file.type || 'Document');
                const badgeLabel = isWord ? 'DOC' : 'PDF';
                const formattedSize = typeof file.size === 'number'
                  ? file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                  : (file.size || '');
                return {
                  ...file,
                  name,
                  color,
                  typeLabel,
                  badgeLabel,
                  formattedSize,
                  icon: isWord ? 'doc' : 'doc',
                };
              });
              const hasFiles = attachments.length > 0;
              return (
                <div className="bg-white border border-[#E5E5E7] border-t-4 border-t-violet-500 rounded-[8px] shadow-xs overflow-hidden">
                  <div className="bg-emerald-950/[0.04] border-b border-[#E5E5E7] px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-[6px] bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.373L8.557 18.315a1.5 1.5 0 11-2.122-2.122l7.694-7.694" />
                        </svg>
                      </span>
                      <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Attachments</h3>
                    </div>
                    {hasFiles && (
                      <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-violet-100 text-violet-700 border border-violet-200">
                        {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    {hasFiles ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {attachments.map((file, idx) => {
                          const gradients: Record<string, string> = {
                            rose: 'from-rose-400 to-orange-500',
                            blue: 'from-blue-400 to-indigo-600',
                          };
                          const badgeColors: Record<string, string> = {
                            rose: 'bg-rose-50 text-rose-700 border border-rose-200',
                            blue: 'bg-blue-50 text-blue-700 border border-blue-200',
                          };
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (file.url) {
                                  window.open(file.url, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              title={`Click to open/download ${file.name}`}
                              className="group rounded-[6px] border border-[#E5E5E7] bg-gradient-to-br from-slate-50 to-white hover:border-violet-300 hover:bg-violet-50/30 transition-colors cursor-pointer p-3 flex items-center gap-3"
                            >
                              <div className={`w-9 h-9 rounded-[6px] bg-gradient-to-br ${gradients[file.color] || gradients.rose} text-white shadow-xs flex items-center justify-center shrink-0`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[13px] font-medium text-[#1D1D1F] truncate" title={file.name}>{file.name}</h4>
                                <p className="text-[12px] text-[#86868B] mt-0.5">{file.typeLabel}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] ${badgeColors[file.color] || badgeColors.rose}`}>{file.badgeLabel}</span>
                                  <span className="text-[11px] text-[#86868B]">{file.formattedSize}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (file.url) window.open(file.url, '_blank', 'noopener,noreferrer');
                                }}
                                title="Download / Open in new tab"
                                className="h-7 w-7 rounded-[6px] bg-violet-50 group-hover:bg-violet-600 text-violet-600 group-hover:text-white border border-violet-200 inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                        <div className="w-10 h-10 rounded-[6px] bg-violet-50 border border-violet-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#1D1D1F]">No files attached</p>
                          <p className="text-[12px] text-[#86868B] mt-0.5">The employee did not attach any files to this request.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Column (1/3 width): Action Box + Timeline */}
          <div className="space-y-5">
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

              const isMyUnit =
                userRole === 'ADMIN' ||
                userRole === 'HEAD_PENRO' ||
                (userRole === 'SECTION_CHIEF' && (!userSection || !reviewRequest.createdBy?.section || reviewRequest.createdBy.section.trim().toLowerCase() === userSection.trim().toLowerCase())) ||
                (userRole === 'DIVISION_CHIEF' && (!userDivision || !reviewRequest.createdBy?.division || reviewRequest.createdBy.division.trim().toLowerCase() === userDivision.trim().toLowerCase()));

              const requiresMyAction =
                isMyUnit &&
                (reviewRequest.status === myPendingStatus ||
                (myStepObj?.action === 'PENDING' && (myRoleOrder === 1 || prevStepsApproved) && reviewRequest.status !== 'REJECTED_MANUAL' && reviewRequest.status !== 'REJECTED_OVERDUE' && reviewRequest.status !== 'APPROVED'));

              if (requiresMyAction) {
                // ── ACTIVE ACTION PANEL ──────────────────────────────────
                return (
                  <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
                    <div className="bg-[#0F4C2E] text-white px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-white">Your Action Required</span>
                      <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-amber-400/20 text-amber-200 border border-amber-300/30 uppercase tracking-wider">
                        FOR REVIEW
                      </span>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Digital Signature Container */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1.5">
                          DIGITAL SIGNATURE
                        </label>
                        <div
                          onClick={() => setHasDigitalSignature(!hasDigitalSignature)}
                          className={`h-24 rounded-[6px] border-2 border-dashed p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                            hasDigitalSignature
                              ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800'
                              : 'border-emerald-200 bg-emerald-50/30 text-[#0F4C2E] hover:bg-emerald-50/60 hover:border-[#0F4C2E]'
                          }`}
                        >
                          {hasDigitalSignature ? (
                            <div className="space-y-1">
                              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center mx-auto shadow-xs">
                                ✓
                              </div>
                              <p className="text-[13px] font-semibold text-emerald-900">Digital Signature Affixed</p>
                              <p className="text-[11px] text-emerald-700 font-mono">{user?.name || userRole}</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <svg className="w-5 h-5 text-[#0F4C2E] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <p className="text-[13px] font-medium text-[#0F4C2E]">Click to sign as Verifier</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Remarks Field */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block mb-1.5">
                          REMARKS (OPTIONAL)
                        </label>
                        <textarea
                          rows={3}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Add comments or instructions..."
                          className="w-full px-2.5 py-2 text-[13px] text-[#1D1D1F] bg-slate-50/70 border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#0F4C2E]/20 focus:border-[#0F4C2E]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!remarks.trim()) {
                              setActionError('');
                              setShowRejectModal(true);
                            } else {
                              handleAction('REJECTED');
                            }
                          }}
                          disabled={actionLoading}
                          className="flex-1 h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          Return
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowApproveModal(true)}
                          disabled={actionLoading}
                          className="flex-1 h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white shadow-xs transition-colors cursor-pointer"
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
                <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
                  <div className={`px-4 py-2.5 flex items-center justify-between ${
                    isProcessed
                      ? 'bg-[#0F4C2E] text-white'
                      : 'bg-amber-50 border-b border-amber-200 text-amber-900'
                  }`}>
                    <span className="text-[14px] font-semibold">
                      {isProcessed ? '✓ Processed Status' : 'Awaiting Earlier Step'}
                    </span>
                    <span className={`h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] uppercase tracking-wider ${
                      isProcessed
                        ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/30'
                        : isUpcoming
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {isProcessed ? 'PROCESSED' : 'PENDING'}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {isProcessed && myStep ? (
                      <>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-[#0F4C2E] flex items-center justify-center font-semibold text-xs shrink-0">
                            ✓
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#1D1D1F]">
                              {myStep.action === 'APPROVED' ? 'Endorsed' : 'Returned'}
                            </p>
                            <p className="text-[12px] text-[#86868B]">{formatDateDisplay(myStep.actionDate)}</p>
                          </div>
                        </div>
                        {myStep.remarks && (
                          <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-[6px]">
                            <p className="text-[11px] text-[#0F4C2E] font-semibold uppercase tracking-wider mb-1">Your Remarks</p>
                            <p className="text-[13px] text-[#1D1D1F]">{myStep.remarks}</p>
                          </div>
                        )}
                        <p className="text-[12px] text-[#86868B] pt-1">
                          No further action needed from you on this request.
                        </p>
                      </>
                    ) : !isMyUnit ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px]">
                        <p className="text-[13px] font-semibold text-amber-900">Different Unit Assignment</p>
                        <p className="text-[12px] text-amber-800 mt-1">
                          This request belongs to {reviewRequest.createdBy?.section || reviewRequest.createdBy?.division || 'another unit'} and is assigned to their designated Chief.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#86868B]">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-lg bg-white border border-[#E5E5E7] rounded-[10px] shadow-xl overflow-hidden">
              <div className="bg-[#0F4C2E] text-white px-5 py-3.5 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-200 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[14px] font-semibold text-white">Approve Confirmation</span>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-[13px] text-[#1D1D1F]">
                  Are you sure you want to approve this travel request for{' '}
                  <strong className="text-[#0F4C2E] font-semibold">
                    {reviewRequest.createdBy?.name || 'Maria Santos'}
                  </strong>
                  ?
                </p>

                {/* Legal Consent Callout */}
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-[6px]">
                  <p className="text-[12px] text-sky-900 leading-relaxed">
                    <strong className="font-semibold text-sky-950">Notice:</strong> By clicking &apos;Affix Signature,&apos; you hereby affirm your explicit intention to authenticate and approve this electronic document and the transaction it embodies. This action serves as your legal consent and is equivalent to a physical handwritten signature.
                  </p>
                </div>

                <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-[#E5E5E7]">
                  <button
                    type="button"
                    onClick={() => setShowApproveModal(false)}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('APPROVED')}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#0F4C2E] hover:bg-[#165E3A] text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {actionLoading ? 'Affixing Signature...' : 'Affix Signature'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject / Return Confirmation Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-lg bg-white border border-[#E5E5E7] rounded-[10px] shadow-xl overflow-hidden">
              <div className="bg-rose-700 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-[14px] font-semibold text-white">Return Request for Revision</span>
                </div>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-rose-200 hover:text-white text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                {reviewRequest && (
                  <div className="p-3 bg-rose-50/40 border border-rose-200/70 rounded-[6px] text-[12px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Reference:</span>
                      <span className="font-mono font-medium text-[#0F4C2E]">{reviewRequest.trackingNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Employee:</span>
                      <span className="font-medium text-[#1D1D1F]">{reviewRequest.createdBy?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Destination:</span>
                      <span className="font-medium text-[#1D1D1F]">{reviewRequest.destination}</span>
                    </div>
                  </div>
                )}

                {actionError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] text-[12px] font-medium text-rose-700">
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="text-[13px] font-medium text-[#1D1D1F] block mb-1.5">
                    Reason for Return / Revision Instructions <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => {
                      setRemarks(e.target.value);
                      if (actionError) setActionError('');
                    }}
                    placeholder="E.g., Please adjust travel dates or provide further travel justification..."
                    className="w-full px-2.5 py-2 text-[13px] text-[#1D1D1F] bg-slate-50/70 border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <p className="text-[12px] text-[#86868B] mt-1">
                    This reason will be sent immediately via SMS and in-app notification to the employee.
                  </p>
                </div>

                <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-[#E5E5E7]">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading || !remarks.trim()}
                    onClick={() => handleAction('REJECTED')}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {actionLoading ? 'Returning...' : 'Confirm Return'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document History Modal (Strictly Matching PDF Page 8) */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md bg-white border border-[#E5E5E7] rounded-[10px] shadow-xl overflow-hidden">
              <div className="bg-[#0F4C2E] text-white px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-white">Document History</h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-emerald-200 hover:text-white text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="space-y-5 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-emerald-200">
                  {/* Event 1: Document Submitted */}
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-emerald-600 text-white font-semibold text-[11px] flex items-center justify-center shrink-0">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-[#1D1D1F]">Document Filed & Submitted</h4>
                      <p className="text-[12px] text-[#86868B] mt-0.5">Applicant: <span className="font-medium text-[#1D1D1F]">{reviewRequest.createdBy?.name || 'Juan Dela Cruz'}</span></p>
                      <span className="text-[11px] text-[#86868B] mt-0.5 block">
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
                          className={`absolute -left-6 top-0 w-5 h-5 rounded-full font-semibold text-[11px] flex items-center justify-center shrink-0 ${
                            isApproved
                              ? 'bg-emerald-600 text-white'
                              : isRejected
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-50 text-[#0F4C2E] border border-emerald-200'
                          }`}
                        >
                          {isApproved ? '✓' : isRejected ? '✕' : stepDef.order + 1}
                        </div>
                        <div>
                          <h4 className="text-[13px] font-semibold text-[#1D1D1F]">{stepDef.defaultTitle}</h4>
                          <p className="text-[12px] text-[#86868B] mt-0.5">
                            Signatory: <span className="font-medium text-[#1D1D1F]">{approverName}</span>
                          </p>
                          {isApproved && (
                            <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">
                              ✓ Approved · {formatFullDateTimeDisplay(step?.actionDate || step?.updatedAt)}
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[11px] text-rose-700 mt-0.5 block font-medium">
                              ✕ Returned / Rejected · {formatFullDateTimeDisplay(step?.actionDate || step?.updatedAt)}
                            </span>
                          )}
                          {!isApproved && !isRejected && (
                            <span className="text-[11px] text-amber-700 mt-0.5 inline-flex items-center gap-1 font-medium">
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

                <div className="pt-3 border-t border-[#E5E5E7] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(false)}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0F4C2E] border border-emerald-200 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
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
      <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in">
        {/* 4 Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Total */}
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-[#0F4C2E] shadow-xs flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-[6px] bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#0F4C2E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Total</p>
              <h3 className="text-[24px] font-bold tracking-tight text-[#1D1D1F] leading-tight mt-0.5">{totalCount}</h3>
            </div>
          </div>

          {/* Stat 2: Approved */}
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-emerald-500 shadow-xs flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-[6px] bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Approved</p>
              <h3 className="text-[24px] font-bold tracking-tight text-[#1D1D1F] leading-tight mt-0.5">{approvedCount}</h3>
            </div>
          </div>

          {/* Stat 3: Pending */}
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-amber-500 shadow-xs flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-[6px] bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Pending</p>
              <h3 className="text-[24px] font-bold tracking-tight text-[#1D1D1F] leading-tight mt-0.5">{pendingCount}</h3>
            </div>
          </div>

          {/* Stat 4: Ongoing */}
          <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] border-l-4 border-l-blue-500 shadow-xs flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-[6px] bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Ongoing</p>
              <h3 className="text-[24px] font-bold tracking-tight text-[#1D1D1F] leading-tight mt-0.5">{ongoingCount}</h3>
            </div>
          </div>
        </div>

        {/* 2-Column Grid (2/3 + 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3): Recent Approval Activity Table */}
          <div className="lg:col-span-2 bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E5E7] flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Recent Approval Activity</h3>
              <button
                onClick={() => router.push('/staff?tab=pending')}
                className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 text-[#1B4332] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F5F5F7] border-b border-[#E5E5E7]">
                  <tr>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">PERSONNEL</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">DESTINATION & PURPOSE</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">TRAVEL DATES</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">DATE FILED</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">STATUS</th>
                    <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardActivityRequests.length > 0 ? (
                    dashboardActivityRequests.map((req, idx) => (
                      <tr key={req.id || idx} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-[#F2F2F7] transition-colors">
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">
                          <div className="font-medium text-[#1D1D1F]">{req.createdBy?.name || 'Maria Santos'}</div>
                          {(req.createdBy?.section || req.createdBy?.division) && (
                            <div className="text-[12px] text-[#86868B]">
                              {[req.createdBy?.division, req.createdBy?.section].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left max-w-xs">
                          <p className="font-medium text-[#1D1D1F] truncate">{req.destination}</p>
                          <p className="text-[12px] text-[#86868B] truncate">{req.purpose}</p>
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">
                          {formatDateRangeShort(req.startDate, req.endDate)}
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">{formatDateDisplay(req.createdAt)}</td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">{renderStatusBadge(req.status)}</td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-right">
                          <button
                            onClick={() => setReviewRequest(req)}
                            className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="h-[42px]">
                      <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-[#86868B]">
                        No recent approval activity in your unit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column (1/3): Approval Workflow SOP Card */}
          <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden flex flex-col justify-between relative isolate">
            <div>
              <div className="bg-[#F5F5F7] border-b border-[#E5E5E7] px-4 py-3">
                <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Approval Workflow</h3>
                <p className="text-[12px] text-[#86868B] mt-0.5">Standard operating procedure</p>
              </div>

              <div className="p-4">
                <div className="relative">
                  {[
                    {
                      step: 'Step 1 – Employee',
                      description: 'Submits Travel Order request with attachments.',
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
                    <div key={idx} className="relative flex items-start gap-3.5 pb-5 last:pb-0">
                      {/* Single vertical line connecting nodes from Step 1 through Step 4 */}
                      {idx < arr.length - 1 && (
                        <div
                          className="absolute left-[7px] top-2.5 h-full w-px bg-[#E5E5E7]"
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
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-[#1D1D1F] text-[13px]">
                          {item.step}
                        </h4>
                        <p className="text-[12px] text-[#86868B] mt-0.5 leading-snug">
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
      <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Pending Approvals</h2>
            <p className="text-[13px] text-[#86868B] mt-0.5">
              Requests requiring your immediate action ({pendingRequests.length})
            </p>
          </div>

          {/* Search & Filter Header Bar */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-72">
              <input
                type="text"
                placeholder="Search Personnel, ID, Dest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
              />
              <svg className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 top-2.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button className="h-8 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-white border border-[#E5E5E7] text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors">
              <svg className="w-3.5 h-3.5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                <tr>
                  <th className="h-8 px-3 w-10 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={pendingRequests.length > 0 && selectedIds.length === pendingRequests.length}
                      className="rounded border-[#E5E5E7] text-[#1B4332] focus:ring-[#1B4332]"
                    />
                  </th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">PERSONNEL</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">DESTINATION</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left max-w-xs">PURPOSE</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">TRAVEL DATES</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">DATE FILED</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">STATUS</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((req, idx) => {
                    const isSelected = selectedIds.includes(req.id);

                    return (
                      <tr key={req.id || idx} className={`h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(req.id)}
                            className="rounded border-[#E5E5E7] text-[#1B4332] focus:ring-[#1B4332]"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">
                          <div className="font-medium text-[#1D1D1F]">{req.createdBy?.name || 'Maria Santos'}</div>
                          <div className="text-[12px] text-[#86868B] font-mono">{req.trackingNumber}</div>
                          {(req.createdBy?.section || req.createdBy?.division) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {req.createdBy?.division && (
                                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]">
                                  {req.createdBy.division}
                                </span>
                              )}
                              {req.createdBy?.section && (
                                <span className="h-5 inline-flex items-center justify-center px-2 text-[10px] font-semibold rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {req.createdBy.section}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-[13px] font-medium text-[#1D1D1F] align-middle text-left">{req.destination}</td>
                        <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left max-w-xs leading-relaxed">{req.purpose}</td>
                        <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">
                          {formatDateRangeShort(req.startDate, req.endDate)}
                        </td>
                        <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">{formatDateDisplay(req.createdAt)}</td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">{renderStatusBadge(req.status)}</td>
                        <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setReviewRequest(req);
                                setShowApproveModal(true);
                              }}
                              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#1B4332] hover:bg-[#143225] text-white transition-colors cursor-pointer"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => {
                                setReviewRequest(req);
                                setRemarks('');
                                setActionError('');
                                setShowRejectModal(true);
                              }}
                              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                            >
                              Disapprove
                            </button>

                            <button
                              onClick={() => setReviewRequest(req)}
                              className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>View Docs</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="h-[42px]">
                    <td colSpan={8} className="px-3 py-8 text-center text-[13px] text-[#86868B]">
                      No pending requests requiring your action.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Selection Action Bar (Matching PDF Page 2) */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E7]">
          <span className="text-[13px] font-medium text-[#86868B]">
            {selectedIds.length} request(s) selected
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => alert('Printing selected requests...')}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white border border-[#E5E5E7] hover:bg-[#F2F2F7] text-[#1D1D1F] transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>

            <button
              onClick={() => {
                if (selectedIds.length === 0) return alert('Select at least 1 request to approve.');
                alert(`Approved ${selectedIds.length} request(s) successfully!`);
              }}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#143225] text-white transition-colors cursor-pointer"
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
      <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Approval History</h2>
            <p className="text-[13px] text-[#86868B] mt-0.5">
              Archive of all processed travel order requests ({filteredRequests.length} record{filteredRequests.length === 1 ? '' : 's'})
            </p>
          </div>

          {/* Export Report Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white border border-[#E5E5E7] hover:bg-[#F2F2F7] text-[#1D1D1F] shadow-xs self-start sm:self-auto transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Report</span>
              <svg className={`w-3.5 h-3.5 text-[#86868B] transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-[8px] shadow-xl border border-[#E5E5E7] p-1.5 z-30 animate-fade-in space-y-0.5">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      exportApprovalHistoryToCSV(filteredRequests, userRole);
                    }}
                    className="w-full px-3 py-2 text-left text-[13px] rounded-[6px] hover:bg-[#F2F2F7] text-[#1D1D1F] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-[#1B4332] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div>
                      <div className="font-medium text-[#1D1D1F]">Export to CSV / Excel</div>
                      <div className="text-[11px] text-[#86868B]">Download spreadsheet (.csv)</div>
                    </div>
                  </button>

                  <div className="border-t border-[#E5E5E7] my-1" />

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
                    className="w-full px-3 py-2 text-left text-[13px] rounded-[6px] hover:bg-[#F2F2F7] text-[#1D1D1F] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-[#1D1D1F] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <div>
                      <div className="font-medium text-[#1D1D1F]">Print / Save as PDF</div>
                      <div className="text-[11px] text-[#86868B]">Official government summary report</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filter Bar matching PDF Page 3 */}
        <div className="bg-white p-3 rounded-[8px] border border-[#E5E5E7] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search by Employee Name or TA Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
            />
            <svg className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 top-2.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED_MANUAL">Disapproved</option>
              <option value="DRAFT">Ongoing</option>
            </select>

            <button
              onClick={() => setShowDateRangeModal(true)}
              className={`h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                startDateFilter || endDateFilter
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-[#E5E5E7] text-[#1D1D1F] hover:bg-[#F2F2F7]'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
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
                  className="ml-1 text-[#86868B] hover:text-red-600 font-semibold"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm bg-white border border-[#E5E5E7] rounded-[10px] shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#0F4C2E] to-[#165E3A] text-white px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Filter by Filing Date Range
                </h3>
                <button
                  onClick={() => setShowDateRangeModal(false)}
                  className="w-7 h-7 rounded-[6px] hover:bg-white/10 text-emerald-100 hover:text-white flex items-center justify-center font-semibold text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] font-medium text-[#1D1D1F] block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#1D1D1F] block mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                      className="w-full h-8 px-2.5 text-[13px] text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1.5">Quick Presets</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setStartDateFilter(today);
                          setEndDateFilter(today);
                        }}
                        className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors cursor-pointer"
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
                        className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors cursor-pointer"
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
                        className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-[#F5F5F7] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors cursor-pointer"
                      >
                        Last 30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStartDateFilter('');
                          setEndDateFilter('');
                        }}
                        className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E5E7] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStartDateFilter('');
                      setEndDateFilter('');
                      setShowDateRangeModal(false);
                    }}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
                  >
                    Reset All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDateRangeModal(false)}
                    className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#143225] text-white transition-colors cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-white border border-[#E5E5E7] rounded-[8px] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-950/[0.04] border-b border-[#E5E5E7]">
                <tr>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">TA NUMBER</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">PERSONNEL</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">DESTINATION</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left max-w-xs">PURPOSE</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">TRAVEL DATES</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">DATE FILED</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-center">STATUS</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-left">ACTION DATE</th>
                  <th className="h-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] whitespace-nowrap text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req, idx) => (
                    <tr key={req.id || idx} className="h-[42px] border-b border-[#E5E5E7] last:border-b-0 hover:bg-emerald-50/40 transition-colors">
                      <td className="px-3 py-1.5 text-[13px] font-mono font-medium text-[#1B4332] align-middle text-left whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-[4px] bg-emerald-50 text-[#0F4C2E] border border-emerald-200/80 font-mono text-[12px] font-semibold">
                          {req.trackingNumber}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-left">
                        <div className="font-medium text-[#1D1D1F]">{req.createdBy?.name || 'Maria Santos'}</div>
                        <div className="text-[12px] text-[#86868B]">{req.createdBy?.section || 'Conservation and Develop...'}</div>
                      </td>
                      <td className="px-3 py-1.5 text-[13px] font-medium text-[#1D1D1F] align-middle text-left">{req.destination}</td>
                      <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left max-w-xs truncate">{req.purpose}</td>
                      <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">
                        {formatDateRangeShort(req.startDate, req.endDate)}
                      </td>
                      <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">{formatDateDisplay(req.createdAt)}</td>
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-center">{renderStatusBadge(req.status)}</td>
                      <td className="px-3 py-1.5 text-[13px] text-[#86868B] align-middle text-left whitespace-nowrap">
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
                      <td className="px-3 py-1.5 text-[13px] text-[#1D1D1F] align-middle text-right">
                        <button
                          onClick={() => setReviewRequest(req)}
                          className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 bg-white hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5E7] transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="h-[42px]">
                    <td colSpan={9} className="px-3 py-8 text-center text-[13px] text-[#86868B]">
                      No travel order records found matching your filters.
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
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto space-y-5 animate-fade-in pb-10 flex flex-col min-h-[560px]">
        <div className="bg-white p-4 rounded-[8px] border border-[#E5E5E7] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#1B4332] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div>
              <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">Signatory Notification Center</h3>
              <p className="text-[12px] text-[#86868B]">{unreadCount} unread system notification{unreadCount === 1 ? '' : 's'}</p>
            </div>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="h-8 px-[14px] text-[13px] font-medium rounded-[6px] inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#F2F2F7] text-[#1B4332] border border-[#E5E5E7] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Mark all as read</span>
          </button>
        </div>

        <div className="space-y-3 flex-1">
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
                <div key={notif.id || idx} className="bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
                      {formatDayHeading(notif.createdAt)}
                    </span>
                    <span className="text-[12px] text-[#86868B]">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                  <div
                    onClick={handleNotifClick}
                    className={`flex items-start gap-3 p-3 rounded-[6px] border transition-colors ${
                      notif.isRead
                        ? 'bg-[#F5F5F7] border-[#E5E5E7] hover:bg-[#F2F2F7]'
                        : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                    } ${linkedRequest || notif.requestId ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.isRead ? (
                        <svg className="w-4 h-4 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="text-[14px] font-semibold text-[#1D1D1F]">{notif.title}</h4>
                        <span className="text-[12px] text-[#86868B] shrink-0">
                          {formatTimeDisplay(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#1D1D1F] mt-0.5">{notif.message}</p>
                      {(() => {
                        const match = notif.message?.match(/(?:Remarks|Reason):\s*"([^"]+)"/i);
                        let remarksText = match ? match[1] : null;
                        if (!remarksText && linkedRequest?.approvalSteps) {
                          const actedWithRemarks = linkedRequest.approvalSteps
                            .filter((s: any) => s.remarks && (s.action === 'APPROVED' || s.action === 'REJECTED'))
                            .sort((a: any, b: any) => (b.order || 0) - (a.order || 0));
                          if (actedWithRemarks[0]?.remarks) remarksText = actedWithRemarks[0].remarks;
                        }
                        if (!remarksText) return null;

                        return (
                          <div className="mt-2 p-2.5 bg-white rounded-[6px] border border-[#E5E5E7] text-[13px] text-[#1D1D1F]">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1B4332] uppercase tracking-wider mb-1">
                              <svg className="w-3.5 h-3.5 text-[#1B4332] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <span>Signatory Remarks:</span>
                            </div>
                            <p className="italic text-[#1D1D1F] text-[12px] pl-5">
                              &ldquo;{remarksText}&rdquo;
                            </p>
                          </div>
                        );
                      })()}
                      {(linkedRequest || notif.requestId) && (
                        <div className="flex items-center justify-end mt-2">
                          <span className="text-[12px] font-medium text-[#1B4332] flex items-center gap-0.5">
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
            <div className="p-8 text-center text-[13px] text-[#86868B] bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs">
              No notifications found. You are all caught up!
            </div>
          )}
        </div>

        <div className="p-3.5 bg-white rounded-[8px] border border-[#E5E5E7] shadow-xs flex items-center justify-between text-[13px] text-[#86868B]">
          <span>Real-time email and push notifications are active for all signatory step endorsements.</span>
          <button
            onClick={() => router.push('/staff?tab=dashboard')}
            className="h-7 px-2.5 text-xs font-medium rounded-[6px] inline-flex items-center justify-center gap-1 text-[#1B4332] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
          >
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
    <Suspense fallback={<div className="p-8 text-center text-[13px] text-[#86868B]">Loading Signatory Portal...</div>}>
      <StaffDashboardContent />
    </Suspense>
  );
}
