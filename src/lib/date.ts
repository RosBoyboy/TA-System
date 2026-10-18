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

/**
 * Normalizes any Date or ISO date string into a local "YYYY-MM-DD" calendar string.
 * Ensures consistent date-only comparison without timezone or timestamp offsets.
 */
export function toCalendarDateString(dateVal?: string | Date | null): string | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  const d = parseUtcDate(dateVal);
  if (!d) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a record date falls within [dateFrom, dateTo] (inclusive of start and end dates).
 * Handles:
 * - Empty dateFrom or dateTo (open-ended ranges)
 * - Single-day ranges (dateFrom === dateTo)
 * - Exact match on start date and end date
 * - Safe against database timestamps after midnight and timezone differences
 */
export function isDateWithinRange(
  recordDate?: string | Date | null,
  dateFrom?: string | null,
  dateTo?: string | null
): boolean {
  const target = toCalendarDateString(recordDate);
  if (!target) return false;

  const from = dateFrom ? toCalendarDateString(dateFrom) : null;
  const to = dateTo ? toCalendarDateString(dateTo) : null;

  if (from && target < from) return false;
  if (to && target > to) return false;

  return true;
}

/**
 * Returns Monday through Sunday calendar range for a reference date.
 */
export function getWeekDateRange(refDate?: Date | string | null): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const d = refDate ? (typeof refDate === 'string' ? parseUtcDate(refDate) || new Date() : refDate) : new Date();
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startStr = toCalendarDateString(monday) || '';
  const endStr = toCalendarDateString(sunday) || '';

  const label = monday.getFullYear() === sunday.getFullYear()
    ? `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return {
    startDate: startStr,
    endDate: endStr,
    label,
  };
}

/**
 * Checks whether a travel period [travelStart, travelEnd] overlaps with a filter period [periodStart, periodEnd].
 * Handles single-day travels, open-ended ranges, and multi-day travels.
 */
export function isTravelOverlappingPeriod(
  travelStart?: string | Date | null,
  travelEnd?: string | Date | null,
  periodStart?: string | Date | null,
  periodEnd?: string | Date | null
): boolean {
  const tFrom = toCalendarDateString(travelStart);
  if (!tFrom) return false;
  const tTo = toCalendarDateString(travelEnd) || tFrom;

  const pFrom = periodStart ? toCalendarDateString(periodStart) : null;
  const pTo = periodEnd ? toCalendarDateString(periodEnd) : null;

  if (pFrom && tTo < pFrom) return false;
  if (pTo && tFrom > pTo) return false;

  return true;
}


