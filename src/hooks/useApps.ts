import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface App {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  kind: 'game' | 'trainer' | 'checker' | 'tool';
  description: string;
  lang: string;
  level: string;
  status: 'draft' | 'published' | 'archived' | 'blocked';
  latest_version: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogApp extends App {
  author_name: string;
  rating: number;
  installs: number;
  preview_url: string;
}

export const useApps = (teacherId?: string) => {
  const queryClient = useQueryClient();

  // Fetch catalog (all published apps)
  const { data: catalogApps, isLoading: catalogLoading } = useQuery({
    queryKey: ['apps', 'catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog' as any)
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as CatalogApp[];
    }
  });

  // Fetch my created apps
  const { data: myApps, isLoading: myAppsLoading } = useQuery({
    queryKey: ['apps', 'my', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const { data: teacher } = await supabase
        .from('teachers' as any)
        .select('id')
        .eq('user_id', teacherId)
        .maybeSingle();
      
      if (!teacher) return [];

      const { data, error } = await supabase
        .from('apps' as any)
        .select('*')
        .eq('author_id', (teacher as any).id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as App[];
    },
    enabled: !!teacherId
  });

  // Fetch installed apps
  const { data: installedApps, isLoading: installedLoading } = useQuery({
    queryKey: ['apps', 'installed', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const { data: teacher } = await supabase
        .from('teachers' as any)
        .select('id')
        .eq('user_id', teacherId)
        .maybeSingle();
      
      if (!teacher) return [];

      const { data, error } = await supabase
        .from('app_installs' as any)
        .select('app_id, installed_at, apps(*)')
        .eq('teacher_id', (teacher as any).id);
      
      if (error) throw error;
      return ((data || []) as any[]).map((i: any) => i.apps).filter(Boolean) as unknown as App[];
    },
    enabled: !!teacherId
  });

  // Install app mutation
  const installApp = useMutation({
    mutationFn: async ({ appId, teacherId }: { appId: string; teacherId: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-app', {
        body: { action: 'install', app_id: appId, teacher_id: teacherId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', 'installed'] });
      toast({ title: 'Приложение добавлено в "Мои приложения"' });
    },
    onError: (error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  // Uninstall app mutation
  const uninstallApp = useMutation({
    mutationFn: async ({ appId, teacherId }: { appId: string; teacherId: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-app', {
        body: { action: 'uninstall', app_id: appId, teacher_id: teacherId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', 'installed'] });
      toast({ title: 'Приложение удалено из "Моих приложений"' });
    },
    onError: (error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  // Rate app mutation
  const rateApp = useMutation({
    mutationFn: async ({ 
      appId, 
      teacherId, 
      rating, 
      comment 
    }: { 
      appId: string; 
      teacherId: string; 
      rating: number; 
      comment?: string 
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-app', {
        body: { action: 'rate', app_id: appId, teacher_id: teacherId, rating, comment }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', 'catalog'] });
      toast({ title: 'Спасибо за оценку!' });
    },
    onError: (error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  // Publish app mutation
  const publishApp = useMutation({
    mutationFn: async (appId: string) => {
      const { data, error } = await supabase.functions.invoke('publish-app', {
        body: { app_id: appId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.duplicate) {
        toast({ 
          title: 'Найден дубликат', 
          description: data.message, 
          variant: 'destructive' 
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['apps'] });
        toast({ title: 'Приложение опубликовано!' });
      }
    },
    onError: (error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  // Delete app mutation
  const deleteApp = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase
        .from('apps' as any)
        .delete()
        .eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast({ title: 'Приложение удалено' });
    },
    onError: (error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  return {
    catalogApps,
    catalogLoading,
    myApps,
    myAppsLoading,
    installedApps,
    installedLoading,
    installApp: installApp.mutate,
    uninstallApp: uninstallApp.mutate,
    rateApp: rateApp.mutate,
    publishApp: publishApp.mutate,
    deleteApp: deleteApp.mutate,
    isInstalling: installApp.isPending,
    isPublishing: publishApp.isPending
  };
};
