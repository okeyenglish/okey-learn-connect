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
  action?: string;
  title?: string;
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
      
      mediaRecorder.start(100); // Записываем чанками по 100мс для лучшего отклика
      setIsRecording(true);
      toast.success('Запись начата. Говорите...');
      
      // Запускаем мониторинг тишины
      startSilenceDetection();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Ошибка доступа к микрофону');
    }
  }, []);

  // Определение тишины для автоматической остановки записи
  const startSilenceDetection = useCallback(() => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevel = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Вычисляем средний уровень звука
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      // Порог тишины (можно настроить)
      const silenceThreshold = 20;
      
      if (average < silenceThreshold) {
        // Если тишина, запускаем таймер
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (isRecording) {
              stopRecording();
            }
          }, 2000); // Останавливаем через 2 секунды тишины
        }
      } else {
        // Если есть звук, сбрасываем таймер
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
      
      // Продолжаем мониторинг
      if (isRecording) {
        requestAnimationFrame(checkAudioLevel);
      }
    };
    
    checkAudioLevel();
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
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

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Проверяем минимальный размер аудио
      if (audioBlob.size < 1000) {
        toast.error('Слишком короткая запись');
        return;
      }
      
      // Конвертируем аудио в base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
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
      
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        toast.error('Ошибка воспроизведения ответа');
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio response:', error);
      setIsSpeaking(false);
      toast.error('Ошибка воспроизведения голосового ответа');
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
              {actionResult.data.map((client: any) => (
                <Badge key={client.id} variant="secondary">
                  {client.name}
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
                <Badge key={teacher.id} variant="secondary">
                  {teacher.name}
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
      
      case 'schedule':
        return (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Расписание:</p>
            <div className="space-y-2">
              {actionResult.data.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="text-sm bg-muted p-2 rounded">
                  <strong>{item.name}</strong><br />
                  {item.compact_days} {item.compact_time}
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
                  Запись... Говорите сейчас
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Остановится автоматически через 2 сек тишины
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
            <li>• "Покажи расписание на сегодня"</li>
            <li>• "Закрепи чат с Марией"</li>
            <li>• "Найди преподавателя Елена"</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}