import { useState } from 'react';
import { useToast } from './use-toast';
import { selfHostedPost } from '@/lib/selfHostedApi';

export const useAudioTranscription = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const transcribeAudio = async (audioUrl: string): Promise<string | null> => {
    setLoading(true);
    try {
      const response = await selfHostedPost<{ text?: string }>('transcribe-audio', { audioUrl });

      if (!response.success) {
        console.error('Transcription error:', response.error);
        toast({
          title: "Ошибка транскрибации",
          description: "Не удалось распознать речь",
          variant: "destructive",
        });
        return null;
      }

      if (response.data?.text) {
        return response.data.text;
      }

      return null;
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Ошибка транскрибации", 
        description: "Не удалось распознать речь",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    transcribeAudio,
    loading
  };
};