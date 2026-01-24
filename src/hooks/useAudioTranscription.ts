import { useState } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from './use-toast';

export const useAudioTranscription = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const transcribeAudio = async (audioUrl: string): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioUrl }
      });

      if (error) {
        console.error('Transcription error:', error);
        toast({
          title: "Ошибка транскрибации",
          description: "Не удалось распознать речь",
          variant: "destructive",
        });
        return null;
      }

      if (data?.text) {
        return data.text;
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