import { useCallback, useRef, useEffect, useState } from 'react';

// Base64 encoded short notification sound (soft pop)
const NOTIFICATION_SOUND_BASE64 = 
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYb/////////////////////////////////';

interface UseNotificationSoundOptions {
  enabled?: boolean;
  volume?: number;
}

/**
 * Hook for playing notification sounds
 * Handles audio context creation, user interaction requirements, and caching
 */
export const useNotificationSound = (options: UseNotificationSoundOptions = {}) => {
  const { enabled = true, volume = 0.5 } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);

  // Minimum interval between sounds to prevent spam (500ms)
  const MIN_INTERVAL = 500;

  // Initialize audio element
  useEffect(() => {
    if (!enabled) return;

    try {
      const audio = new Audio(NOTIFICATION_SOUND_BASE64);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.preload = 'auto';
      
      // Mark as ready when audio is loaded
      audio.addEventListener('canplaythrough', () => setIsReady(true));
      audio.addEventListener('error', (e) => {
        console.warn('[useNotificationSound] Audio load error:', e);
      });

      audioRef.current = audio;

      return () => {
        audio.pause();
        audio.src = '';
        audioRef.current = null;
        setIsReady(false);
      };
    } catch (error) {
      console.warn('[useNotificationSound] Failed to create audio:', error);
    }
  }, [enabled, volume]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!enabled || !audioRef.current) return;

    const now = Date.now();
    if (now - lastPlayedRef.current < MIN_INTERVAL) {
      return; // Too soon, skip
    }

    lastPlayedRef.current = now;

    const audio = audioRef.current;
    
    // Reset to start and play
    audio.currentTime = 0;
    audio.play().catch((error) => {
      // Browser may block autoplay without user interaction
      console.debug('[useNotificationSound] Playback failed (likely autoplay policy):', error.message);
    });
  }, [enabled]);

  return {
    playSound,
    isReady,
  };
};

// Singleton for global notification sound (used by realtime hooks)
let globalAudio: HTMLAudioElement | null = null;
let globalLastPlayed = 0;
const GLOBAL_MIN_INTERVAL = 500;

export const playNotificationSound = (volume = 0.5) => {
  // Check if sound is enabled in settings
  try {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.soundEnabled === false) {
        return; // Sound is disabled
      }
      // Use stored volume if available
      if (typeof settings.soundVolume === 'number') {
        volume = settings.soundVolume;
      }
    }
  } catch {
    // Ignore parsing errors
  }

  const now = Date.now();
  if (now - globalLastPlayed < GLOBAL_MIN_INTERVAL) {
    return; // Throttle
  }

  try {
    if (!globalAudio) {
      globalAudio = new Audio(NOTIFICATION_SOUND_BASE64);
    }
    globalAudio.volume = Math.max(0, Math.min(1, volume));

    globalLastPlayed = now;
    globalAudio.currentTime = 0;
    globalAudio.play().catch(() => {
      // Silently fail if autoplay is blocked
    });
  } catch {
    // Audio not supported
  }
};

export default useNotificationSound;
