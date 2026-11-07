'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationPopupItem } from './NotificationToastStack';

interface NotificationBellDropdownProps {
  unreadCount: number;
  notifications: NotificationPopupItem[];
  onMarkAllRead: () => Promise<void>;
  onMarkSingleRead: (id: string) => Promise<void>;
  onViewNotification?: (item: NotificationPopupItem) => void;
  notificationCenterHref: string;
  currentTab?: string;
  dashboardHref?: string;
}

function formatRelativeTime(dateInput: string | Date): string {
  let input = dateInput;
  // Supabase may return timestamps without timezone info (e.g. "2026-09-26 16:15:30")
  // which JavaScript interprets as local time instead of UTC. Normalize to ensure UTC parsing.
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const hasTimezone = /Z$|[+-]\d{2}(:\d{2})?$/.test(trimmed);
    if (!hasTimezone && trimmed.length >= 19) {
      input = trimmed.replace(' ', 'T') + 'Z';
    }
  }
  const date = new Date(input);
  if (isNaN(date.getTime())) return 'Just now';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getIconForNotification(title: string, message: string) {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes('approved') || text.includes('congratulations')) {
    return {
      bg: 'bg-emerald-100 text-emerald-700',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
    };
  }
  if (text.includes('reject') || text.includes('return') || text.includes('disapprove') || text.includes('overdue')) {
    return {
      bg: 'bg-rose-100 text-rose-700',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    };
  }
  if (text.includes('endors') || text.includes('endorsed') || text.includes('forwarded')) {
    return {
      bg: 'bg-sky-100 text-sky-700',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      ),
    };
  }
  if (text.includes('pending') || text.includes('review') || text.includes('submitted') || text.includes('request')) {
    return {
      bg: 'bg-amber-100 text-amber-700',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    };
  }
  return {
    bg: 'bg-emerald-50 text-[#0B5A3A]',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  };
}

export default function NotificationBellDropdown({
  unreadCount,
  notifications,
  onMarkAllRead,
  onMarkSingleRead,
  onViewNotification,
  notificationCenterHref,
  currentTab,
  dashboardHref = '/employee?tab=dashboard',
}: NotificationBellDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isNotificationsTab = currentTab === 'notifications';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: NotificationPopupItem) => {
    if (!notif.isRead) {
      await onMarkSingleRead(notif.id);
    }
    setIsOpen(false);

    if (onViewNotification) {
      onViewNotification(notif);
      return;
    }

    // Smart routing based on notification content
    if (notificationCenterHref.startsWith('/staff')) {
      const isApproved = notif.title.toLowerCase().includes('approved');
      router.push(isApproved ? '/staff?tab=history' : '/staff?tab=pending');
    } else {
      router.push('/employee?tab=requests');
    }
  };

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onMarkAllRead();
  };

  const handleBellButtonClick = () => {
    if (isNotificationsTab) {
      // If user is currently on the Notifications page, clicking the notification icon takes them back to Dashboard
      router.push(dashboardHref);
      setIsOpen(false);
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* macOS HIG Toolbar Notification Bell Button */}
      <button
        type="button"
        onClick={handleBellButtonClick}
        aria-label={isNotificationsTab ? 'Back to Dashboard' : 'Open notifications'}
        title={isNotificationsTab ? 'Back to Dashboard' : 'Notifications'}
        aria-expanded={isOpen}
        className={`relative w-8 h-8 flex items-center justify-center rounded-[6px] text-[#86868B] hover:bg-[#F2F2F7] hover:text-[#1D1D1F] transition-colors cursor-pointer ${
          isOpen || isNotificationsTab ? 'bg-[#F2F2F7] text-[#1D1D1F]' : ''
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Red Badge Dot / Counter */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-[#E63946] text-white text-[9px] font-semibold ring-1 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* macOS HIG Notification Popover Dropdown with DENR Header */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-[#FFFFFF] rounded-[8px] shadow-xl border border-[#E5E5E7] z-[100] overflow-hidden divide-y divide-[#E5E5E7] isolate">
          {/* Header */}
          <div className="h-9 px-3.5 bg-[#0F4C2E] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-semibold text-white uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="h-4 inline-flex items-center px-1.5 rounded-[4px] bg-emerald-800 text-emerald-200 text-[10px] font-semibold border border-emerald-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push(notificationCenterHref);
                }}
                className="text-[11px] font-medium text-emerald-200 hover:text-white hover:underline cursor-pointer"
              >
                See All
              </button>
              {unreadCount > 0 && (
                <>
                  <span className="w-px h-3 bg-emerald-800"></span>
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="text-[11px] font-medium text-emerald-200 hover:text-white hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-[4px] hover:bg-emerald-800/60 transition-colors cursor-pointer"
                aria-label="Close popover"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Notification Items List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#E5E5E7] bg-[#FFFFFF]">
            {notifications && notifications.length > 0 ? (
              notifications.slice(0, 8).map((notif) => {
                const iconInfo = getIconForNotification(notif.title, notif.message);
                const isUnread = notif.isRead === false;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-3.5 py-2.5 hover:bg-[#F2F2F7] transition-colors cursor-pointer flex items-start gap-2.5 relative ${
                      isUnread ? 'bg-[#1B4332]/[0.03]' : 'bg-[#FFFFFF]'
                    }`}
                  >
                    {isUnread && (
                      <span className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-[#1B4332]"></span>
                    )}

                    {/* Icon Badge */}
                    <div
                      className={`w-7 h-7 rounded-[6px] ${iconInfo.bg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      {iconInfo.icon}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-baseline justify-between gap-1.5">
                        <h4 className={`text-[12px] truncate ${isUnread ? 'font-semibold text-[#1D1D1F]' : 'font-medium text-[#1D1D1F]'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-[#86868B] shrink-0 font-normal">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#86868B] mt-0.5 line-clamp-2 leading-snug">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-[12px] text-[#86868B] space-y-1 bg-[#FFFFFF]">
                <svg className="w-6 h-6 mx-auto text-[#86868B]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="font-medium text-[#1D1D1F]">No notifications yet</p>
                <p className="text-[11px]">You are all caught up on travel orders.</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="h-8 px-3.5 bg-[#F5F5F7] flex items-center justify-between text-[11px] font-medium text-[#1B4332]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(dashboardHref);
              }}
              className="hover:underline flex items-center gap-1 cursor-pointer text-[#86868B] hover:text-[#1D1D1F]"
            >
              <span>← Back to Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(notificationCenterHref);
              }}
              className="hover:underline flex items-center gap-1 cursor-pointer text-[#1B4332]"
            >
              <span>Full Center</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
