import { useState, useEffect, useCallback, useRef } from 'react';
import { selfHostedPost } from '@/lib/selfHostedApi';

export interface ConversationHealthData {
  health_score: number;
  risk_level: 'ok' | 'warning' | 'critical';
  dominant_signal: string;
  signals: Record<string, any>;
  recommendation: string;
  reason: string;
}

interface UseConversationHealthOptions {
  clientId: string | null;
  organizationId: string | null;
  enabled?: boolean;
  debounceMs?: number;
}

export function useConversationHealth({
  clientId,
  organizationId,
  enabled = true,
  debounceMs = 3000,
}: UseConversationHealthOptions) {
  const [health, setHealth] = useState<ConversationHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClientRef = useRef<string | null>(null);

  const calculate = useCallback(async () => {
    if (!clientId || !organizationId || !enabled) return;
    setLoading(true);
    try {
      const result = await selfHostedPost('conversation-health-score', {
        client_id: clientId,
        organization_id: organizationId,
      }) as any;
      const data = result?.data || result;
      if (data?.success) {
        setHealth({
          health_score: data.health_score,
          risk_level: data.risk_level,
          dominant_signal: data.dominant_signal,
          signals: data.signals || {},
          recommendation: data.recommendation || '',
          reason: data.reason || '',
        });
      }
    } catch (err) {
      console.error('[useConversationHealth] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, organizationId, enabled]);

  // Calculate on client change
  useEffect(() => {
    if (clientId !== lastClientRef.current) {
      lastClientRef.current = clientId;
      setHealth(null);
      if (clientId && organizationId && enabled) {
        calculate();
      }
    }
  }, [clientId, organizationId, enabled, calculate]);

  // Debounced recalculate (call after new messages)
  const triggerRecalculate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(calculate, debounceMs);
  }, [calculate, debounceMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { health, loading, calculate, triggerRecalculate };
}
