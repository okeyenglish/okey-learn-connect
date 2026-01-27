import { useCallback, useRef, useEffect, useState } from 'react';

// Sound types for different notifications
export type NotificationSoundType = 'chat' | 'lesson' | 'missed_call' | 'default';

// Base64 encoded sounds for different notification types
// Default soft pop sound
const SOUND_DEFAULT = 
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
      const audio = new Audio(SOUND_DEFAULT);
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

// Audio context for Web Audio API sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Generate a notification sound using Web Audio API
 * Different patterns for different notification types
 */
function playGeneratedSound(type: NotificationSoundType, volume: number) {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required by browsers after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.value = volume * 0.3; // Scale down to prevent loud sounds

    const now = ctx.currentTime;

    switch (type) {
      case 'chat':
        // Chat: Two-tone ascending chime (pleasant, friendly)
        playTone(ctx, gainNode, 880, now, 0.08); // A5
        playTone(ctx, gainNode, 1108.73, now + 0.08, 0.12); // C#6
        break;

      case 'lesson':
        // Lesson: Three-tone melody (like a bell, attention-grabbing)
        playTone(ctx, gainNode, 523.25, now, 0.1); // C5
        playTone(ctx, gainNode, 659.25, now + 0.1, 0.1); // E5
        playTone(ctx, gainNode, 783.99, now + 0.2, 0.15); // G5
        break;

      case 'missed_call':
        // Missed call: Urgent two-tone descending (phone-like)
        playTone(ctx, gainNode, 1046.50, now, 0.15); // C6
        playTone(ctx, gainNode, 880, now + 0.15, 0.15); // A5
        playTone(ctx, gainNode, 1046.50, now + 0.35, 0.1); // C6 again
        break;

      case 'default':
      default:
        // Default: Simple pop
        playTone(ctx, gainNode, 800, now, 0.1);
        break;
    }

    // Cleanup gain node after sounds complete
    setTimeout(() => {
      gainNode.disconnect();
    }, 1000);

  } catch (error) {
    console.warn('[playGeneratedSound] Failed to play sound:', error);
    // Fallback to base64 audio
    playFallbackSound(volume);
  }
}

/**
 * Play a single tone
 */
function playTone(
  ctx: AudioContext,
  gainNode: GainNode,
  frequency: number,
  startTime: number,
  duration: number
) {
  const oscillator = ctx.createOscillator();
  const noteGain = ctx.createGain();
  
  oscillator.connect(noteGain);
  noteGain.connect(gainNode);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  // Envelope for smooth attack and release
  noteGain.gain.setValueAtTime(0, startTime);
  noteGain.gain.linearRampToValueAtTime(1, startTime + 0.01); // Quick attack
  noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Decay
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

/**
 * Fallback to base64 audio if Web Audio fails
 */
function playFallbackSound(volume: number) {
  try {
    const audio = new Audio(SOUND_DEFAULT);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Silently fail
  }
}

// Singleton tracking for throttling
const lastPlayedByType: Record<NotificationSoundType, number> = {
  chat: 0,
  lesson: 0,
  missed_call: 0,
  default: 0,
};
const GLOBAL_MIN_INTERVAL = 500;

/**
 * Play notification sound with type-specific sound
 * @param volume - Volume level (0-1)
 * @param type - Type of notification for different sounds
 */
export const playNotificationSound = (volume = 0.5, type: NotificationSoundType = 'default') => {
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
  if (now - lastPlayedByType[type] < GLOBAL_MIN_INTERVAL) {
    return; // Throttle same type
  }

  lastPlayedByType[type] = now;

  // Play the appropriate sound
  playGeneratedSound(type, volume);
};

// Legacy export for backward compatibility
export const playNotificationSoundLegacy = (volume = 0.5) => {
  playNotificationSound(volume, 'default');
};

export default useNotificationSound;
