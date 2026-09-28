'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProfileDropdown from '@/components/profile/ProfileDropdown';
import NotificationBellDropdown from '@/components/notifications/NotificationBellDropdown';
import NotificationToastStack, { NotificationPopupItem } from '@/components/notifications/NotificationToastStack';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsList, setNotificationsList] = useState<NotificationPopupItem[]>([]);
  const [popups, setPopups] = useState<NotificationPopupItem[]>([]);
  const shownToastIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstFetchRef = React.useRef<boolean>(true);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  const user = session?.user as any;
  const userId = user?.id || null;
  const role = user?.role || 'EMPLOYEE';
  const name = user?.name || 'Juan Dela Cruz';
  const position = user?.position || 'Environmental Specialist';
  const section = user?.section || 'PENRO Laguna';

  // Get initials for avatar
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Supabase Realtime push-based notification subscription
  useRealtimeNotifications(userId);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'loading') {
        setSessionTimedOut(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated' || (sessionTimedOut && !session?.user)) {
      window.location.href = '/login';
    }
  }, [status, sessionTimedOut, session]);

  const fetchNotifications = async (triggerPopups = true) => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const fetchedNotifs: NotificationPopupItem[] = data.data.notifications || [];
          const count = data.data.unreadCount ?? 0;

          setNotificationsList(fetchedNotifs);
          setUnreadNotifications(count);

          // Real-time pop-up notification detection
          if (triggerPopups && fetchedNotifs.length > 0) {
            const unreadItems = fetchedNotifs.filter((n) => !n.isRead);

            if (isFirstFetchRef.current) {
              // Mark all initial items as seen on initial load to avoid popup spam on page refresh
              fetchedNotifs.forEach((n) => shownToastIdsRef.current.add(n.id));
              isFirstFetchRef.current = false;
            } else {
              // Find new unread notifications that haven't popped up yet
              const newUnshown = unreadItems.filter((n) => !shownToastIdsRef.current.has(n.id));
              if (newUnshown.length > 0) {
                newUnshown.forEach((n) => shownToastIdsRef.current.add(n.id));
                // Stack new popups (capped at 4 on screen)
                setPopups((prev) => [...newUnshown, ...prev].slice(0, 4));
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch notification count', err);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchNotifications(true);
      // Reduced from 12s to 60s — Supabase Realtime handles instant delivery,
      // this is now a safety-net fallback only
      const interval = setInterval(() => fetchNotifications(true), 60000);

      // Listen for custom immediate notification dispatch events from user actions
      const handleManualNotification = (e: any) => {
        if (e.detail) {
          const notif = e.detail as NotificationPopupItem;
          shownToastIdsRef.current.add(notif.id);
          setPopups((prev) => [notif, ...prev.filter((p) => p.id !== notif.id)].slice(0, 4));
          setNotificationsList((prev) => [notif, ...prev.filter((p) => p.id !== notif.id)]);
          setUnreadNotifications((prev) => prev + 1);
        }
      };

      const handleRefresh = () => {
        fetchNotifications(true);
      };

      window.addEventListener('taps:new-notification', handleManualNotification);
      window.addEventListener('taps:refresh-notifications', handleRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('taps:new-notification', handleManualNotification);
        window.removeEventListener('taps:refresh-notifications', handleRefresh);
      };
    }
  }, [session]);

  const handleMarkAllRead = async () => {
    try {
      setUnreadNotifications(0);
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setPopups([]);

      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      setUnreadNotifications((prev) => Math.max(prev - 1, 0));
      setNotificationsList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setPopups((prev) => prev.filter((p) => p.id !== id));

      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleDismissPopup = (id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDismissAllPopups = () => {
    setPopups([]);
  };

  const handleViewNotification = (item: NotificationPopupItem) => {
    handleDismissPopup(item.id);
    if (!item.isRead) {
      handleMarkSingleRead(item.id);
    }
    const targetHref = pathname.startsWith('/staff')
      ? '/staff?tab=notifications'
      : pathname.startsWith('/account-manager')
      ? '/account-manager?tab=dashboard'
      : pathname.startsWith('/admin')
      ? '/admin?tab=home'
      : '/employee?tab=notifications';
    router.push(targetHref);
  };

  // Sidebar links based on role using clean vector SVG outline icons matching PDF
  const isEmployee = role === 'EMPLOYEE';
  const isStaffPage = pathname.startsWith('/staff');

  const [viewRole, setViewRole] = useState('Verifier');

  const employeeNavLinks = [
    {
      id: 'dashboard',
      href: '/employee?tab=dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'create',
      href: '/employee?tab=create',
      label: 'Create Travel',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'requests',
      href: '/employee?tab=requests',
      label: 'My Requests',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'schedule',
      href: '/employee?tab=schedule',
      label: 'Travel Schedule',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      href: '/employee?tab=notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      badge: unreadNotifications,
    },
  ];

  const staffNavLinks = [
    {
      id: 'dashboard',
      href: '/staff?tab=dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'pending',
      href: '/staff?tab=pending',
      label: 'Pending Approvals',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'history',
      href: '/staff?tab=history',
      label: 'Approval History',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      href: '/staff?tab=notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      badge: unreadNotifications,
    },
  ];

  const otherNavLinks = [
    { href: '/staff', label: 'Approval Queue', roles: ['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO', 'ADMIN'] },
    { href: '/account-manager', label: 'Account Activation', roles: ['ACCOUNT_MANAGER', 'ADMIN'] },
    { href: '/admin', label: 'User Directory', roles: ['ADMIN'] },
  ];

  if (status === 'loading' && !sessionTimedOut) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F4C2E] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#0F4C2E]">Loading ETAPS Portal...</span>
        </div>
      </div>
    );
  }

  const isAccountManagerPage = pathname.startsWith('/account-manager');

  const accountManagerNavLinks = [
    {
      id: 'dashboard',
      href: '/account-manager?tab=dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'accounts',
      href: '/account-manager?tab=accounts',
      label: 'View Accounts',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'create-account',
      href: '/account-manager?tab=create-account',
      label: 'Create Account',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      id: 'password-management',
      href: '/account-manager?tab=password-management',
      label: 'Password Management',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
    {
      id: 'configuration',
      href: '/account-manager?tab=configuration',
      label: 'Configuration',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'create-travel',
      href: '/account-manager?tab=create-travel',
      label: 'Create Travel',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
    },
  ];

  const isAdminPage = pathname.startsWith('/admin');

  const adminNavOverview = [
    {
      id: 'home',
      href: '/admin?tab=home',
      label: 'Dashboard',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'approval-monitoring',
      href: '/admin?tab=approval-monitoring',
      label: 'Monitoring',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'data',
      href: '/admin?tab=data',
      label: 'Data Cards',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'tables',
      href: '/admin?tab=tables',
      label: 'Records Table',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'cancelled',
      href: '/admin?tab=cancelled',
      label: 'Cancelled TAs',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'search',
      href: '/admin?tab=search',
      label: 'Search by ID',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'edit',
      href: '/admin?tab=edit',
      label: 'Edit TA',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  ];

  const adminNavAnalytics = [
    {
      id: 'travel-analytics',
      href: '/admin?tab=travel-analytics',
      label: 'Travel Analytics',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'destination-map',
      href: '/admin?tab=destination-map',
      label: 'Destination Map',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'approval-analytics',
      href: '/admin?tab=approval-analytics',
      label: 'Approval Analytics',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      id: 'processing-performance',
      href: '/admin?tab=processing-performance',
      label: 'Processing Performance',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  const adminNavAdmin = [
    {
      id: 'user-management',
      href: '/admin?tab=user-management',
      label: 'User Management',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'audit-logs',
      href: '/admin?tab=audit-logs',
      label: 'Audit Logs',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  const getPageTitle = () => {
    if (pathname.startsWith('/admin')) {
      switch (currentTab) {
        case 'home':
        case 'dashboard':
          return 'Admin Dashboard';
        case 'data':
          return 'Travel Authority Data';
        case 'tables':
          return 'Travel Authority Records';
        case 'cancelled':
          return 'Cancelled Travel Authorities';
        case 'search':
          return 'Search by ID';
        case 'edit':
          return 'Edit Travel Authority';
        case 'approval-monitoring':
          return 'Approval Monitoring';
        case 'travel-analytics':
          return 'Travel Analytics';
        case 'destination-map':
          return 'Destination Map';
        case 'approval-analytics':
          return 'Approval Analytics';
        case 'processing-performance':
          return 'Processing Performance';
        case 'user-management':
          return 'User Management';
        case 'audit-logs':
          return 'Audit Logs';
        default:
          return 'Admin Dashboard';
      }
    }
    if (pathname.startsWith('/staff')) {
      switch (currentTab) {
        case 'pending': return 'Pending Approvals';
        case 'history': return 'Approval History';
        case 'review': return 'Review TA Request';
        default: return 'Dashboard';
      }
    }
    if (pathname.startsWith('/account-manager')) {
      switch (currentTab) {
        case 'accounts': return 'View Accounts';
        case 'create-account': return 'Create Account';
        case 'password-management': return 'Password Management';
        case 'configuration': return 'Configuration';
        case 'create-travel': return 'Create Travel Authority';
        default: return 'Dashboard';
      }
    }
    
    switch (currentTab) {
      case 'create': return 'Create Travel Authority';
      case 'requests': return 'My Travel Authorities';
      case 'schedule': return 'Travel Schedule';
      case 'notifications': return 'Notification Center';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex font-sans text-slate-800">
      {/* Sidebar - Matching ETAPS PDF Reference */}
      <aside className="w-64 bg-[#0F4C2E] text-white flex flex-col shadow-xl z-20 shrink-0">
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-emerald-900/40">
          <img
            src="/taps-logo.png"
            alt="TAPS Logo"
            className="w-10 h-10 object-contain drop-shadow-md shrink-0"
          />
          <div>
            <h1 className="font-black text-base tracking-wider text-white leading-none">ETAPS</h1>
            <p className="text-[9px] font-bold text-emerald-300 tracking-wider uppercase mt-1">DENR-PENRO</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {isAdminPage ? (
            <div className="space-y-4">
              {/* Group 1: OVERVIEW */}
              <div>
                <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1.5">OVERVIEW</p>
                <div className="space-y-0.5">
                  {adminNavOverview.map((link) => {
                    const isActive = currentTab === link.id || (currentTab === 'dashboard' && link.id === 'home');
                    return (
                      <Link
                        key={link.id}
                        href={link.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs tracking-wide transition-all ${
                          isActive
                            ? 'bg-[#2E6F4E] text-white shadow-2xs font-semibold'
                            : 'text-emerald-100/75 hover:bg-[#165034] hover:text-white font-normal'
                        }`}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: ANALYTICS & MAPS */}
              <div>
                <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1.5">ANALYTICS & MAPS</p>
                <div className="space-y-0.5">
                  {adminNavAnalytics.map((link) => {
                    const isActive = currentTab === link.id;
                    return (
                      <Link
                        key={link.id}
                        href={link.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs tracking-wide transition-all ${
                          isActive
                            ? 'bg-[#2E6F4E] text-white shadow-2xs font-semibold'
                            : 'text-emerald-100/75 hover:bg-[#165034] hover:text-white font-normal'
                        }`}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Group 3: ADMINISTRATION */}
              <div>
                <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1.5">ADMINISTRATION</p>
                <div className="space-y-0.5">
                  {adminNavAdmin.map((link) => {
                    const isActive = currentTab === link.id;
                    return (
                      <Link
                        key={link.id}
                        href={link.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs tracking-wide transition-all ${
                          isActive
                            ? 'bg-[#2E6F4E] text-white shadow-2xs font-semibold'
                            : 'text-emerald-100/75 hover:bg-[#165034] hover:text-white font-normal'
                        }`}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : isAccountManagerPage ? (
            <div>
              <p className="px-4 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 mb-2">ACCOUNT MANAGEMENT</p>
              <div className="space-y-1.5">
                {accountManagerNavLinks.map((link) => {
                  const isActive = currentTab === link.id || (currentTab === 'dashboard' && link.id === 'dashboard');
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-xs tracking-wide transition-all ${
                        isActive
                          ? 'bg-[#2E6F4E] text-white shadow-md font-bold'
                          : 'text-emerald-100/80 hover:bg-[#195938] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {link.icon}
                        <span>{link.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : isStaffPage ? (
            <div>
              <p className="px-4 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 mb-2">MAIN MENU</p>
              <div className="space-y-1.5">
                {staffNavLinks.map((link) => {
                  const isActive = currentTab === link.id || (currentTab === 'dashboard' && link.id === 'dashboard');
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('taps:reset-views'));
                        }
                      }}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-xs tracking-wide transition-all ${
                        isActive
                          ? 'bg-[#2E6F4E] text-white shadow-md font-bold'
                          : 'text-emerald-100/80 hover:bg-[#195938] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {link.icon}
                        <span>{link.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : isEmployee ? (
            <div className="space-y-1.5">
              {employeeNavLinks.map((link) => {
                const isActive = pathname.startsWith('/employee') && currentTab === link.id;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('taps:reset-views'));
                      }
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-xs tracking-wide transition-all ${
                      isActive
                        ? 'bg-[#2E6F4E] text-white shadow-md font-bold'
                        : 'text-emerald-100/80 hover:bg-[#195938] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {link.icon}
                      <span>{link.label}</span>
                    </div>
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#E63946] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : null}

          {/* Other Roles Navigation */}
          {!isStaffPage && !isAccountManagerPage && !isAdminPage &&
            otherNavLinks
              .filter((link) => link.roles.includes(role))
              .map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('taps:reset-views'));
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${
                      isActive
                        ? 'bg-[#2E6F4E] text-white shadow-md font-bold'
                        : 'text-emerald-100/80 hover:bg-[#195938] hover:text-white'
                    }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              })}
        </nav>

        {/* User Card & Sign Out (Matching PDF Bottom Sidebar) */}
        <div className="p-4 border-t border-emerald-900/40 bg-[#0B3B24]">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-rose-900/80 text-emerald-100 hover:text-rose-100 text-xs font-bold transition-all border border-emerald-800/60 shadow-xs"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar (High z-index to cleanly overlay all page elements) */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shadow-xs sticky top-0 z-50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {/* VIEW AS Role Selector Dropdown (Matching PDF Header) */}
            {isStaffPage && (
              <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400">VIEW AS:</span>
                <select
                  value={viewRole}
                  onChange={(e) => setViewRole(e.target.value)}
                  aria-label="View as Role"
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="Verifier">Verifier</option>
                  <option value="Approver">Approver</option>
                  <option value="Section Chief">Section Chief</option>
                  <option value="Division Chief">Division Chief</option>
                  <option value="Head of PENRO">Head of PENRO</option>
                </select>
              </div>
            )}

            {/* Revised Interactive Notification Bell Dropdown (Matching Reference) */}
            <NotificationBellDropdown
              unreadCount={unreadNotifications}
              notifications={notificationsList}
              onMarkAllRead={handleMarkAllRead}
              onMarkSingleRead={handleMarkSingleRead}
              onViewNotification={handleViewNotification}
              currentTab={currentTab}
              dashboardHref={
                pathname.startsWith('/staff')
                  ? '/staff?tab=dashboard'
                  : pathname.startsWith('/account-manager')
                  ? '/account-manager?tab=dashboard'
                  : pathname.startsWith('/admin')
                  ? '/admin?tab=home'
                  : '/employee?tab=dashboard'
              }
              notificationCenterHref={
                pathname.startsWith('/staff')
                  ? '/staff?tab=notifications'
                  : pathname.startsWith('/account-manager')
                  ? '/account-manager?tab=dashboard'
                  : pathname.startsWith('/admin')
                  ? '/admin?tab=home'
                  : '/employee?tab=notifications'
              }
            />

            {/* Top User Badge with Google Account-style Profile Management Dropdown */}
            <div className="pl-2 sm:pl-3 border-l border-slate-200">
              <ProfileDropdown viewRole={isStaffPage ? viewRole : undefined} />
            </div>
          </div>
        </header>

        {/* Real-time Stacked Pop-up Notification Toasts for Employee and Verifiers */}
        <NotificationToastStack
          popups={popups}
          onDismiss={handleDismissPopup}
          onDismissAll={handleDismissAllPopups}
          onView={handleViewNotification}
        />

        {/* Page Content View */}
        <main className="flex-1 p-6 sm:p-8 w-full overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-xs text-slate-500">Loading ETAPS Portal...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
