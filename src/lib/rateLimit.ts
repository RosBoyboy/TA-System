/**
 * Rate Limiting Module for TOPS Authentication
 * Protects against brute-force attacks, credential stuffing, and login spam bots.
 * 
 * Implements a sliding-window counter with dual-key tracking:
 * 1. IP-based limit: Prevents an attacker from spraying passwords against multiple accounts.
 * 2. Account-based limit: Prevents distributed attacks against a single user account.
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

// In-memory sliding-window store
const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_DURATION_MS = 5 * 60 * 1000; // 5-minute sliding window
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10-minute cooldown if exceeded

/**
 * Checks if a given key (IP or username) is currently rate-limited.
 */
export function checkRateLimit(key: string): {
  isBlocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) {
    return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS, retryAfterSeconds: 0 };
  }

  // If currently locked out
  if (record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isBlocked: true, remainingAttempts: 0, retryAfterSeconds };
  }

  // If window has expired, reset
  if (now - record.firstAttemptAt > WINDOW_DURATION_MS) {
    rateLimitStore.delete(key);
    return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS, retryAfterSeconds: 0 };
  }

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts);
  return { isBlocked: remainingAttempts <= 0, remainingAttempts, retryAfterSeconds: 0 };
}

/**
 * Records a failed login attempt for a given key.
 * Triggers a lockout if MAX_FAILED_ATTEMPTS is reached.
 */
export function recordFailedAttempt(key: string): {
  isLocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record || now - record.firstAttemptAt > WINDOW_DURATION_MS) {
    record = {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: 0,
    };
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    rateLimitStore.set(key, record);
    const retryAfterSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return { isLocked: true, remainingAttempts: 0, retryAfterSeconds };
  }

  rateLimitStore.set(key, record);
  return {
    isLocked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.attempts,
    retryAfterSeconds: 0,
  };
}

/**
 * Clears failed attempts upon a successful login.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
