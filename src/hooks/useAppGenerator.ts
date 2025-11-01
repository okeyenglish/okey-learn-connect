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
  const [resolvedTeacherId, setResolvedTeacherId] = useState<string | null>(null);

  const ensureTeacherId = async (): Promise<string> => {
    if (resolvedTeacherId) return resolvedTeacherId;
    const { data, error } = await supabase
      .from('teachers' as any)
      .select('id')
      .or(`id.eq.${teacherId},profile_id.eq.${teacherId}`)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error('teacher_not_found');
    }
    const id = (data as any).id as string;
    setResolvedTeacherId(id);
    return id;
  };

  // Suggest or generate
  const suggestOrGenerate = useMutation({
    mutationFn: async ({ brief, answers }: { brief: string; answers?: any }) => {
      const tid = await ensureTeacherId();
      const { data, error } = await supabase.functions.invoke('suggest-or-generate', {
        body: { teacher_id: tid, brief, answers }
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
      const tid = await ensureTeacherId();
      const { data, error } = await supabase.functions.invoke('generate-app', {
        body: { teacher_id: tid, prompt, app_id: appId }
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
      const tid = await ensureTeacherId();
      const { data, error } = await supabase.functions.invoke('improve-app', {
        body: { app_id: appId, improvement_request: request, teacher_id: tid }
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

  // Publish app
  const publishApp = useMutation({
    mutationFn: async ({ appId, title, description }: { appId: string; title: string; description: string }) => {
      const { error } = await supabase
        .from('apps')
        .update({ 
          title, 
          description, 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', appId);
      if (error) throw error;
      return { appId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast({ title: 'Приложение опубликовано!', description: 'Теперь оно доступно в каталоге' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка публикации', description: error.message, variant: 'destructive' });
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
    publishApp: publishApp.mutate,
    isGenerating: generateApp.isPending || improveApp.isPending,
    isSuggesting: suggestOrGenerate.isPending,
    isPublishing: publishApp.isPending,
    reset
  };
};
