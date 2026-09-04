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
  const date = new Date(dateInput);
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
      {/* Revised Notification Bell Button */}
      <button
        type="button"
        onClick={handleBellButtonClick}
        aria-label={isNotificationsTab ? 'Back to Dashboard' : 'Open notifications'}
        title={isNotificationsTab ? 'Back to Dashboard' : 'Notifications'}
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer ${
          isOpen || isNotificationsTab ? 'bg-slate-100 text-slate-900 ring-2 ring-emerald-500/20' : ''
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Red Badge Dot / Counter (Matching User Reference) */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#E63946] text-white text-[9px] font-extrabold ring-2 ring-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Popover Dropdown (High z-index, Solid background, Clean scrollbar) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-200 isolate">
          {/* Header */}
          <div className="p-4 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F4C2E] text-[10px] font-extrabold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-[11px] font-bold text-[#0B5A3A] hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Close popover"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Notification Items List with Custom Sleek Scrollbar */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 bg-white [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-50">
            {notifications && notifications.length > 0 ? (
              notifications.slice(0, 8).map((notif) => {
                const iconInfo = getIconForNotification(notif.title, notif.message);
                const isUnread = notif.isRead === false;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                      isUnread ? 'bg-emerald-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Unread Blue Indicator Dot */}
                    {isUnread && (
                      <span className="absolute left-2 top-5 w-1.5 h-1.5 rounded-full bg-[#0B5A3A]"></span>
                    )}

                    {/* Icon Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl ${iconInfo.bg} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                    >
                      {iconInfo.icon}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-baseline justify-between gap-1.5">
                        <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 space-y-1 bg-white">
                <svg className="w-8 h-8 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="font-semibold text-slate-600">No notifications yet</p>
                <p className="text-[11px]">You are all caught up on travel authorities.</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-slate-50 flex items-center justify-between text-xs font-bold text-[#0B5A3A]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(dashboardHref);
              }}
              className="hover:underline flex items-center gap-1 cursor-pointer text-slate-600 hover:text-slate-900"
            >
              <span>← Back to Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(notificationCenterHref);
              }}
              className="hover:underline flex items-center gap-1 cursor-pointer text-[#0B5A3A]"
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
