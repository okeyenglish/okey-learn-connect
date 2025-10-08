import { useState, useEffect, useCallback } from 'react';

/**
 * Utility to check Supabase server health
 */

const SUPABASE_URL = "https://supabase.okey-english.ru";

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
    // Check REST API
    const restResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    result.restAvailable = restResponse.ok || restResponse.status === 401; // 401 is ok, means auth is working

    // Check Auth API
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    result.authAvailable = authResponse.ok;

    result.isHealthy = result.restAvailable && result.authAvailable;
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
