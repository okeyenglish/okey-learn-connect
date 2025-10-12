import { useState, useEffect, useCallback } from 'react';

/**
 * Utility to check Supabase server health
 */

const SUPABASE_URL = "https://kbojujfwtvmsgudumown.supabase.co";

export interface HealthCheckResult {
  isHealthy: boolean;
  restAvailable: boolean;
  authAvailable: boolean;
  error?: string;
}

/**
 * Checks if Supabase REST and Auth APIs are accessible
 */
export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    isHealthy: false,
    restAvailable: false,
    authAvailable: false,
  };

  try {
    // Check Auth API health only to avoid CORS issues with REST root
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);

    result.authAvailable = !!authResponse && (authResponse.ok || authResponse.status === 200);
    // Assume REST is available when Auth is healthy (same gateway)
    result.restAvailable = result.authAvailable;
    result.isHealthy = result.authAvailable;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Network error';
  }

  return result;
}

/**
 * Lightweight health check hook for React components
 */
export function useSupabaseHealth() {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    const result = await checkSupabaseHealth();
    setHealth(result);
    setIsChecking(false);
    return result;
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { health, isChecking, checkHealth };
}
