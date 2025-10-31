import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GeneratorStage {
  stage: 'idle' | 'ask' | 'offer' | 'generate' | 'done';
  message?: string;
  questions?: Array<{
    key: string;
    q: string;
    options: string[];
  }>;
  suggestions?: any[];
  result?: {
    app_id: string;
    version: number;
    preview_url: string;
    meta: any;
  };
}

export const useAppGenerator = (teacherId: string) => {
  const [stage, setStage] = useState<GeneratorStage>({ stage: 'idle' });
  const queryClient = useQueryClient();

  // Suggest or generate
  const suggestOrGenerate = useMutation({
    mutationFn: async ({ brief, answers }: { brief: string; answers?: any }) => {
      const { data, error } = await supabase.functions.invoke('suggest-or-generate', {
        body: { teacher_id: teacherId, brief, answers }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setStage(data);
    },
    onError: (error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      setStage({ stage: 'idle' });
    }
  });

  // Generate app
  const generateApp = useMutation({
    mutationFn: async ({ prompt, appId }: { prompt: any; appId?: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-app', {
        body: { teacher_id: teacherId, prompt, app_id: appId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setStage({ stage: 'done', result: data });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast({ title: 'Приложение создано!' });
    },
    onError: (error: any) => {
      let errorMessage = error.message;
      
      if (error.message?.includes('OPENAI_API_KEY')) {
        errorMessage = 'OpenAI API ключ не настроен. Обратитесь к администратору.';
      } else if (error.message?.includes('apps') || error.message?.includes('relation')) {
        errorMessage = 'База данных не готова. Пожалуйста, подождите завершения настройки.';
      } else if (error.message?.includes('teacher')) {
        errorMessage = 'Профиль преподавателя не найден. Проверьте настройки аккаунта.';
      }
      
      toast({ title: 'Ошибка генерации', description: errorMessage, variant: 'destructive' });
      setStage({ stage: 'idle' });
    }
  });

  // Improve app
  const improveApp = useMutation({
    mutationFn: async ({ appId, request }: { appId: string; request: string }) => {
      const { data, error } = await supabase.functions.invoke('improve-app', {
        body: { app_id: appId, improvement_request: request, teacher_id: teacherId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setStage({ stage: 'done', result: data });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast({ title: 'Приложение улучшено!' });
    },
    onError: (error: any) => {
      let errorMessage = error.message;
      
      if (error.message?.includes('OPENAI_API_KEY')) {
        errorMessage = 'OpenAI API ключ не настроен. Обратитесь к администратору.';
      } else if (error.message?.includes('app_id') || error.message?.includes('not found')) {
        errorMessage = 'Приложение не найдено. Попробуйте обновить страницу.';
      }
      
      toast({ title: 'Ошибка улучшения', description: errorMessage, variant: 'destructive' });
    }
  });

  const reset = () => {
    setStage({ stage: 'idle' });
  };

  return {
    stage,
    suggestOrGenerate: suggestOrGenerate.mutate,
    generateApp: generateApp.mutate,
    improveApp: improveApp.mutate,
    isGenerating: generateApp.isPending || improveApp.isPending,
    isSuggesting: suggestOrGenerate.isPending,
    reset
  };
};
