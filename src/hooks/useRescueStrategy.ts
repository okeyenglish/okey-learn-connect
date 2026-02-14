import { useState, useCallback, useRef } from 'react';
import { selfHostedPost } from '@/lib/selfHostedApi';
import type { ConversationHealthData } from '@/hooks/useConversationHealth';

interface UseRescueStrategyOptions {
  clientId: string | null;
  organizationId: string | null;
  health: ConversationHealthData | null;
  enabled?: boolean;
}

export function useRescueStrategy({
  clientId,
  organizationId,
  health,
  enabled = true,
}: UseRescueStrategyOptions) {
  const [strategies, setStrategies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastClientRef = useRef<string | null>(null);
  const lastHealthRef = useRef<string | null>(null);

  const fetchStrategies = useCallback(async () => {
    if (!clientId || !organizationId || !health || !enabled) return;
    if (health.risk_level === 'ok') {
      setStrategies([]);
      return;
    }

    // Avoid re-fetching for same client+signal combo
    const key = `${clientId}:${health.dominant_signal}:${health.risk_level}`;
    if (key === lastHealthRef.current) return;

    setLoading(true);
    setDismissed(false);
    try {
      const result = await selfHostedPost('rescue-strategy', {
        client_id: clientId,
        organization_id: organizationId,
        health_data: {
          risk_level: health.risk_level,
          dominant_signal: health.dominant_signal,
          health_score: health.health_score,
          reason: health.reason,
          recommendation: health.recommendation,
        },
      }) as any;

      const data = result?.data || result;
      if (data?.success && Array.isArray(data.strategies)) {
        setStrategies(data.strategies.slice(0, 3));
        lastHealthRef.current = key;
      }
    } catch (err) {
      console.error('[useRescueStrategy] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, organizationId, health, enabled]);

  // Reset on client change
  if (clientId !== lastClientRef.current) {
    lastClientRef.current = clientId;
    lastHealthRef.current = null;
    setStrategies([]);
    setDismissed(false);
  }

  // Auto-fetch when health drops
  const shouldFetch = health && (health.risk_level === 'warning' || health.risk_level === 'critical') && strategies.length === 0 && !loading && !dismissed;
  if (shouldFetch) {
    fetchStrategies();
  }

  const dismiss = useCallback(() => {
    setDismissed(true);
    setStrategies([]);
  }, []);

  const refresh = useCallback(() => {
    lastHealthRef.current = null;
    setDismissed(false);
    fetchStrategies();
  }, [fetchStrategies]);

  return { strategies, loading, dismissed, dismiss, refresh };
}
