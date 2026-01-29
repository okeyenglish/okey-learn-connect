import { Capacitor } from '@capacitor/core';

export type Platform = 'ios' | 'android' | 'web';

/**
 * Get the current platform (ios, android, or web)
 */
export function getPlatform(): Platform {
  if (!Capacitor.isNativePlatform()) {
    return 'web';
  }
  return Capacitor.getPlatform() as 'ios' | 'android';
}

/**
 * Check if running on a native platform (iOS or Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

/**
 * Get a human-readable platform name
 */
export function getPlatformName(): string {
  const platform = getPlatform();
  switch (platform) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    default:
      return 'Web';
  }
}
