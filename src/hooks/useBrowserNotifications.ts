import { useCallback, useEffect, useRef } from 'react';
import { getNotificationSettings } from './useNotificationSettings';

interface BrowserNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

/**
 * Hook for managing browser notifications
 * Shows notifications when tab is inactive
 */
export const useBrowserNotifications = () => {
  const permissionRef = useRef<NotificationPermission>('default');

  // Check and update permission status
  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('[BrowserNotifications] Not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('[BrowserNotifications] Permission request failed:', error);
      return false;
    }
  }, []);

  // Show notification
  const showNotification = useCallback((options: BrowserNotificationOptions) => {
    // Check if notifications are enabled in settings
    const settings = getNotificationSettings();
    if (!settings.soundEnabled) {
      return; // User has disabled notifications
    }

    // Only show if tab is not focused
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      return;
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        tag: options.tag, // Prevents duplicate notifications with same tag
        requireInteraction: false,
        silent: true, // We play our own sound
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle click
      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          notification.close();
          options.onClick?.();
        };
      } else {
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch (error) {
      console.error('[BrowserNotifications] Failed to show notification:', error);
    }
  }, []);

  return {
    isSupported: 'Notification' in window,
    permission: permissionRef.current,
    requestPermission,
    showNotification,
  };
};

// Singleton for non-React contexts
let notificationInstance: {
  show: (options: BrowserNotificationOptions) => void;
} | null = null;

export const showBrowserNotification = (options: BrowserNotificationOptions) => {
  // Check if notifications are enabled in settings
  try {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.soundEnabled === false) {
        return; // Notifications disabled
      }
    }
  } catch {
    // Ignore
  }

  // Only show if tab is not focused
  if (document.visibilityState === 'visible' && document.hasFocus()) {
    return;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.png',
      tag: options.tag,
      requireInteraction: false,
      silent: true,
    });

    setTimeout(() => notification.close(), 5000);

    notification.onclick = () => {
      window.focus();
      notification.close();
      options.onClick?.();
    };
  } catch (error) {
    console.error('[BrowserNotifications] Failed:', error);
  }
};

export default useBrowserNotifications;
