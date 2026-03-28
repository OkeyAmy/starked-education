import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { subscribeToPush } from '../lib/pushNotifications';

export type NotificationCategory =
  | 'course'
  | 'message'
  | 'system'
  | 'achievement';

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  timestamp: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface NotificationPreferences {
  categories: {
    [key in NotificationCategory]: {
      enabled: boolean;
      sound: boolean;
      desktop: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

const defaultPreferences: NotificationPreferences = {
  categories: {
    course: { enabled: true, sound: true, desktop: true },
    message: { enabled: true, sound: true, desktop: true },
    system: { enabled: true, sound: false, desktop: true },
    achievement: { enabled: true, sound: true, desktop: false },
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(defaultPreferences);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    NotificationCategory | 'all'
  >('all');
  const [isLoading, setIsLoading] = useState(false);

  const { socket } = useWebSocket();

  // Fetch notifications and preferences from backend
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [notifsRes, prefsRes] = await Promise.all([
        fetch(`/api/notifications/${userId}`),
        fetch(`/api/notifications/${userId}/preferences`),
      ]);

      if (notifsRes.ok) {
        const notifData = await notifsRes.json();
        // Ensure timestamps are Date objects
        setNotifications(
          notifData.data.notifications.map((n: Notification) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }))
        );
      }

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        setPreferences(prefsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for real-time notifications via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      // Ensure timestamp is a Date object
      const newNotification = {
        ...notification,
        timestamp: new Date(notification.timestamp),
      };
      setNotifications((prev: Notification[]) => [newNotification, ...prev]);

      // Handle browser notification & sound based on preferences
      const categoryPrefs = preferences.categories[notification.category];
      if (categoryPrefs?.enabled) {
        // Check quiet hours
        if (preferences.quietHours.enabled) {
          const now = new Date();
          const hours = ('0' + now.getHours()).slice(-2);
          const minutes = ('0' + now.getMinutes()).slice(-2);
          const currentTime = `${hours}:${minutes}`;
          const { start, end } = preferences.quietHours;

          // Simple check: if current time is between start and end (assuming start < end for same day)
          // This logic might need to be more robust for overnight quiet hours
          if (start < end && currentTime >= start && currentTime <= end) {
            return; // During quiet hours, don't show notifications
          } else if (
            start > end &&
            (currentTime >= start || currentTime <= end)
          ) {
            return; // Overnight quiet hours
          }
        }

        if (categoryPrefs.sound) {
          const audio = new Audio('/notification-sound.mp3'); // Ensure this path is correct
          audio.play().catch((e) => console.error('Error playing sound:', e));
        }

        if (
          categoryPrefs.desktop &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
          });
        }
      }
    };

    socket.on('notification', handleNewNotification);
    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket, preferences]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/notifications/${id}/read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        if (res.ok) {
          setNotifications((prev: Notification[]) =>
            prev.map((notification: Notification) =>
              notification.id === id
                ? { ...notification, isRead: true }
                : notification
            )
          );
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    [userId]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setNotifications((prev: Notification[]) =>
          prev.map((notification: Notification) => ({
            ...notification,
            isRead: true,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [userId]);

  const removeNotification = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/notifications/${id}?userId=${userId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setNotifications((prev: Notification[]) =>
            prev.filter((notification: Notification) => notification.id !== id)
          );
        }
      } catch (error) {
        console.error('Failed to remove notification:', error);
      }
    },
    [userId]
  );

  const clearAllNotifications = useCallback(async () => {
    // In a real app, add a DELETE /api/notifications/all endpoint
    // For now, just clear locally
    setNotifications([]);
    // Optionally, send a request to the backend to clear all for the user
    // try {
    //   await fetch(`/api/notifications/clear-all?userId=${userId}`, { method: 'DELETE' });
    // } catch (error) {
    //   console.error('Failed to clear all notifications on server:', error);
    // }
  }, []);

  const updatePreferences = useCallback(
    async (newPreferences: Partial<NotificationPreferences>) => {
      const updated = {
        ...preferences,
        ...newPreferences,
        categories: {
          ...preferences.categories,
          ...(newPreferences.categories || {}),
        },
        quietHours: {
          ...preferences.quietHours,
          ...(newPreferences.quietHours || {}),
        },
      };

      setPreferences(updated);

      try {
        await fetch(`/api/notifications/${userId}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      } catch (error) {
        console.error('Failed to update preferences on server:', error);
      }
    },
    [userId, preferences]
  );

  const filteredNotifications = notifications.filter(
    (notification: Notification) => {
      if (selectedCategory === 'all') return true;
      return notification.category === selectedCategory;
    }
  );

  const unreadCount = notifications.filter(
    (n: Notification) => !n.isRead
  ).length;

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    notifications: filteredNotifications,
    allNotifications: notifications,
    unreadCount,
    preferences,
    isOpen,
    selectedCategory,
    isLoading,
    setIsOpen,
    setSelectedCategory,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    updatePreferences,
    refresh: fetchData,
    subscribeToPushNotifications: subscribeToPush,
  };
};
