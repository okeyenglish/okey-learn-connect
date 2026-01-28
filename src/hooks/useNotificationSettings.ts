import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'notification_settings';

export interface NotificationSettings {
  soundEnabled: boolean;
  soundVolume: number; // 0-1
  vibrationEnabled: boolean;
  missedCallNotificationsEnabled: boolean;
  mutedMessengers: string[]; // e.g., ['whatsapp', 'telegram', 'max']
  mutedChats: string[]; // client IDs
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
  vibrationEnabled: true,
  missedCallNotificationsEnabled: true,
  mutedMessengers: [],
  mutedChats: [],
};

/**
 * Hook for managing notification settings (stored in localStorage)
 * These are per-user/browser settings
 */
export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.warn('[useNotificationSettings] Failed to load settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('[useNotificationSettings] Failed to save settings:', error);
      }
      return updated;
    });
  }, []);

  const toggleSound = useCallback(() => {
    saveSettings({ soundEnabled: !settings.soundEnabled });
  }, [settings.soundEnabled, saveSettings]);

  const setVolume = useCallback((volume: number) => {
    saveSettings({ soundVolume: Math.max(0, Math.min(1, volume)) });
  }, [saveSettings]);

  const toggleVibration = useCallback(() => {
    saveSettings({ vibrationEnabled: !settings.vibrationEnabled });
  }, [settings.vibrationEnabled, saveSettings]);

  const toggleMissedCallNotifications = useCallback(() => {
    saveSettings({ missedCallNotificationsEnabled: !settings.missedCallNotificationsEnabled });
  }, [settings.missedCallNotificationsEnabled, saveSettings]);

  const toggleMessengerMute = useCallback((messenger: string) => {
    const current = settings.mutedMessengers || [];
    const updated = current.includes(messenger)
      ? current.filter(m => m !== messenger)
      : [...current, messenger];
    saveSettings({ mutedMessengers: updated });
  }, [settings.mutedMessengers, saveSettings]);

  const toggleChatMute = useCallback((clientId: string) => {
    const current = settings.mutedChats || [];
    const updated = current.includes(clientId)
      ? current.filter(id => id !== clientId)
      : [...current, clientId];
    saveSettings({ mutedChats: updated });
  }, [settings.mutedChats, saveSettings]);

  const isChatMuted = useCallback((clientId: string) => {
    return (settings.mutedChats || []).includes(clientId);
  }, [settings.mutedChats]);

  const isMessengerMuted = useCallback((messenger: string) => {
    return (settings.mutedMessengers || []).includes(messenger);
  }, [settings.mutedMessengers]);

  return {
    settings,
    isLoaded,
    saveSettings,
    toggleSound,
    setVolume,
    toggleVibration,
    toggleMissedCallNotifications,
    toggleMessengerMute,
    toggleChatMute,
    isChatMuted,
    isMessengerMuted,
  };
};

// Singleton getter for non-React contexts
let cachedSettings: NotificationSettings | null = null;

export const getNotificationSettings = (): NotificationSettings => {
  if (cachedSettings) return cachedSettings;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      return cachedSettings;
    }
  } catch {
    // Ignore
  }
  
  return DEFAULT_SETTINGS;
};

// Clear cache when settings change (call from hook)
export const invalidateSettingsCache = () => {
  cachedSettings = null;
};

export default useNotificationSettings;
