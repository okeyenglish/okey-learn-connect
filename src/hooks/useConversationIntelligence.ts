import { useState, useEffect, useCallback, useRef } from 'react';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';

interface NextBestAction {
  action_type: string;
  action_label: string;
  action_detail?: string;
  priority: number;
  success_rate?: number;
}

interface ConversationState {
  stage: string;
  previous_stage?: string;
  is_transition: boolean;
  confidence: number;
  reason?: string;
  next_best_actions: NextBestAction[];
  messages_analyzed: number;
}

interface UseConversationIntelligenceOptions {
  clientId: string | null;
  organizationId: string | null;
  enabled?: boolean;
  /** Debounce interval in ms after a new message arrives */
  debounceMs?: number;
}

export function useConversationIntelligence({
  clientId,
  organizationId,
  enabled = true,
  debounceMs = 2000,
}: UseConversationIntelligenceOptions) {
  const [state, setState] = useState<ConversationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClientRef = useRef<string | null>(null);

  const classify = useCallback(async () => {
    if (!clientId || !organizationId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await selfHostedPost('classify-conversation-state', {
        client_id: clientId,
        organization_id: organizationId,
      }) as any;

      const data = result?.data || result;

      if (data?.success) {
        setState({
          stage: data.stage,
          previous_stage: data.previous_stage,
          is_transition: data.is_transition,
          confidence: data.confidence,
          reason: data.reason,
          next_best_actions: data.next_best_actions || [],
          messages_analyzed: data.messages_analyzed,
        });
      } else {
        setError(data?.error || 'Classification failed');
      }
    } catch (err: any) {
      console.error('[useConversationIntelligence] Error:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [clientId, organizationId, enabled]);

  // Classify when client changes
  useEffect(() => {
    if (clientId !== lastClientRef.current) {
      lastClientRef.current = clientId;
      setState(null);
      if (clientId && organizationId && enabled) {
        classify();
      }
    }
  }, [clientId, organizationId, enabled, classify]);

  // Debounced re-classify trigger (call after new messages)
  const triggerClassify = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      classify();
    }, debounceMs);
  }, [classify, debounceMs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    state,
    loading,
    error,
    classify,
    triggerClassify,
  };
}
