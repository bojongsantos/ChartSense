"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from "@/infrastructure/persistence/notifications-api-client";

/** How often the bell re-checks for new notifications. */
const POLL_MS = 60_000;

export interface NotificationsState {
  notifications: NotificationDto[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(enabled: boolean): NotificationsState {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // No state is touched before the first await: background polls must stay
  // silent, and only the very first fetch resolves the loading placeholder.
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const feed = await fetchNotifications();
      setNotifications(feed.notifications);
      setUnreadCount(feed.unreadCount);
    } catch {
      // A signed-out or offline user simply has no feed to show.
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    // Deferred so the first fetch lands after the commit, not during it.
    const initial = window.setTimeout(() => void refresh(), 0);
    const poll = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
    };
  }, [enabled, refresh]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic: the badge should drop the moment the row is opened.
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((previous) => Math.max(0, previous - 1));
    await markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications((previous) =>
      previous.map((item) => (item.readAt ? item : { ...item, readAt: now })),
    );
    setUnreadCount(0);
    await markAllNotificationsRead();
  }, []);

  // A signed-out user has no feed at all, rather than a stale one held over
  // from the previous session.
  return {
    notifications: enabled ? notifications : [],
    unreadCount: enabled ? unreadCount : 0,
    loading,
    refresh,
    markRead,
    markAllRead,
  };
}
