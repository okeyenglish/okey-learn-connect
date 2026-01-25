import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Send, Bot, User, X, Trash2 } from 'lucide-react';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAssistantMessages, AssistantMessage } from '@/hooks/useAssistantMessages';

// Browser API type extensions
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// Helper to detect iOS devices
const getIsIOS = () => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

interface VoiceAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  embedded?: boolean;
  context?: {
    currentPage: string;
    activeClientId: string | null;
    activeClientName: string | null;
    userRole?: string;
    userBranch?: string;
    activeChatType?: string;
  };
  onOpenModal?: {
    addClient?: () => void;
    addTask?: () => void;
    addTeacher?: () => void;
    addStudent?: () => void;
    addInvoice?: () => void;
    clientProfile?: (clientId: string) => void;
    editTask?: (taskId: string) => void;
  };
  onOpenChat?: (clientId: string) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface DeletedTask {
  id: string;
  [key: string]: unknown;
}

interface ActionResult {
  type: string;
  data?: unknown;
  clientName?: string;
  clientId?: string;
  action?: string;
  title?: string;
  filter?: string;
  status?: string;
  modalType?: string;
  taskId?: string;
  deletedCount?: number;
  deletedTasks?: DeletedTask[];
}

export default function VoiceAssistant({ 
  isOpen, 
  onToggle, 
  embedded = false,
  context,
  onOpenModal,
  onOpenChat 
}: VoiceAssistantProps) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const isMobile = useIsMobile();
  const isIOS = getIsIOS();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processAudioRef = useRef<((blob: Blob) => Promise<void>) | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Используем хук для сохранения сообщений в БД
  const { 
    messages: dbMessages, 
    addMessage: addDbMessage, 
    markAllAsRead,
    clearHistory,
    isLoading: messagesLoading 
  } = useAssistantMessages();
  
  // Конвертируем сообщения из БД в локальный формат
  const messages: ChatMessage[] = dbMessages.map((msg: AssistantMessage) => ({
    id: msg.id,
    type: msg.role,
    content: msg.content,
    timestamp: new Date(msg.created_at),
    isVoice: false,
  }));

  // Очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Автоматическая прокрутка при новых сообщениях
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [messages]);

  // Фокус на поле ввода и пометка сообщений как прочитанных при открытии
  useEffect(() => {
    if (isOpen) {
      markAllAsRead();
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, markAllAsRead]);

  const addMessage = useCallback(async (content: string, type: 'user' | 'assistant', isVoice = false) => {
    try {
      await addDbMessage(type, content);
    } catch (error) {
      console.error('[VoiceAssistant] Error saving message:', error);
    }
  }, [addDbMessage]);

  const startRecording = useCallback(async () => {
    try {
      console.log('Requesting microphone access...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Ваш браузер не поддерживает запись аудио');
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Ваш браузер не поддерживает запись аудио (MediaRecorder). Обновите браузер.');
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(isMobile ? {
            sampleRate: 16000,
            channelCount: 1
          } : {
            sampleRate: 16000,
            channelCount: 1
          })
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Microphone access granted');
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext!)();
      if (audioContextRef.current.state === 'suspended') {
        try { await audioContextRef.current.resume(); } catch {}
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      let mimeType = 'audio/webm;codecs=opus';
      try {
        const checkMimeType = (type: string) => MediaRecorder.isTypeSupported(type);
        
        if (isIOS) {
          if (checkMimeType('audio/mp4;codecs=mp4a.40.2')) {
            mimeType = 'audio/mp4;codecs=mp4a.40.2';
          } else if (checkMimeType('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (checkMimeType('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (checkMimeType('audio/ogg')) {
            mimeType = 'audio/ogg';
          }
        } else if (isMobile) {
          if (checkMimeType('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (checkMimeType('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else if (checkMimeType('audio/mp4')) {
            mimeType = 'audio/mp4';
          }
        }
      } catch {}
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Audio blob created, size:', audioBlob.size, 'type:', mimeType);
        
        if (audioBlob.size > 0 && processAudioRef.current) {
          await processAudioRef.current(audioBlob);
        } else {
          toast.error('Не удалось записать аудио');
          setIsRecording(false);
          setIsProcessing(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
      
      mediaRecorder.start(500);
      setIsRecording(true);
      
      startSilenceDetection();
      
      if (isMobile) {
        setTimeout(() => {
          if (isRecording && mediaRecorderRef.current?.state === 'recording') {
            console.log('Auto-stopping recording on mobile after 15s');
            stopRecording();
          }
        }, 15000);
      }
      
    } catch (error: unknown) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
      
      let errorMessage = 'Ошибка доступа к микрофону';
      const err = error as { name?: string; message?: string };
      if (err.name === 'NotAllowedError') {
        errorMessage = isMobile 
          ? 'Доступ к микрофону запрещен. Нажмите на иконку замка в адресной строке и разрешите доступ к микрофону, затем обновите страницу.'
          : 'Доступ к микрофону запрещен. Разрешите доступ в настройках браузера и обновите страницу.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Микрофон не найден. Проверьте подключение микрофона.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Ваш браузер не поддерживает запись аудио.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Ошибка безопасности. Попробуйте использовать HTTPS соединение.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    }
  }, [isMobile, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  }, [isRecording]);

  const startSilenceDetection = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let consecutiveSilenceChecks = 0;
    const maxSilenceChecks = 20;
    
    const checkAudioLevel = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const silenceThreshold = 25;
      
      if (average < silenceThreshold) {
        consecutiveSilenceChecks++;
        if (consecutiveSilenceChecks >= maxSilenceChecks) {
          console.log('Stopping recording due to silence');
          stopRecording();
          return;
        }
      } else {
        consecutiveSilenceChecks = 0;
      }
      
      if (isRecording) {
        silenceTimerRef.current = setTimeout(checkAudioLevel, 100);
      }
    };
    
    silenceTimerRef.current = setTimeout(checkAudioLevel, 1000);
  }, [isRecording, stopRecording]);

  const processMessage = useCallback(async (message: string, isVoice = false) => {
    if (!message.trim()) return;
    
    try {
      setIsProcessing(true);
      
      // Добавляем сообщение пользователя
      addMessage(message, 'user', isVoice);
      
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          text: message,
          userId: user?.id,
          context: context ? {
            currentPage: context.currentPage,
            activeClientId: context.activeClientId || undefined,
            activeClientName: context.activeClientName || undefined,
            userRole: context.userRole,
            userBranch: context.userBranch,
            activeChatType: context.activeChatType
          } : undefined
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error('Ошибка сервера');
      }
      
      if (data?.success) {
        const response = data.response || 'Нет ответа';
        addMessage(response, 'assistant');

        // Выполняем действия если есть
        if (data.actionResult) {
          executeActionResult(data.actionResult);
        }

        // Инвалидируем задачи при любых изменениях с задачами
        const resultType = data.actionResult?.type;
        if (resultType === 'task_created' || resultType === 'create_task' || resultType === 'multiple_tasks_created' || 
            resultType === 'task_updated' || resultType === 'tasks_deleted' || resultType === 'delete_error') {
          
          if (Array.isArray(data.actionResult?.deletedTasks) && data.actionResult.deletedTasks.length > 0) {
            const deletedTasks = data.actionResult.deletedTasks as DeletedTask[];
            const deletedIds = deletedTasks.map((t) => t.id);
            const updateFn = (old: unknown) => {
              if (!old) return old;
              if (Array.isArray(old)) return old.filter((task: { id?: string }) => !deletedIds.includes(task.id || ''));
              return old;
            };
            type QueryKey = readonly unknown[];
            const keys: QueryKey[] = [ ['tasks'], ['all-tasks'] ];
            if (context?.activeClientId) keys.push(['tasks', context.activeClientId]);
            keys.forEach((key) => queryClient.setQueriesData({ queryKey: key }, updateFn));
            queryClient.setQueriesData({
              predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'tasks-by-date'
            }, updateFn);
          }
          
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
          
          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          queryClient.invalidateQueries({ queryKey: ['tasks-by-date', today] });
          queryClient.invalidateQueries({ queryKey: ['tasks-by-date', tomorrow] });
          queryClient.invalidateQueries({ queryKey: ['tasks-by-date'] });
          
          if (context?.activeClientId) {
            queryClient.invalidateQueries({ queryKey: ['tasks', context.activeClientId] });
          }
          
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && key.includes('task');
            }
          });
        }
        
        // Воспроизводим голосовой ответ
        if (audioEnabled && data.audioResponse) {
          await playAudioResponse(data.audioResponse);
        }
      } else {
        throw new Error(data?.error || 'Неизвестная ошибка');
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обработки сообщения';
      addMessage(`Извините, произошла ошибка: ${errorMessage}`, 'assistant');
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, context, audioEnabled, queryClient]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      if (audioBlob.size < 1000) {
        toast.error('Слишком короткая запись');
        setIsProcessing(false);
        return;
      }
      
      console.log('Processing audio blob size:', audioBlob.size);
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000;
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Audio = btoa(binaryString);
      
      console.log('Audio converted to base64, length:', base64Audio.length);
      
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          audio: base64Audio,
          userId: user?.id,
          context: context ? {
            currentPage: context.currentPage,
            activeClientId: context.activeClientId || undefined,
            activeClientName: context.activeClientName || undefined,
            userRole: context.userRole,
            userBranch: context.userBranch,
            activeChatType: context.activeChatType
          } : undefined
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error('Ошибка сервера');
      }
      
      if (data?.success) {
        const userMessage = data.transcription || 'Команда не распознана';
        const response = data.response || 'Нет ответа';
        
        // Добавляем сообщения в чат
        addMessage(userMessage, 'user', true);
        addMessage(response, 'assistant');

        // Выполняем действия если есть
        if (data.actionResult) {
          executeActionResult(data.actionResult);
        }

        // Воспроизводим голосовой ответ
        if (audioEnabled && data.audioResponse) {
          await playAudioResponse(data.audioResponse);
        }
      } else {
        throw new Error(data?.error || 'Неизвестная ошибка');
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обработки команды';
      addMessage(`Извините, произошла ошибка: ${errorMessage}`, 'assistant');
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, context, audioEnabled, queryClient]);

  useEffect(() => {
    processAudioRef.current = processAudio;
  }, [processAudio]);

  const executeActionResult = (actionResult: ActionResult) => {
    switch (actionResult.type) {
      case 'chat_opened':
        if (actionResult.clientId && onOpenChat) {
          setTimeout(() => onOpenChat(actionResult.clientId!), 100);
        }
        break;
      case 'modal_opened':
        if (actionResult.modalType && onOpenModal) {
          const modalType = actionResult.modalType;
          if (modalType === 'add_client' && onOpenModal.addClient) {
            setTimeout(() => onOpenModal.addClient!(), 100);
          } else if (modalType === 'add_teacher' && onOpenModal.addTeacher) {
            setTimeout(() => onOpenModal.addTeacher!(), 100);
          } else if (modalType === 'add_student' && onOpenModal.addStudent) {
            setTimeout(() => onOpenModal.addStudent!(), 100);
          } else if (modalType === 'add_task' && onOpenModal.addTask) {
            setTimeout(() => onOpenModal.addTask!(), 100);
          } else if (modalType === 'profile' && onOpenModal.clientProfile && actionResult.clientId) {
            setTimeout(() => onOpenModal.clientProfile!(actionResult.clientId!), 100);
          } else if (modalType === 'edit_task' && onOpenModal.editTask && actionResult.taskId) {
            setTimeout(() => onOpenModal.editTask!(actionResult.taskId!), 100);
          }
        }
        break;
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    try {
      setIsSpeaking(true);
      
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      console.log('Playing audio response, base64 length:', base64Audio.length);
      
      let audioBlob: Blob;
      try {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        console.log('Audio blob created, size:', audioBlob.size);
      } catch (decodeError) {
        console.error('Base64 decode error:', decodeError);
        throw new Error('Ошибка декодирования аудио');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        console.log('Audio playback ended');
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        toast.error('Ошибка воспроизведения ответа');
      };
      
      console.log('Starting audio playback');
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio response:', error);
      setIsSpeaking(false);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка воспроизведения голосового ответа';
      toast.error(errorMessage);
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      processMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen && !embedded) {
    return null;
  }

  // Встроенный режим - только содержимое без Card
  if (embedded) {
    return (
      <div className="relative flex flex-col flex-1 min-h-0 h-full">
        {/* Chat Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-auto">
          <div className="space-y-3 p-4 pb-24">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <div className="flex justify-center mb-4">
                  <AnimatedLogo size={120} isActive={isRecording || isProcessing || isSpeaking} />
                </div>
                <p className="text-sm">Привет! Я ваш AI-ассистент.</p>
                <p className="text-xs mt-1">Напишите сообщение или нажмите на микрофон</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={`text-xs ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex-1 space-y-1 ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}>
                  <div className={`inline-block px-3 py-2 rounded-lg max-w-[85%] text-sm ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}>
                    <div className="flex items-center gap-1 mb-1">
                      {message.isVoice && (
                        <Mic className="h-3 w-3 opacity-70" />
                      )}
                      <span className="text-xs opacity-70">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="inline-block px-3 py-2 rounded-lg bg-muted text-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t bg-background absolute inset-x-0 bottom-0">
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex gap-2">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите сообщение..."
              disabled={isProcessing}
              className="flex-1 h-9"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isProcessing}
              size="sm"
              className="px-3 h-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex gap-1">
            {isSpeaking && (
              <Button
                onClick={stopSpeaking}
                size="sm"
                variant="secondary"
                className="px-3 h-9"
              >
                <VolumeX className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing && !isRecording}
              size="sm"
              variant={isRecording ? "destructive" : "outline"}
              className="px-3 h-9"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {isRecording && (
          <div className="mt-2 text-center">
            <div className="text-xs text-muted-foreground animate-pulse">
              🎤 Запись... Говорите сейчас
            </div>
          </div>
        )}
      </div>
      </div>
    );
  }

  // Полный режим - Card с заголовком
  return (
    <Card className={`fixed shadow-xl bg-background border z-50 ${
      isMobile 
        ? 'bottom-20 right-2 left-2 w-auto h-[70vh]'
        : 'bottom-6 right-6 w-96 h-[80vh]'
    } flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Ассистент</h3>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Очистить всю историю сообщений?')) {
                  clearHistory();
                }
              }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              title="Очистить историю"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="h-8 w-8 p-0"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" 
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <div className="flex justify-center mb-4">
                <AnimatedLogo size={120} isActive={isRecording || isProcessing || isSpeaking} />
              </div>
              <p className="text-sm">Привет! Я ваш AI-ассистент.</p>
              <p className="text-xs mt-1">Напишите сообщение или нажмите на микрофон</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={`text-xs ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex-1 space-y-1 ${
                message.type === 'user' ? 'text-right' : 'text-left'
              }`}>
                <div className={`inline-block px-3 py-2 rounded-lg max-w-[85%] text-sm ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  <div className="flex items-center gap-1 mb-1">
                    {message.isVoice && (
                      <Mic className="h-3 w-3 opacity-70" />
                    )}
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="inline-block px-3 py-2 rounded-lg bg-muted text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t shrink-0 sticky bottom-0 bg-background">
        <div className="flex gap-2">
          <div className="flex-1 flex gap-2">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите сообщение..."
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isProcessing}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-9" />
          
          <div className="flex gap-1">
            {isSpeaking && (
              <Button
                onClick={stopSpeaking}
                size="sm"
                variant="secondary"
                className="px-3"
              >
                <VolumeX className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing && !isRecording}
              size="sm"
              variant={isRecording ? "destructive" : "outline"}
              className="px-3"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {isRecording && (
          <div className="mt-2 text-center">
            <div className="text-xs text-muted-foreground animate-pulse">
              🎤 Запись... Говорите сейчас
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}