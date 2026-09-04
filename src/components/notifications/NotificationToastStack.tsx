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
  const date = new Date(dateInput);
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
  if (text.includes('pending') || text.includes('review') || text.includes('submitted') || text.includes('request')) {
    return {
      theme: 'amber',
      bg: 'bg-amber-50/95',
      border: 'border-amber-200/90',
      badgeBg: 'bg-amber-600',
      badgeText: 'text-amber-700',
      iconText: 'text-amber-600',
      tag: 'New TA Request',
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
      className="pointer-events-auto w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl flex flex-col group relative"
    >
      {/* Progress Bar (Smooth CSS animation that pauses on hover) */}
      <div className="h-1 bg-slate-100 w-full overflow-hidden">
        <div
          className={`h-full origin-left transition-all ${
            category.theme === 'emerald'
              ? 'bg-[#0B5A3A]'
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

      <div className="p-3.5 sm:p-4 flex items-start gap-3">
        {/* Category Icon Badge */}
        <div
          className={`w-8 h-8 rounded-xl ${category.badgeBg} flex items-center justify-center shrink-0 shadow-sm`}
        >
          {category.icon}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                category.theme === 'emerald'
                  ? 'bg-emerald-100 text-emerald-800'
                  : category.theme === 'rose'
                  ? 'bg-rose-100 text-rose-800'
                  : category.theme === 'sky'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {category.tag}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {formatShortRelativeTime(item.createdAt)}
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug truncate">
            {item.title}
          </h4>

          {/* Brief Content - Truncated snippet */}
          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
            {item.message}
          </p>

          {/* Action Row */}
          {onView && (
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onView(item)}
                className="text-[10px] font-bold text-[#0B5A3A] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
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
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
      className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none transition-all"
    >
      {/* Top Header if Multiple Popups Stacked */}
      {popups.length > 1 && (
        <div className="pointer-events-auto flex items-center justify-between px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-xl text-white text-[10px] font-bold shadow-lg animate-fade-in mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{popups.length} New Notifications</span>
          </div>
          {onDismissAll && (
            <button
              type="button"
              onClick={onDismissAll}
              className="text-slate-300 hover:text-white underline cursor-pointer"
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
