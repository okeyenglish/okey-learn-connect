import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface TakeoverRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetUserId: string;
  clientId: string;
  clientName: string;
  status: 'pending' | 'approved' | 'declined';
  draftText?: string;
  createdAt: string;
}

interface TakeoverBroadcastPayload {
  type: 'takeover_request' | 'takeover_response' | 'takeover_draft';
  request?: TakeoverRequest;
  response?: {
    requestId: string;
    approved: boolean;
    draftText?: string;
  };
}

/**
 * Hook to manage chat takeover requests
 * Uses Supabase Realtime broadcast for instant communication
 */
export const useChatTakeover = (clientId: string | null) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [pendingRequest, setPendingRequest] = useState<TakeoverRequest | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<TakeoverRequest | null>(null);
  const [receivedDraft, setReceivedDraft] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const currentUserNameRef = useRef<string>('Менеджер');

  // Sync user info from AuthProvider (eliminates getUser() call)
  useEffect(() => {
    if (user) {
      currentUserIdRef.current = user.id;
      
      if (profile) {
        const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
        if (name) currentUserNameRef.current = name;
      }
    }
  }, [user, profile]);

  // Subscribe to takeover channel
  useEffect(() => {
    if (!clientId || !currentUserIdRef.current) return;

    const channelName = `chat-takeover-${clientId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'takeover' }, (payload) => {
        const data = payload.payload as TakeoverBroadcastPayload;
        
        if (data.type === 'takeover_request' && data.request) {
          // Someone is requesting to take over this chat
          if (data.request.targetUserId === currentUserIdRef.current) {
            setIncomingRequest(data.request);
          }
        } else if (data.type === 'takeover_response' && data.response) {
          // Response to our takeover request
          if (pendingRequest?.id === data.response.requestId) {
            if (data.response.approved) {
              toast({
                title: "Чат передан",
                description: "Вы получили управление чатом",
              });
              if (data.response.draftText) {
                setReceivedDraft(data.response.draftText);
              }
            } else {
              toast({
                title: "Запрос отклонён",
                description: "Менеджер отказался передавать чат",
                variant: "destructive",
              });
            }
            setPendingRequest(null);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clientId, pendingRequest, toast]);

  // Request takeover from another manager
  const requestTakeover = useCallback(async (
    targetUserId: string,
    targetUserName: string,
    clientName: string
  ) => {
    if (!clientId || !currentUserIdRef.current || !channelRef.current) return;

    const request: TakeoverRequest = {
      id: crypto.randomUUID(),
      requesterId: currentUserIdRef.current,
      requesterName: currentUserNameRef.current,
      targetUserId,
      clientId,
      clientName,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setPendingRequest(request);

    await channelRef.current.send({
      type: 'broadcast',
      event: 'takeover',
      payload: {
        type: 'takeover_request',
        request,
      } as TakeoverBroadcastPayload,
    });

    toast({
      title: "Запрос отправлен",
      description: `Ожидаем ответа от ${targetUserName}`,
    });
  }, [clientId, toast]);

  // Respond to incoming takeover request
  const respondToRequest = useCallback(async (approved: boolean, draftText?: string) => {
    if (!incomingRequest || !channelRef.current) return;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'takeover',
      payload: {
        type: 'takeover_response',
        response: {
          requestId: incomingRequest.id,
          approved,
          draftText: approved ? draftText : undefined,
        },
      } as TakeoverBroadcastPayload,
    });

    if (approved) {
      toast({
        title: "Чат передан",
        description: `${incomingRequest.requesterName} теперь ведёт этот чат`,
      });
    }

    setIncomingRequest(null);
  }, [incomingRequest, toast]);

  // Clear received draft after it's been used
  const clearReceivedDraft = useCallback(() => {
    setReceivedDraft(null);
  }, []);

  // Cancel pending request
  const cancelRequest = useCallback(() => {
    setPendingRequest(null);
  }, []);

  return {
    // State
    pendingRequest,
    incomingRequest,
    receivedDraft,
    
    // Actions
    requestTakeover,
    respondToRequest,
    clearReceivedDraft,
    cancelRequest,
  };
};
