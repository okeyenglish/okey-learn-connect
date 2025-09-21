import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VoiceAssistantState {
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  lastCommand: string;
  lastResponse: string;
  actionResult: any;
}

export const useVoiceAssistant = () => {
  const [state, setState] = useState<VoiceAssistantState>({
    isRecording: false,
    isProcessing: false,
    isSpeaking: false,
    lastCommand: '',
    lastResponse: '',
    actionResult: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const { user } = useAuth();

  const updateState = useCallback((updates: Partial<VoiceAssistantState>) => {
    setState(prev => ({ ...prev, ...updates }));
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
        
        // Останавливаем все треки
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(1000);
      updateState({ isRecording: true });
      toast.success('Запись начата. Говорите...');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Ошибка доступа к микрофону');
    }
  }, [updateState]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      updateState({ isRecording: false, isProcessing: true });
      toast.info('Обработка команды...');
    }
  }, [state.isRecording, updateState]);

  const processAudio = async (audioBlob: Blob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          audio: base64Audio,
          userId: user?.id
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data.success) {
        updateState({
          lastCommand: data.transcription,
          lastResponse: data.response,
          actionResult: data.actionResult
        });
        
        toast.success(`Команда выполнена: ${data.response}`);
        
        // Воспроизводим голосовой ответ
        if (data.audioResponse) {
          await playAudioResponse(data.audioResponse);
        }
      } else {
        throw new Error(data.error);
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Ошибка обработки голосовой команды');
    } finally {
      updateState({ isProcessing: false });
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    try {
      updateState({ isSpeaking: true });
      
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
        updateState({ isSpeaking: false });
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        updateState({ isSpeaking: false });
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        toast.error('Ошибка воспроизведения ответа');
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio response:', error);
      updateState({ isSpeaking: false });
      toast.error('Ошибка воспроизведения голосового ответа');
    }
  };

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      updateState({ isSpeaking: false });
    }
  }, [updateState]);

  const sendTextCommand = useCallback(async (command: string) => {
    try {
      updateState({ isProcessing: true });
      
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          command: command,
          userId: user?.id
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data.success) {
        updateState({
          lastCommand: command,
          lastResponse: data.response,
          actionResult: data.actionResult
        });
        
        toast.success(`Команда выполнена: ${data.response}`);
        
        if (data.audioResponse) {
          await playAudioResponse(data.audioResponse);
        }
      } else {
        throw new Error(data.error);
      }
      
    } catch (error) {
      console.error('Error processing text command:', error);
      toast.error('Ошибка обработки команды');
    } finally {
      updateState({ isProcessing: false });
    }
  }, [updateState, user?.id]);

  return {
    ...state,
    startRecording,
    stopRecording,
    stopSpeaking,
    sendTextCommand
  };
};