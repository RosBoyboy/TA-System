'use client';

import React, { useState, useEffect } from 'react';

export interface NotificationPopupItem {
  id: string;
  title: string;
  message: string;
  createdAt: string | Date;
  requestId?: string | null;
  type?: string;
  isRead?: boolean;
}

interface NotificationToastStackProps {
  popups: NotificationPopupItem[];
  onDismiss: (id: string) => void;
  onDismissAll?: () => void;
  onView?: (item: NotificationPopupItem) => void;
}

function formatShortRelativeTime(dateInput: string | Date): string {
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationCategory(title: string, message: string) {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes('approved') || text.includes('congratulations')) {
    return {
      theme: 'emerald',
      bg: 'bg-emerald-50/95',
      border: 'border-emerald-200/90',
      badgeBg: 'bg-emerald-600',
      badgeText: 'text-emerald-700',
      iconText: 'text-emerald-600',
      tag: 'Approved',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
    };
  }
  if (text.includes('reject') || text.includes('return') || text.includes('disapprove') || text.includes('overdue')) {
    return {
      theme: 'rose',
      bg: 'bg-rose-50/95',
      border: 'border-rose-200/90',
      badgeBg: 'bg-rose-600',
      badgeText: 'text-rose-700',
      iconText: 'text-rose-600',
      tag: 'Returned',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    };
  }
  if (text.includes('endors') || text.includes('endorsed') || text.includes('forwarded')) {
    return {
      theme: 'sky',
      bg: 'bg-sky-50/95',
      border: 'border-sky-200/90',
      badgeBg: 'bg-sky-600',
      badgeText: 'text-sky-700',
      iconText: 'text-sky-600',
      tag: 'Endorsement',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      ),
    };
  }
  if (text.includes('pending') || text.includes('review') || text.includes('submitted') || text.includes('request') || text.includes('order')) {
    return {
      theme: 'amber',
      bg: 'bg-amber-50/95',
      border: 'border-amber-200/90',
      badgeBg: 'bg-amber-600',
      badgeText: 'text-amber-700',
      iconText: 'text-amber-600',
      tag: 'New TO Request',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    };
  }
  return {
    theme: 'emerald',
    bg: 'bg-white/95',
    border: 'border-slate-200/90',
    badgeBg: 'bg-[#0B5A3A]',
    badgeText: 'text-[#0B5A3A]',
    iconText: 'text-[#0B5A3A]',
    tag: 'Notice',
    icon: (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  };
}

function SingleToastCard({
  item,
  onDismiss,
  onView,
}: {
  item: NotificationPopupItem;
  onDismiss: (id: string) => void;
  onView?: (item: NotificationPopupItem) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const category = getNotificationCategory(item.title, item.message);
  const durationMs = 8000; // 8 seconds auto-dismiss

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isPaused, item.id, onDismiss, durationMs]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="pointer-events-auto w-full max-w-sm bg-[#FFFFFF]/95 backdrop-blur-md rounded-[8px] shadow-lg border border-[#E5E5E7] overflow-hidden transition-colors flex flex-col group relative"
    >
      {/* Progress Bar */}
      <div className="h-0.5 bg-[#F5F5F7] w-full overflow-hidden">
        <div
          className={`h-full origin-left ${
            category.theme === 'emerald'
              ? 'bg-[#1B4332]'
              : category.theme === 'rose'
              ? 'bg-rose-500'
              : category.theme === 'sky'
              ? 'bg-sky-500'
              : 'bg-amber-500'
          }`}
          style={{
            animation: `shrinkWidth ${durationMs}ms linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>

      <div className="p-3 flex items-start gap-2.5">
        {/* Category Icon Badge */}
        <div
          className={`w-7 h-7 rounded-[6px] ${category.badgeBg} flex items-center justify-center shrink-0`}
        >
          {category.icon}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`h-5 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 rounded-[4px] ${
                category.theme === 'emerald'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : category.theme === 'rose'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  : category.theme === 'sky'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200/80'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/80'
              }`}
            >
              {category.tag}
            </span>
            <span className="text-[10px] text-[#86868B] font-normal">
              {formatShortRelativeTime(item.createdAt)}
            </span>
          </div>

          <h4 className="text-[12px] font-semibold text-[#1D1D1F] mt-1 leading-snug truncate">
            {item.title}
          </h4>

          <p className="text-[11px] text-[#86868B] mt-0.5 line-clamp-2 leading-snug">
            {item.message}
          </p>

          {onView && (
            <div className="mt-1.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onView(item)}
                className="text-[11px] font-medium text-[#1B4332] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Request</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Dismiss notification"
          className="absolute top-2.5 right-2.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] p-1 rounded-[4px] transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function NotificationToastStack({
  popups,
  onDismiss,
  onDismissAll,
  onView,
}: NotificationToastStackProps) {
  if (!popups || popups.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-16 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {/* Top Header if Multiple Popups Stacked */}
      {popups.length > 1 && (
        <div className="pointer-events-auto flex items-center justify-between px-3 py-1.5 bg-[#1D1D1F]/90 backdrop-blur-md rounded-[6px] text-white text-[11px] font-medium shadow-md mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{popups.length} New Notifications</span>
          </div>
          {onDismissAll && (
            <button
              type="button"
              onClick={onDismissAll}
              className="text-[#A1A1A6] hover:text-white underline cursor-pointer"
            >
              Dismiss All
            </button>
          )}
        </div>
      )}

      {/* Stacked Cards */}
      {popups.map((item) => (
        <SingleToastCard
          key={item.id}
          item={item}
          onDismiss={onDismiss}
          onView={onView}
        />
      ))}
    </div>
  );
}
