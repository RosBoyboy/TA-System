/**
 * Standardized Date and Time Formatting Utilities for ETAPS
 * Correctly parses PostgreSQL/Supabase UTC timestamps and formats them for Philippine Time (UTC+8)
 */

export function parseUtcDate(dateVal?: string | Date | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

  let s = String(dateVal).trim();
  if (!s) return null;

  // If format is "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS.mmm" without timezone, treat as UTC
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(s)) {
    // Has T but no Z or offset (+08:00)
    s = s + 'Z';
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns formatted date (e.g. "Aug 28, 2026")
 */
export function formatDateDisplay(dateVal?: string | Date | null): string {
  const d = parseUtcDate(dateVal);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns formatted time (e.g. "1:33 AM", "10:15 PM")
 */
export function formatTimeDisplay(dateVal?: string | Date | null): string {
  const d = parseUtcDate(dateVal);
  if (!d) return 'N/A';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns full date and time string (e.g. "Aug 28, 2026 at 1:33 AM")
 */
export function formatFullDateTimeDisplay(dateVal?: string | Date | null): string {
  const d = parseUtcDate(dateVal);
  if (!d) return 'N/A';
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Returns day heading for notification groups (e.g. "Friday, August 28, 2026")
 */
export function formatDayHeading(dateVal?: string | Date | null): string {
  const d = parseUtcDate(dateVal);
  if (!d) return 'Recent';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns humanized relative time (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
 */
export function formatRelativeTime(dateVal?: string | Date | null): string {
  const d = parseUtcDate(dateVal);
  if (!d) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateDisplay(d);
}

/**
 * Returns formatted date range (e.g. "Aug 28 – Sep 2, 2026")
 */
export function formatDateRangeShort(
  startDate?: string | Date | null,
  endDate?: string | Date | null
): string {
  if (!startDate || !endDate) return 'N/A';
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);
  if (!start || !end) return 'N/A';

  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}
