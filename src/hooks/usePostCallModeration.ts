import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { selfHostedPost } from '@/lib/selfHostedApi';
import type { PostCallData } from '@/components/crm/PostCallModerationModal';
import { useQueryClient } from '@tanstack/react-query';

interface CallLogFromApi {
  id: string;
  client_id: string | null;
  status: string;
  direction: string;
  manager_id: string | null;
  phone_number: string;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  agreements: string | null;
  manual_action_items: unknown;
  ai_evaluation: unknown;
  recording_url: string | null;
  client_name?: string;
}

interface UsePostCallModerationOptions {
  /** Delay in ms to wait for AI analysis before showing modal */
  analysisDelay?: number;
  /** Polling interval in ms to check for new ended calls */
  pollingInterval?: number;
  /** Whether the hook is enabled */
  enabled?: boolean;
}

/**
 * Hook to detect when a call ends for the current user and show post-call moderation modal.
 * Uses polling to check for recently ended calls since call_logs is on self-hosted DB.
 */
// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = 3;  // Number of errors before opening circuit
const CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes pause

export const usePostCallModeration = (options: UsePostCallModerationOptions = {}) => {
  const { analysisDelay = 8000, pollingInterval = 10000, enabled = true } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [callData, setCallData] = useState<PostCallData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  
  const lastCheckedTimeRef = useRef<string>(new Date().toISOString());
  const processedCallsRef = useRef<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analysisDelayRef = useRef<NodeJS.Timeout | null>(null);
  
  // Circuit breaker state
  const consecutiveErrorsRef = useRef(0);
  const circuitOpenUntilRef = useRef<number | null>(null);

  // Fetch full call details with AI analysis
  const fetchCallDetails = useCallback(async (callId: string): Promise<PostCallData | null> => {
    try {
      const response = await selfHostedPost<{
        success: boolean;
        call: CallLogFromApi;
      }>('get-call-logs', { action: 'get', callId });

      if (!response.success || !response.data?.call) {
        console.error('[usePostCallModeration] Failed to fetch call details');
        return null;
      }

      const call = response.data.call;
      
      // Get client name if client_id exists and not already provided
      let clientName = call.client_name;
      if (!clientName && call.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', call.client_id)
          .maybeSingle();
        
        clientName = clientData?.name || null;
      }

      return {
        id: call.id,
        phone_number: call.phone_number,
        direction: call.direction as 'incoming' | 'outgoing',
        status: call.status,
        duration_seconds: call.duration_seconds,
        started_at: call.started_at,
        ended_at: call.ended_at,
        summary: call.summary,
        agreements: call.agreements,
        manual_action_items: call.manual_action_items as PostCallData['manual_action_items'],
        ai_evaluation: call.ai_evaluation as PostCallData['ai_evaluation'],
        client_name: clientName
      };
    } catch (error) {
      console.error('[usePostCallModeration] Error fetching call details:', error);
      return null;
    }
  }, []);

  // Show modal with call data
  const showModeration = useCallback(async (callId: string) => {
    if (processedCallsRef.current.has(callId)) {
      console.log('[usePostCallModeration] Call already processed, skipping:', callId);
      return;
    }

    setIsLoading(true);
    setPendingCallId(callId);

    try {
      const data = await fetchCallDetails(callId);
      if (data) {
        processedCallsRef.current.add(callId);
        setCallData(data);
        setIsModalOpen(true);
      }
    } finally {
      setIsLoading(false);
      setPendingCallId(null);
    }
  }, [fetchCallDetails]);

  // Check for recently ended calls with circuit breaker
  const checkForEndedCalls = useCallback(async () => {
    if (!user?.id) return;

    // Circuit breaker: skip if circuit is open
    if (circuitOpenUntilRef.current && Date.now() < circuitOpenUntilRef.current) {
      console.log('[usePostCallModeration] Circuit breaker open, skipping poll');
      return;
    }
    
    // Reset circuit breaker if timeout has passed
    if (circuitOpenUntilRef.current && Date.now() >= circuitOpenUntilRef.current) {
      console.log('[usePostCallModeration] Circuit breaker reset after timeout');
      circuitOpenUntilRef.current = null;
      consecutiveErrorsRef.current = 0;
    }

    try {
      // Fetch recent calls for current manager that ended after last check
      const response = await selfHostedPost<{
        success: boolean;
        calls: CallLogFromApi[];
      }>('get-call-logs', {
        action: 'recent-for-manager',
        managerId: user.id,
        since: lastCheckedTimeRef.current,
        limit: 5
      }, {
        retry: { noRetry: true } // Disable retry - circuit breaker handles failures
      });

      if (!response.success || !response.data?.calls) {
        // Increment error counter
        consecutiveErrorsRef.current++;
        console.warn(`[usePostCallModeration] Request failed (${consecutiveErrorsRef.current}/${CIRCUIT_BREAKER_THRESHOLD})`);
        
        if (consecutiveErrorsRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
          circuitOpenUntilRef.current = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
          console.warn('[usePostCallModeration] Circuit breaker triggered - pausing for 5 minutes');
        }
        return;
      }

      // Success - reset error counter
      consecutiveErrorsRef.current = 0;

      const calls = response.data.calls;
      
      // Update last checked time
      lastCheckedTimeRef.current = new Date().toISOString();

      // Find calls that just ended and should show moderation
      for (const call of calls) {
        // Only show for answered calls with duration > 10 seconds
        if (
          call.status === 'answered' &&
          (call.duration_seconds ?? 0) > 10 &&
          call.manager_id === user.id &&
          !processedCallsRef.current.has(call.id)
        ) {
          console.log('[usePostCallModeration] Found ended call, scheduling moderation:', call.id);
          
          // Clear any existing delay timeout
          if (analysisDelayRef.current) {
            clearTimeout(analysisDelayRef.current);
          }

          // Wait for AI analysis to complete before showing modal
          analysisDelayRef.current = setTimeout(() => {
            showModeration(call.id);
          }, analysisDelay);
          
          // Only process one call at a time
          break;
        }
      }
    } catch (error) {
      // Increment error counter on exception
      consecutiveErrorsRef.current++;
      console.error(`[usePostCallModeration] Error checking for ended calls (${consecutiveErrorsRef.current}/${CIRCUIT_BREAKER_THRESHOLD}):`, error);
      
      if (consecutiveErrorsRef.current >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitOpenUntilRef.current = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
        console.warn('[usePostCallModeration] Circuit breaker triggered - pausing for 5 minutes');
      }
    }
  }, [user?.id, analysisDelay, showModeration]);

  // Start polling for ended calls
  useEffect(() => {
    if (!enabled || !user?.id) return;

    console.log('[usePostCallModeration] Starting polling for ended calls');
    
    // Initial check
    checkForEndedCalls();

    // Set up polling
    pollingIntervalRef.current = setInterval(checkForEndedCalls, pollingInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (analysisDelayRef.current) {
        clearTimeout(analysisDelayRef.current);
        analysisDelayRef.current = null;
      }
    };
  }, [enabled, user?.id, pollingInterval, checkForEndedCalls]);

  // Handle modal confirmation - invalidate queries
  const handleConfirmed = useCallback(() => {
    // Invalidate call history queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['call-logs'] });
    queryClient.invalidateQueries({ queryKey: ['call-logs-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['global-call-logs'] });
  }, [queryClient]);

  // Handle modal close
  const handleOpenChange = useCallback((open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      // Also invalidate on close without changes
      handleConfirmed();
    }
  }, [handleConfirmed]);

  // Manual trigger for testing or specific use cases
  const triggerModeration = useCallback((callId: string) => {
    showModeration(callId);
  }, [showModeration]);

  return {
    isModalOpen,
    callData,
    isLoading,
    pendingCallId,
    onOpenChange: handleOpenChange,
    onConfirmed: handleConfirmed,
    triggerModeration,
  };
};
