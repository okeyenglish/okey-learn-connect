import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VoiceAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
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
}

export default function VoiceAssistant({ isOpen, onToggle }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const { user } = useAuth();

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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Создаем аудио контекст для определения тишины
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
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
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Ошибка доступа к микрофону');
    }
  }, []);

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

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Проверяем минимальный размер аудио
      if (audioBlob.size < 1000) {
        toast.error('Слишком короткая запись');
        setIsProcessing(false);
        return;
      }
      
      console.log('Processing audio blob size:', audioBlob.size);
      
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
          userId: user?.id
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
  };

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
              {actionResult.data.slice(0, 5).map((client: any) => (
                <Badge key={client.id} variant="secondary" className="mr-1">
                  {client.name} ({client.branch})
                </Badge>
              ))}
            </div>
          </div>
        );
      
      case 'teachers':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Найденные преподаватели:</p>
            <div className="space-y-1">
              {actionResult.data.map((teacher: any) => (
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
              Задачи ({actionResult.filter}): {actionResult.data.length}
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {actionResult.data.slice(0, 5).map((task: any) => (
                <div key={task.id} className="text-xs bg-muted p-2 rounded">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-muted-foreground">
                    {task.clients?.name && `${task.clients.name} • `}
                    {task.status === 'pending' ? 'Активна' : 'Выполнена'}
                    {task.due_date && ` • ${task.due_date}`}
                  </div>
                </div>
              ))}
            </div>
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
          </div>
        );

      case 'modal_opened':
        return (
          <div className="mt-4">
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              ✓ Открыто модальное окно
            </Badge>
          </div>
        );

      case 'client_info':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Информация о клиенте:</p>
            <div className="text-sm bg-muted p-2 rounded max-h-32 overflow-y-auto">
              <div><strong>{actionResult.data.name}</strong></div>
              <div>Филиал: {actionResult.data.branch}</div>
              {actionResult.data.phone && <div>Телефон: {actionResult.data.phone}</div>}
              {actionResult.data.students?.length > 0 && (
                <div>Студенты: {actionResult.data.students.map((s: any) => s.name).join(', ')}</div>
              )}
            </div>
          </div>
        );
      
      case 'schedule':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Расписание:</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {actionResult.data.slice(0, 5).map((item: any, index: number) => (
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

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        size="lg"
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg bg-gradient-primary hover:shadow-elevated z-50"
      >
        <Mic className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 p-4 shadow-xl bg-background border z-50">
      <div className="flex items-center justify-between mb-4">
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
    </Card>
  );
}