'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

/**
 * useRealtimeNotifications
 *
 * Subscribes to Supabase Realtime INSERT events on the "Notification" table
 * filtered by the given userId. When a new notification arrives, it dispatches
 * the existing `taps:new-notification` CustomEvent so the layout's existing
 * listener handles toast popups and badge updates automatically.
 *
 * Also dispatches `taps:refresh-notifications` so child pages (employee, staff)
 * can refresh their local notification lists.
 */
export function useRealtimeNotifications(userId: string | null | undefined) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    if (!userId || !supabaseUrl || !supabaseKey) return;

    // Create a dedicated Supabase client for realtime (browser-side)
    if (!clientRef.current) {
      clientRef.current = createClient(supabaseUrl, supabaseKey, {
        realtime: {
          params: {
            eventsPerSecond: 2,
          },
        },
      });
    }

    const supabase = clientRef.current;

    // Subscribe to INSERT events on the Notification table for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            id: string;
            title: string;
            message: string;
            createdAt: string;
            requestId?: string | null;
            type?: string;
            isRead?: boolean;
            userId: string;
          };

          // Normalize the createdAt timestamp from the DB payload.
          // Supabase Realtime may return timestamps WITHOUT timezone info
          // (e.g. "2026-09-26 16:15:30") which JavaScript's new Date() would
          // interpret as local time instead of UTC, causing an 8h offset for
          // UTC+8 users. We ensure proper UTC parsing here.
          let normalizedCreatedAt = newRow.createdAt;
          if (normalizedCreatedAt && typeof normalizedCreatedAt === 'string') {
            // If the timestamp has no timezone indicator (no Z, +, or T...Z pattern),
            // append 'Z' to force UTC interpretation
            const hasTimezone = /Z$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(normalizedCreatedAt.trim());
            if (!hasTimezone) {
              // Replace space with T for ISO format and append Z
              normalizedCreatedAt = normalizedCreatedAt.trim().replace(' ', 'T') + 'Z';
            }
          }

          // For the immediate toast popup, use the current client time since
          // this is a real-time push — we know it literally just happened
          const clientNow = new Date().toISOString();

          // Dispatch the existing custom event that layout.tsx already listens for
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('taps:new-notification', {
                detail: {
                  id: newRow.id,
                  title: newRow.title || 'New Notification',
                  message: newRow.message || '',
                  createdAt: clientNow,
                  requestId: newRow.requestId || null,
                  type: newRow.type || 'GENERAL',
                  isRead: newRow.isRead ?? false,
                },
              })
            );

            // Also trigger a full refresh so child pages update their lists
            window.dispatchEvent(new CustomEvent('taps:refresh-notifications'));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Subscribed to Notification changes for user:', userId);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] ⚠️ Channel error — will auto-reconnect');
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime] ⏱️ Subscription timed out — retrying...');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);
}
