import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';

interface VoiceAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
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

interface ActionResult {
  type: string;
  data?: any;
  clientName?: string;
  clientId?: string;
  action?: string;
  title?: string;
  filter?: string;
  status?: string;
  modalType?: string;
  taskId?: string;
  deletedCount?: number;
  deletedTasks?: any[];
}

export default function VoiceAssistant({ 
  isOpen, 
  onToggle, 
  context,
  onOpenModal,
  onOpenChat 
}: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const isMobile = useIsMobile();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processAudioRef = useRef<((blob: Blob) => Promise<void>) | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const startRecording = useCallback(async () => {
    try {
      console.log('Requesting microphone access...');
      
      // Проверяем поддержку медиа API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Ваш браузер не поддерживает запись аудио');
      }

      // Дополнительно проверяем поддержку MediaRecorder
      if (typeof (window as any).MediaRecorder === 'undefined') {
        throw new Error('Ваш браузер не поддерживает запись аудио (MediaRecorder). Обновите браузер.');
      }

      // Специальная обработка для мобильных устройств  
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(isMobile ? {
            sampleRate: 16000, // Меньше для мобильных
            channelCount: 1
          } : {
            sampleRate: 16000,
            channelCount: 1
          })
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Microphone access granted');
      
      // Создаем аудио контекст для определения тишины
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        try { await audioContextRef.current.resume(); } catch {}
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Проверяем поддержку различных форматов (особенно для iOS)
      let mimeType = 'audio/webm;codecs=opus';
      try {
        if (isIOS) {
          if ((MediaRecorder as any).isTypeSupported?.('audio/mp4;codecs=mp4a.40.2')) {
            mimeType = 'audio/mp4;codecs=mp4a.40.2';
          } else if ((MediaRecorder as any).isTypeSupported?.('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if ((MediaRecorder as any).isTypeSupported?.('audio/webm')) {
            mimeType = 'audio/webm';
          } else if ((MediaRecorder as any).isTypeSupported?.('audio/ogg')) {
            mimeType = 'audio/ogg';
          }
        } else if (isMobile) {
          if ((MediaRecorder as any).isTypeSupported?.('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if ((MediaRecorder as any).isTypeSupported?.('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else if ((MediaRecorder as any).isTypeSupported?.('audio/mp4')) {
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
        
        // Останавливаем все треки и очищаем ресурсы
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
      
      mediaRecorder.start(500); // Записываем чанками по 500мс для лучшего отклика
      setIsRecording(true);
      toast.success('Запись начата. Говорите...');
      
      // Запускаем мониторинг тишины
      startSilenceDetection();
      
      // Автоматическая остановка через 15 секунд для мобильных
      if (isMobile) {
        setTimeout(() => {
          if (isRecording && mediaRecorderRef.current?.state === 'recording') {
            console.log('Auto-stopping recording on mobile after 15s');
            stopRecording();
          }
        }, 15000);
      }
      
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
      
      let errorMessage = 'Ошибка доступа к микрофону';
      if (error.name === 'NotAllowedError') {
        errorMessage = isMobile 
          ? 'Доступ к микрофону запрещен. Нажмите на иконку замка в адресной строке и разрешите доступ к микрофону, затем обновите страницу.'
          : 'Доступ к микрофону запрещен. Разрешите доступ в настройках браузера и обновите страницу.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Микрофон не найден. Проверьте подключение микрофона.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Ваш браузер не поддерживает запись аудио.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Ошибка безопасности. Попробуйте использовать HTTPS соединение.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  }, [isMobile, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      
      // Очищаем таймер тишины
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      toast.info('Обработка команды...');
    }
  }, [isRecording]);

  // Определение тишины для автоматической остановки записи
  const startSilenceDetection = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let consecutiveSilenceChecks = 0;
    const maxSilenceChecks = 20; // ~2 секунды при 100мс интервалах
    
    const checkAudioLevel = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Вычисляем средний уровень звука
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      // Порог тишины (можно настроить)
      const silenceThreshold = 25;
      
      console.log('Audio level:', average); // Для отладки
      
      if (average < silenceThreshold) {
        consecutiveSilenceChecks++;
        console.log('Silence detected, count:', consecutiveSilenceChecks);
        
        if (consecutiveSilenceChecks >= maxSilenceChecks) {
          console.log('Stopping recording due to silence');
          stopRecording();
          return;
        }
      } else {
        // Если есть звук, сбрасываем счетчик
        consecutiveSilenceChecks = 0;
      }
      
      // Продолжаем мониторинг каждые 100мс только если запись активна
      if (isRecording) {
        silenceTimerRef.current = setTimeout(checkAudioLevel, 100);
      }
    };
    
    // Начинаем проверку через 1 секунду (даем время для начала речи)
    silenceTimerRef.current = setTimeout(checkAudioLevel, 1000);
  }, [isRecording, stopRecording]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // Проверяем минимальный размер аудио
      if (audioBlob.size < 1000) {
        toast.error('Слишком короткая запись');
        setIsProcessing(false);
        return;
      }
      
      console.log('Processing audio blob size:', audioBlob.size);
      console.log('VA context to send:', context);
      
      // Конвертируем аудио в base64 безопасно: собираем бинарную строку чанками, затем один раз btoa
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000; // 32KB
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
        setLastCommand(data.transcription || 'Команда не распознана');
        setLastResponse(data.response || 'Нет ответа');
        setActionResult(data.actionResult);

        // Автоматически прокручиваем вниз после получения нового ответа
        setTimeout(() => {
          if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
              scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
              });
            }
          }
        }, 100);

        // Инвалидируем задачи при создании новой
        const resultType = data.actionResult?.type;
        if (resultType === 'task_created' || resultType === 'create_task' || resultType === 'multiple_tasks_created' || resultType === 'task_updated' || resultType === 'tasks_deleted') {
          // Конкретный клиент
          if (context?.activeClientId) {
            queryClient.invalidateQueries({ queryKey: ['tasks', context.activeClientId] });
          }
          // Глобальные списки задач
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['tasks-by-date'] });
        }
        
        toast.success(`Команда выполнена: ${data.response}`);
        
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
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, context, audioEnabled, queryClient]);

  useEffect(() => {
    processAudioRef.current = processAudio;
  }, [processAudio]);

  const playAudioResponse = async (base64Audio: string) => {
    try {
      setIsSpeaking(true);
      
      // Останавливаем предыдущий аудио если играет
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      
      console.log('Playing audio response, base64 length:', base64Audio.length);
      
      // Безопасное декодирование base64
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

  const renderActionResult = () => {
    if (!actionResult) return null;

    switch (actionResult.type) {
      case 'clients':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Найденные клиенты:</p>
            <div className="space-y-1">
              {(actionResult.data || []).slice(0, 5).map((client: any) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  onClick={() => {
                    if (onOpenModal?.clientProfile) {
                      onOpenModal.clientProfile(client.id);
                    }
                  }}
                >
                  <Badge variant="secondary" className="mr-1">
                    {client.name} ({client.branch})
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenChat) {
                        onOpenChat(client.id);
                      }
                    }}
                  >
                    💬 Чат
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'teachers':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Найденные преподаватели:</p>
            <div className="space-y-1">
              {(actionResult.data || []).map((teacher: any) => (
                <Badge key={teacher.id} variant="secondary" className="mr-1">
                  {teacher.name.replace(/^(преподаватель:|teacher:)/i, '')}
                </Badge>
              ))}
            </div>
          </div>
        );
      
      case 'message_sent':
        return (
          <div className="mt-4">
            <Badge variant="default" className="bg-green-100 text-green-800">
              ✓ Сообщение отправлено клиенту {actionResult.clientName}
            </Badge>
          </div>
        );
      
      case 'task_created':
        return (
          <div className="mt-4">
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              ✓ Задача "{actionResult.title}" создана
              {actionResult.clientName && ` для ${actionResult.clientName}`}
            </Badge>
          </div>
        );

      case 'tasks':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Задачи ({actionResult.filter}): {(actionResult.data || []).length}
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(actionResult.data || []).slice(0, 5).map((task: any) => (
                <div 
                  key={task.id} 
                  className="text-xs bg-muted p-2 rounded cursor-pointer hover:bg-muted/80 transition-colors border-l-2 border-l-primary/50"
                  onClick={() => {
                    if (onOpenModal?.editTask) {
                      onOpenModal.editTask(task.id);
                    }
                  }}
                >
                  <div className="font-medium text-primary">{task.title}</div>
                  <div className="text-muted-foreground flex items-center justify-between">
                    <div>
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                        task.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      {task.status === 'active' ? 'Активна' : 'Выполнена'}
                      {task.due_date && ` • ${task.due_date}`}
                    </div>
                    {task.client_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenChat) {
                            onOpenChat(task.client_id);
                          }
                        }}
                      >
                        💬
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {(actionResult.data || []).length > 5 && (
              <p className="text-xs text-muted-foreground mt-1">
                И ещё {(actionResult.data || []).length - 5} задач...
              </p>
            )}
          </div>
        );

      case 'task_updated':
        return (
          <div className="mt-4">
            <Badge variant="default" className="bg-green-100 text-green-800">
              ✓ Задача {actionResult.status === 'completed' ? 'выполнена' : 'обновлена'}
            </Badge>
          </div>
        );

      case 'tasks_deleted':
        return (
          <div className="mt-4">
            <Badge variant="default" className="bg-red-100 text-red-800">
              ✓ Удалено задач: {actionResult.deletedCount}
            </Badge>
            {actionResult.deletedTasks && actionResult.deletedTasks.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground max-h-20 overflow-y-auto">
                {actionResult.deletedTasks.slice(0, 3).map((task: any, index: number) => (
                  <div key={index} className="truncate">"{task.title}"</div>
                ))}
                {actionResult.deletedTasks.length > 3 && (
                  <div>и ещё {actionResult.deletedTasks.length - 3} задач...</div>
                )}
              </div>
            )}
          </div>
        );
      
      case 'delete_error':
        return (
          <div className="mt-4">
            <Badge variant="destructive" className="bg-red-100 text-red-800">
              ❌ Ошибка удаления
            </Badge>
          </div>
        );
      
      case 'chat_managed':
        return (
          <div className="mt-4">
            <Badge variant="default" className="bg-purple-100 text-purple-800">
              ✓ Чат с {actionResult.clientName} {actionResult.action === 'pin' ? 'закреплён' : 
                actionResult.action === 'archive' ? 'архивирован' : 'отмечен прочитанным'}
            </Badge>
          </div>
        );

      case 'chat_opened':
        return (
          <div className="mt-4">
            <Badge variant="default" className="bg-green-100 text-green-800">
              ✓ Открыт чат с {actionResult.clientName}
            </Badge>
            {/* Реально открываем чат */}
            {actionResult.clientId && onOpenChat && (
              (() => {
                setTimeout(() => onOpenChat(actionResult.clientId!), 100);
                return null;
              })()
            )}
          </div>
        );

      case 'modal_opened':
        return (
          <div className="mt-4">
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              ✓ Открыто модальное окно
            </Badge>
            {/* Реально открываем модальное окно */}
            {actionResult.modalType && onOpenModal && (
              (() => {
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
                return null;
              })()
            )}
          </div>
        );

      case 'client_info':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Информация о клиенте:</p>
            <div className="text-sm bg-muted p-2 rounded max-h-32 overflow-y-auto">
              {actionResult.data && (
                <>
                  <div><strong>{actionResult.data.name}</strong></div>
                  <div>Филиал: {actionResult.data.branch}</div>
                  {actionResult.data.phone && <div>Телефон: {actionResult.data.phone}</div>}
                  {actionResult.data.students?.length > 0 && (
                    <div>Студенты: {actionResult.data.students.map((s: any) => s.name).join(', ')}</div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      
      case 'schedule':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Расписание:</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {(actionResult.data || []).slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="text-sm bg-muted p-2 rounded">
                  <strong>{item.name}</strong> ({item.office_name})<br />
                  {item.compact_days} {item.compact_time}
                  {item.vacancies > 0 && <span className="text-green-600"> • {item.vacancies} мест</span>}
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const handleMicrophoneClick = async () => {
    onToggle(); // Открываем окно ассистента
    // Небольшая задержка, чтобы окно успело открыться
    setTimeout(() => {
      if (!isRecording && !isProcessing && !isSpeaking) {
        startRecording();
      }
    }, 100);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleMicrophoneClick}
        size="lg"
        className={`fixed shadow-lg bg-gradient-primary hover:shadow-elevated z-50 rounded-full h-14 w-14 ${
          isMobile 
            ? 'bottom-20 right-4' // На мобильных выше, чтобы не перекрывать поле ввода
            : 'bottom-6 right-6'   // На десктопе как было
        }`}
      >
        <Mic className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed shadow-xl bg-background border z-50 ${
      isMobile 
        ? 'bottom-20 right-2 left-2 w-auto max-h-[70vh]' // На мобильных растягиваем на всю ширину с отступами и ограничиваем высоту
        : 'bottom-6 right-6 w-80 max-h-[80vh]'           // На десктопе фиксированная ширина и высота
    } flex flex-col`}>
      <div className="flex items-center justify-between p-4 pb-2 shrink-0">
        <h3 className="font-semibold">Голосовой ассистент</h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" 
            size="sm"
            onClick={onToggle}
          >
            ✕
          </Button>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 pt-0">
        <div className="space-y-4">
          {/* Статус и управление */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {!isProcessing && !isSpeaking && (
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className="rounded-full h-12 w-12"
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              )}
              
              {isSpeaking && (
                <Button
                  onClick={stopSpeaking}
                  size="lg"
                  variant="secondary"
                  className="rounded-full h-12 w-12"
                >
                  <VolumeX className="h-5 w-5" />
                </Button>
              )}
              
              {isProcessing && (
                <Button
                  disabled
                  size="lg"
                  className="rounded-full h-12 w-12"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                </Button>
              )}
            </div>

            <div className="text-center">
              {isRecording && (
                <div className="space-y-2">
                  <Badge variant="destructive" className="animate-pulse">
                    🎤 Запись... Говорите сейчас
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Остановится автоматически при тишине или нажмите кнопку
                  </p>
                </div>
              )}
              {isProcessing && (
                <Badge variant="secondary">
                  Обработка...
                </Badge>
              )}
              {isSpeaking && (
                <Badge variant="default" className="animate-pulse">
                  Воспроизведение...
                </Badge>
              )}
              {!isRecording && !isProcessing && !isSpeaking && (
                <Badge variant="outline">
                  Готов к команде
                </Badge>
              )}
            </div>
          </div>

          {/* Последняя команда и ответ */}
          {lastCommand && (
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Команда:</p>
                <p className="text-sm bg-muted p-2 rounded">{lastCommand}</p>
              </div>
              
              {lastResponse && (
                <div>
                  <p className="text-xs text-muted-foreground">Ответ:</p>
                  <p className="text-sm bg-primary/10 p-2 rounded">{lastResponse}</p>
                </div>
              )}
              
              {renderActionResult()}
            </div>
          )}

          {/* Подсказки */}
          <div className="text-xs text-muted-foreground">
            {isMobile && (
              <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
                <p className="font-medium mb-1">📱 Для работы на мобильном:</p>
                <p>• Разрешите доступ к микрофону в браузере</p>
                <p>• Используйте HTTPS соединение</p>
                <p>• Говорите четко и громко</p>
              </div>
            )}
            <p className="font-medium mb-1">Примеры команд:</p>
            <ul className="space-y-1">
              <li>• "Найди клиента Иван"</li>
              <li>• "Отправь сообщение Анне что урок переносится"</li>
              <li>• "Создай задачу позвонить клиенту"</li>
              <li>• "Покажи мои задачи на сегодня"</li>
              <li>• "Какие у меня просроченные задачи?"</li>
              <li>• "Покажи расписание на сегодня"</li>
              <li>• "Открой чат с Марией"</li>
              <li>• "Найди преподавателя Елена"</li>
              <li>• "Открой окно добавления клиента"</li>
              <li>• "Покажи информацию о клиенте Иван"</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}