import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from '@/hooks/use-toast';
import { selfHostedPost } from '@/lib/selfHostedApi';

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

interface TeacherRow {
  id: string;
  profile_id?: string;
}

interface AppInstallRow {
  app_id: string;
  installed_at: string;
  apps: App | null;
}

export const useApps = (teacherId?: string) => {
  const queryClient = useQueryClient();

  // Fetch catalog (all published apps)
  const { data: catalogApps, isLoading: catalogLoading } = useQuery({
    queryKey: ['apps', 'catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog')
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
        .from('teachers')
        .select('id')
        .or(`user_id.eq.${teacherId},id.eq.${teacherId},profile_id.eq.${teacherId}`)
        .maybeSingle();
      
      if (!teacher) return [];

      const teacherRow = teacher as TeacherRow;

      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('author_id', teacherRow.id)
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
        .from('teachers')
        .select('id, profile_id')
        .or(`user_id.eq.${teacherId},id.eq.${teacherId},profile_id.eq.${teacherId}`)
        .maybeSingle();
      
      if (!teacher) return [];

      const teacherRow = teacher as TeacherRow;

      const { data, error } = await supabase
        .from('app_installs')
        .select('app_id, installed_at, apps(*)')
        .or(`teacher_id.eq.${teacherRow.id},teacher_id.eq.${teacherRow.profile_id || teacherRow.id}`);
      
      
      if (error) throw error;
      const rows = (data || []) as unknown as AppInstallRow[];
      return rows.map((i) => i.apps).filter(Boolean) as App[];
    },
    enabled: !!teacherId
  });

  // Install app mutation
  const installApp = useMutation({
    mutationFn: async ({ appId, teacherId }: { appId: string; teacherId: string }) => {
      const response = await selfHostedPost('manage-app', { 
        action: 'install', 
        app_id: appId, 
        teacher_id: teacherId 
      });
      if (!response.success) throw new Error(response.error || 'Failed to install app');
      return response.data;
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
      const response = await selfHostedPost('manage-app', { 
        action: 'uninstall', 
        app_id: appId, 
        teacher_id: teacherId 
      });
      if (!response.success) throw new Error(response.error || 'Failed to uninstall app');
      return response.data;
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
      const response = await selfHostedPost('manage-app', { 
        action: 'rate', 
        app_id: appId, 
        teacher_id: teacherId, 
        rating, 
        comment 
      });
      if (!response.success) throw new Error(response.error || 'Failed to rate app');
      return response.data;
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
      const response = await selfHostedPost<{ duplicate?: boolean; message?: string }>('publish-app', { app_id: appId });
      if (!response.success) throw new Error(response.error || 'Failed to publish app');
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.duplicate) {
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

  // Unpublish app mutation
  const unpublishApp = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase
        .from('apps')
        .update({ status: 'draft', published_at: null })
        .eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast({ title: 'Приложение снято с публикации' });
    },
    onError: (error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  // Delete app mutation
  const deleteApp = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase
        .from('apps')
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
    unpublishApp: unpublishApp.mutate,
    deleteApp: deleteApp.mutate,
    isInstalling: installApp.isPending,
    isPublishing: publishApp.isPending
  };
};
