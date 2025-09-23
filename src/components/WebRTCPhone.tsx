import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import JsSIP from 'jssip';

interface WebRTCPhoneProps {
  phoneNumber?: string;
  onCallEnd?: () => void;
}

export const WebRTCPhone: React.FC<WebRTCPhoneProps> = ({ phoneNumber, onCallEnd }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [callNumber, setCallNumber] = useState(phoneNumber || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [sipProfile, setSipProfile] = useState<any>(null);
  
  const uaRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (phoneNumber && phoneNumber !== callNumber) {
      setCallNumber(phoneNumber);
      setIsOpen(true);
    }
  }, [phoneNumber]);

  useEffect(() => {
    initializeSIP();
    return () => {
      if (uaRef.current) {
        uaRef.current.stop();
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  const initializeSIP = async () => {
    try {
      // Get user profile with SIP credentials
      const { data: profile } = await supabase
        .from('profiles')
        .select('extension_number, sip_domain, sip_password')
        .eq('id', user?.id)
        .single();

      if (!profile?.extension_number || !profile?.sip_password) {
        toast({
          title: "Настройки не найдены",
          description: "Настройте добавочный номер в профиле",
          variant: "destructive",
        });
        return;
      }

      setSipProfile(profile);

      const socket = new JsSIP.WebSocketInterface(`wss://${profile.sip_domain}:7443`);
      
      const configuration = {
        sockets: [socket],
        uri: `sip:${profile.extension_number}@${profile.sip_domain}`,
        authorization_user: profile.extension_number,
        password: profile.sip_password,
        session_timers: false,
        register: true,
        register_expires: 600,
      };

      uaRef.current = new JsSIP.UA(configuration);

      uaRef.current.on('registered', () => {
        setIsConnected(true);
        console.log('SIP registered successfully');
      });

      uaRef.current.on('unregistered', () => {
        setIsConnected(false);
        console.log('SIP unregistered');
      });

      uaRef.current.on('registrationFailed', (e) => {
        setIsConnected(false);
        console.error('SIP registration failed:', e);
        toast({
          title: "Ошибка подключения",
          description: "Не удалось подключиться к SIP серверу",
          variant: "destructive",
        });
      });

      uaRef.current.start();

    } catch (error) {
      console.error('Error initializing SIP:', error);
      toast({
        title: "Ошибка инициализации",
        description: "Не удалось инициализировать SIP клиент",
        variant: "destructive",
      });
    }
  };

  const makeCall = () => {
    if (!uaRef.current || !isConnected) {
      toast({
        title: "Нет подключения",
        description: "SIP клиент не подключен",
        variant: "destructive",
      });
      return;
    }

    if (!callNumber) {
      toast({
        title: "Не указан номер",
        description: "Введите номер для звонка",
        variant: "destructive",
      });
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanNumber = callNumber.replace(/[^\d+]/g, '');
    
    const eventHandlers = {
      'progress': () => {
        console.log('Call in progress');
      },
      'confirmed': () => {
        setIsInCall(true);
        startCallTimer();
        toast({
          title: "Звонок начат",
          description: `Соединение с ${callNumber}`,
        });
      },
      'ended': () => {
        endCall();
      },
      'failed': (e: any) => {
        console.error('Call failed:', e);
        toast({
          title: "Ошибка звонка",
          description: e.cause || "Не удалось совершить звонок",
          variant: "destructive",
        });
        endCall();
      }
    };

    const options = {
      eventHandlers,
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    };

    try {
      sessionRef.current = uaRef.current.call(`sip:${cleanNumber}@${sipProfile.sip_domain}`, options);
    } catch (error) {
      console.error('Error making call:', error);
      toast({
        title: "Ошибка звонка",
        description: "Не удалось начать звонок",
        variant: "destructive",
      });
    }
  };

  const endCall = () => {
    if (sessionRef.current) {
      sessionRef.current.terminate();
      sessionRef.current = null;
    }
    
    setIsInCall(false);
    setCallDuration(0);
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    onCallEnd?.();
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (sessionRef.current) {
      if (isMuted) {
        sessionRef.current.unmute();
      } else {
        sessionRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`${isConnected ? 'text-green-600' : 'text-red-600'}`}
        disabled={!phoneNumber && !callNumber}
      >
        <Phone className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              WebRTC Звонок
              <div className={`ml-auto w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isInCall ? (
              <>
                <Input
                  placeholder="Номер телефона (+7...)"
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                  disabled={isInCall}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={makeCall}
                    disabled={!isConnected || !callNumber}
                    className="flex-1"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Позвонить
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-lg font-semibold">Звонок на {callNumber}</div>
                <div className="text-2xl font-mono text-green-600">
                  {formatDuration(callDuration)}
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={toggleMute}
                    className={isMuted ? 'bg-red-100' : ''}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={endCall}
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {!isConnected && (
              <div className="text-sm text-muted-foreground text-center">
                Подключение к SIP серверу...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};