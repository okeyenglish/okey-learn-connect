import { useState, useEffect, useCallback, useRef } from 'react';
import JsSIP from 'jssip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { selfHostedPost } from '@/lib/selfHostedApi';

export type SipStatus = 'disconnected' | 'connecting' | 'connected' | 'registered' | 'error';
export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';

interface SipConfig {
  domain: string;
  wss_url: string;
  extension: string;
  password?: string;
}

interface UseSipPhoneOptions {
  enabled?: boolean;
  autoConnect?: boolean;
}

// Using 'any' for JsSIP types since the library has complex typing
type RTCSessionType = any;
type UAType = any;

export const useSipPhone = (options: UseSipPhoneOptions = {}) => {
  const { enabled = true, autoConnect = false } = options;
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [sipStatus, setSipStatus] = useState<SipStatus>('disconnected');
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [sipConfig, setSipConfig] = useState<SipConfig | null>(null);
  const [currentSession, setCurrentSession] = useState<RTCSessionType | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingSession, setIncomingSession] = useState<RTCSessionType | null>(null);

  const uaRef = useRef<UAType | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch SIP configuration from server
  const fetchSipConfig = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const response = await selfHostedPost<{
        success: boolean;
        sip_config?: SipConfig;
        error?: string;
      }>('onlinepbx-pickup', {
        action: 'get-sip-config',
        user_id: user.id,
      });

      if (response.success && response.data?.sip_config) {
        console.log('[useSipPhone] Got SIP config:', response.data.sip_config);
        setSipConfig(response.data.sip_config);
        return response.data.sip_config;
      } else {
        console.warn('[useSipPhone] Failed to get SIP config:', response.error);
        return null;
      }
    } catch (error) {
      console.error('[useSipPhone] Error fetching SIP config:', error);
      return null;
    }
  }, [user?.id]);

  // Initialize audio element for remote audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.autoplay = true;
    }
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Connect to SIP server
  const connect = useCallback(async (password?: string) => {
    if (!enabled || !user?.id) return;

    let config = sipConfig;
    if (!config) {
      config = await fetchSipConfig();
      if (!config) {
        toast({
          title: 'Ошибка WebRTC',
          description: 'Не удалось получить настройки SIP',
          variant: 'destructive',
        });
        return;
      }
    }

    // SIP password can be passed directly or stored in profile
    const sipPassword = password || (profile as any)?.sip_password || config.extension;

    if (!sipPassword) {
      toast({
        title: 'Ошибка авторизации',
        description: 'SIP пароль не настроен. Обратитесь к администратору.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSipStatus('connecting');
      console.log('[useSipPhone] Connecting to SIP:', config.wss_url);

      // Configure JsSIP
      const socket = new JsSIP.WebSocketInterface(config.wss_url);
      
      const configuration = {
        sockets: [socket],
        uri: `sip:${config.extension}@${config.domain}`,
        password: sipPassword,
        display_name: profile?.first_name || config.extension,
        register: true,
        session_timers: false,
      };

      // Create UA instance
      const ua = new JsSIP.UA(configuration);
      uaRef.current = ua;

      // Event handlers
      ua.on('connected', () => {
        console.log('[useSipPhone] WebSocket connected');
        setSipStatus('connected');
      });

      ua.on('disconnected', () => {
        console.log('[useSipPhone] WebSocket disconnected');
        setSipStatus('disconnected');
      });

      ua.on('registered', () => {
        console.log('[useSipPhone] SIP registered');
        setSipStatus('registered');
        toast({
          title: 'WebRTC подключён',
          description: `Софтфон активен (${config!.extension})`,
        });
      });

      ua.on('unregistered', () => {
        console.log('[useSipPhone] SIP unregistered');
        setSipStatus('disconnected');
      });

      ua.on('registrationFailed', (e: any) => {
        console.error('[useSipPhone] Registration failed:', e.cause);
        setSipStatus('error');
        toast({
          title: 'Ошибка регистрации SIP',
          description: e.cause || 'Проверьте настройки или пароль',
          variant: 'destructive',
        });
      });

      // Handle incoming calls
      ua.on('newRTCSession', (e: any) => {
        const session = e.session as RTCSessionType;
        
        if (session.direction === 'incoming') {
          console.log('[useSipPhone] Incoming call from:', e.request.from.uri.user);
          setIncomingSession(session);
          setCallStatus('ringing');

          // Dispatch event for notification system
          window.dispatchEvent(new CustomEvent('webrtc-incoming-call', {
            detail: {
              from: e.request.from.uri.user,
              displayName: e.request.from.display_name,
            },
          }));

          // Handle session events
          setupSessionHandlers(session);
        }
      });

      // Start UA
      ua.start();

    } catch (error) {
      console.error('[useSipPhone] Connection error:', error);
      setSipStatus('error');
      toast({
        title: 'Ошибка подключения',
        description: 'Не удалось подключиться к SIP серверу',
        variant: 'destructive',
      });
    }
  }, [enabled, user?.id, sipConfig, profile, toast, fetchSipConfig]);

  // Setup session event handlers
  const setupSessionHandlers = useCallback((session: RTCSessionType) => {
    session.on('progress', () => {
      console.log('[useSipPhone] Call in progress');
      setCallStatus('connecting');
    });

    session.on('accepted', () => {
      console.log('[useSipPhone] Call accepted');
      setCallStatus('active');
      setCurrentSession(session);
      setIncomingSession(null);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    });

    session.on('ended', () => {
      console.log('[useSipPhone] Call ended');
      handleCallEnd();
    });

    session.on('failed', (e: any) => {
      console.log('[useSipPhone] Call failed:', e.cause);
      handleCallEnd();
    });

    // Handle remote audio stream
    session.on('peerconnection', (e: any) => {
      const pc = e.peerconnection as RTCPeerConnection;
      
      pc.ontrack = (event) => {
        if (audioRef.current && event.streams[0]) {
          audioRef.current.srcObject = event.streams[0];
        }
      };
    });
  }, []);

  const handleCallEnd = useCallback(() => {
    setCallStatus('idle');
    setCurrentSession(null);
    setIncomingSession(null);
    setCallDuration(0);
    setIsMuted(false);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  }, []);

  // Answer incoming call
  const answer = useCallback(() => {
    if (!incomingSession) return;

    try {
      console.log('[useSipPhone] Answering call');
      
      incomingSession.answer({
        mediaConstraints: {
          audio: true,
          video: false,
        },
        pcConfig: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        },
      });

      setupSessionHandlers(incomingSession);
      
    } catch (error) {
      console.error('[useSipPhone] Error answering call:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось ответить на звонок',
        variant: 'destructive',
      });
    }
  }, [incomingSession, setupSessionHandlers, toast]);

  // Reject/decline incoming call
  const decline = useCallback(() => {
    if (incomingSession) {
      console.log('[useSipPhone] Declining call');
      incomingSession.terminate();
      handleCallEnd();
    }
  }, [incomingSession, handleCallEnd]);

  // Hang up active call
  const hangup = useCallback(() => {
    if (currentSession) {
      console.log('[useSipPhone] Hanging up');
      currentSession.terminate();
    }
    if (incomingSession) {
      incomingSession.terminate();
    }
    handleCallEnd();
  }, [currentSession, incomingSession, handleCallEnd]);

  // Make outgoing call
  const call = useCallback((number: string) => {
    if (!uaRef.current || sipStatus !== 'registered') {
      toast({
        title: 'Софтфон не подключён',
        description: 'Сначала подключитесь к SIP серверу',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('[useSipPhone] Making call to:', number);
      setCallStatus('connecting');

      const session = uaRef.current.call(`sip:${number}@${sipConfig?.domain}`, {
        mediaConstraints: {
          audio: true,
          video: false,
        },
        pcConfig: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        },
      });

      setupSessionHandlers(session);
      
    } catch (error) {
      console.error('[useSipPhone] Error making call:', error);
      setCallStatus('idle');
      toast({
        title: 'Ошибка',
        description: 'Не удалось совершить звонок',
        variant: 'destructive',
      });
    }
  }, [sipStatus, sipConfig, setupSessionHandlers, toast]);

  // Mute/unmute
  const toggleMute = useCallback(() => {
    if (currentSession) {
      if (isMuted) {
        currentSession.unmute();
      } else {
        currentSession.mute();
      }
      setIsMuted(!isMuted);
    }
  }, [currentSession, isMuted]);

  // Disconnect from SIP server
  const disconnect = useCallback(() => {
    if (uaRef.current) {
      uaRef.current.stop();
      uaRef.current = null;
    }
    setSipStatus('disconnected');
    handleCallEnd();
  }, [handleCallEnd]);

  // Auto-connect on mount if configured
  useEffect(() => {
    if (autoConnect && enabled && user?.id) {
      fetchSipConfig();
    }
  }, [autoConnect, enabled, user?.id, fetchSipConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uaRef.current) {
        uaRef.current.stop();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return {
    // Status
    sipStatus,
    callStatus,
    isRegistered: sipStatus === 'registered',
    isInCall: callStatus === 'active' || callStatus === 'connecting',
    hasIncomingCall: !!incomingSession,
    callDuration,
    isMuted,
    
    // Config
    sipConfig,
    
    // Actions
    connect,
    disconnect,
    answer,
    decline,
    hangup,
    call,
    toggleMute,
    fetchSipConfig,
  };
};
