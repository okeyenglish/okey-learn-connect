import React, { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, PhoneIncoming, PhoneForwarded, User, Clock, ExternalLink, X, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSipPhone } from '@/hooks/useSipPhone';
import { useCallPickup } from '@/hooks/useCallPickup';

interface CallInfo {
  callId: string;
  clientId: string | null;
  clientName: string | null;
  phoneNumber: string;
  managerId?: string;
  status: 'ringing' | 'answered' | 'ended';
  startTime: number;
  pbxCallId?: string; // OnlinePBX internal call ID for pickup
}

interface IncomingCallNotificationProps {
  onOpenClient?: (clientId: string) => void;
}

// Event types for call notifications
export const dispatchIncomingCallEvent = (data: {
  callId: string;
  clientId: string | null;
  phoneNumber: string;
  managerId?: string;
  clientName?: string | null;
}) => {
  window.dispatchEvent(new CustomEvent('incoming-call-started', { detail: data }));
};

export const dispatchCallAnsweredEvent = (callId: string) => {
  window.dispatchEvent(new CustomEvent('call-answered', { detail: { callId } }));
};

export const dispatchCallEndedEvent = (callId: string) => {
  window.dispatchEvent(new CustomEvent('incoming-call-ended', { detail: { callId } }));
};

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  onOpenClient,
}) => {
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);
  const [duration, setDuration] = useState(0);
  const [answerMode, setAnswerMode] = useState<'none' | 'webrtc' | 'pickup'>('none');
  const { toast } = useToast();
  
  // SIP phone for WebRTC answering
  const sipPhone = useSipPhone({ enabled: true });
  
  // Call pickup for API-based answering
  const callPickup = useCallPickup();

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle incoming call event
  const handleIncomingCall = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{
      callId: string;
      clientId: string | null;
      phoneNumber: string;
      managerId?: string;
      clientName?: string | null;
      pbxCallId?: string;
    }>;
    
    const { callId, clientId, phoneNumber, managerId, clientName, pbxCallId } = customEvent.detail;
    
    console.log('[IncomingCallNotification] Incoming call:', customEvent.detail);
    
    setActiveCall({
      callId,
      clientId,
      clientName: clientName || null,
      phoneNumber,
      managerId,
      status: 'ringing',
      startTime: Date.now(),
      pbxCallId,
    });
    setDuration(0);
    setAnswerMode('none');
  }, []);

  // Handle call answered event
  const handleCallAnswered = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ callId: string }>;
    const { callId } = customEvent.detail;
    
    console.log('[IncomingCallNotification] Call answered:', callId);
    
    setActiveCall(prev => {
      if (prev && prev.callId === callId) {
        return { ...prev, status: 'answered', startTime: Date.now() };
      }
      return prev;
    });
    setDuration(0);
  }, []);

  // Handle call ended event
  const handleCallEnded = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ callId: string }>;
    const { callId } = customEvent.detail;
    
    console.log('[IncomingCallNotification] Call ended:', callId);
    
    setActiveCall(prev => {
      if (prev && prev.callId === callId) {
        // Brief delay to show ended status
        setTimeout(() => setActiveCall(null), 2000);
        return { ...prev, status: 'ended' };
      }
      return prev;
    });
    setAnswerMode('none');
  }, []);

  // Subscribe to call events
  useEffect(() => {
    window.addEventListener('incoming-call-started', handleIncomingCall);
    window.addEventListener('call-answered', handleCallAnswered);
    window.addEventListener('incoming-call-ended', handleCallEnded);

    return () => {
      window.removeEventListener('incoming-call-started', handleIncomingCall);
      window.removeEventListener('call-answered', handleCallAnswered);
      window.removeEventListener('incoming-call-ended', handleCallEnded);
    };
  }, [handleIncomingCall, handleCallAnswered, handleCallEnded]);

  // Duration timer
  useEffect(() => {
    if (!activeCall || activeCall.status === 'ended') return;

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - activeCall.startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall]);

  // Answer via WebRTC (browser microphone)
  const handleAnswerWebRTC = useCallback(async () => {
    if (!activeCall) return;
    
    setAnswerMode('webrtc');
    
    // If SIP is not registered, try to connect first
    if (!sipPhone.isRegistered) {
      toast({
        title: 'Подключение к SIP...',
        description: 'Подождите несколько секунд',
      });
      await sipPhone.connect();
      // Wait a bit for registration
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (sipPhone.hasIncomingCall) {
      sipPhone.answer();
      dispatchCallAnsweredEvent(activeCall.callId);
    } else {
      // No WebRTC session - fall back to pickup
      toast({
        title: 'WebRTC недоступен',
        description: 'Попробуйте перехват на внутренний номер',
        variant: 'destructive',
      });
      setAnswerMode('none');
    }
  }, [activeCall, sipPhone, toast]);

  // Answer via API pickup (redirect to physical phone)
  const handleAnswerPickup = useCallback(async () => {
    if (!activeCall) return;
    
    setAnswerMode('pickup');
    
    const callId = activeCall.pbxCallId || activeCall.callId;
    const success = await callPickup.pickupCall(callId);
    
    if (success) {
      dispatchCallAnsweredEvent(activeCall.callId);
    } else {
      setAnswerMode('none');
    }
  }, [activeCall, callPickup]);

  // Handle hang up / dismiss
  const handleHangUp = useCallback(() => {
    if (!activeCall) return;

    // If in WebRTC call, terminate session
    if (answerMode === 'webrtc' && sipPhone.isInCall) {
      sipPhone.hangup();
    }
    
    // Dispatch call ended event to update UI
    dispatchCallEndedEvent(activeCall.callId);
    
    toast({
      title: activeCall.status === 'answered' ? 'Звонок завершён' : 'Уведомление скрыто',
      description: answerMode === 'webrtc' ? undefined : 'Положите трубку на физическом телефоне',
    });
  }, [activeCall, answerMode, sipPhone, toast]);

  // Toggle mute (for WebRTC calls)
  const handleToggleMute = useCallback(() => {
    if (sipPhone.isInCall) {
      sipPhone.toggleMute();
    }
  }, [sipPhone]);

  // Open client chat
  const handleOpenClient = () => {
    if (activeCall?.clientId && onOpenClient) {
      onOpenClient(activeCall.clientId);
    }
  };

  if (!activeCall) return null;

  const getStatusConfig = () => {
    switch (activeCall.status) {
      case 'ringing':
        return {
          label: 'Входящий звонок',
          color: 'bg-yellow-500',
          animation: 'animate-pulse',
          badgeVariant: 'secondary' as const,
        };
      case 'answered':
        return {
          label: answerMode === 'webrtc' ? 'Разговор (WebRTC)' : 'Разговор',
          color: 'bg-green-500',
          animation: '',
          badgeVariant: 'default' as const,
        };
      case 'ended':
        return {
          label: 'Завершён',
          color: 'bg-muted',
          animation: '',
          badgeVariant: 'outline' as const,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const isProcessing = callPickup.isLoading || answerMode === 'webrtc' && !sipPhone.isInCall;

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-fade-in">
      <Card className={cn(
        "w-80 shadow-elevated border-2",
        activeCall.status === 'ringing' && "border-yellow-500",
        activeCall.status === 'answered' && "border-green-500",
        activeCall.status === 'ended' && "border-muted"
      )}>
        <CardContent className="p-4">
          {/* Header with status */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                statusConfig.color,
                statusConfig.animation
              )} />
              <span className="text-sm font-medium">{statusConfig.label}</span>
            </div>
            <Badge variant={statusConfig.badgeVariant} className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </Badge>
          </div>

          {/* Caller info */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              activeCall.status === 'ringing' ? "bg-yellow-100 text-yellow-700" : "bg-primary/10 text-primary"
            )}>
              {activeCall.status === 'ringing' ? (
                <Phone className="h-6 w-6 animate-pulse" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {activeCall.clientName || 'Неизвестный контакт'}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeCall.phoneNumber}
              </p>
            </div>
          </div>

          {/* Answer buttons - shown when ringing */}
          {activeCall.status === 'ringing' && (
            <div className="space-y-2 mb-3">
              <div className="flex gap-2">
                {/* WebRTC Answer */}
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleAnswerWebRTC}
                  disabled={isProcessing}
                >
                  {answerMode === 'webrtc' && isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <PhoneIncoming className="h-4 w-4 mr-1" />
                  )}
                  В браузере
                </Button>
                
                {/* API Pickup */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-green-500 text-green-700 hover:bg-green-50"
                  onClick={handleAnswerPickup}
                  disabled={isProcessing}
                >
                  {answerMode === 'pickup' && isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <PhoneForwarded className="h-4 w-4 mr-1" />
                  )}
                  На телефон
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Выберите способ ответа
              </p>
            </div>
          )}

          {/* Active call controls - shown when answered via WebRTC */}
          {activeCall.status === 'answered' && answerMode === 'webrtc' && (
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                className={cn("flex-1", sipPhone.isMuted && "bg-red-50 border-red-200")}
                onClick={handleToggleMute}
              >
                {sipPhone.isMuted ? (
                  <>
                    <MicOff className="h-4 w-4 mr-1 text-red-500" />
                    Включить
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-1" />
                    Отключить
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {activeCall.clientId && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleOpenClient}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Открыть
              </Button>
            )}
            
            {activeCall.status !== 'ended' && (
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleHangUp}
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                {activeCall.status === 'answered' ? 'Завершить' : 'Скрыть'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomingCallNotification;
