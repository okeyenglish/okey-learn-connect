import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useApps } from '@/hooks/useApps';
import { AppCard } from './AppCard';
import { AppViewer } from './AppViewer';
interface Teacher {
  id: string;
  [key: string]: any;
}

interface MyAppsProps {
  teacher: Teacher;
  onCreateNew: () => void;
}

export const MyApps = ({ teacher, onCreateNew }: MyAppsProps) => {
  const [selectedApp, setSelectedApp] = useState<{ id: string; url: string } | null>(null);
  
  const { 
    myApps, 
    myAppsLoading, 
    installedApps, 
    installedLoading,
    uninstallApp,
    publishApp,
    unpublishApp,
    deleteApp,
    isPublishing
  } = useApps((teacher as any).user_id || teacher.id);

  const handlePublish = (appId: string) => {
    if (confirm('Опубликовать приложение? Оно станет доступно всем преподавателям.')) {
      publishApp(appId);
    }
  };

  const handleUnpublish = (appId: string) => {
    if (confirm('Снять приложение с публикации? Оно исчезнет из каталога.')) {
      unpublishApp(appId);
    }
  };

  const handleDelete = (appId: string, isPublished: boolean) => {
    const message = isPublished 
      ? 'Удалить опубликованное приложение? Оно исчезнет из каталога и у всех пользователей.'
      : 'Удалить приложение? Это действие нельзя отменить.';
    
    if (confirm(message)) {
      deleteApp(appId);
    }
  };

  if (myAppsLoading || installedLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Мои приложения</h2>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Создать новое
        </Button>
      </div>

      <Tabs defaultValue="created">
        <TabsList>
          <TabsTrigger value="created">
            Созданные мной ({myApps?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="installed">
            Установленные ({installedApps?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="created" className="space-y-4">
          {!myApps || myApps.length === 0 ? (
            <div className="text-center p-12 border rounded-lg">
              <p className="text-muted-foreground mb-4">
                У вас пока нет созданных приложений
              </p>
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Создать первое приложение
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myApps.map(app => (
                <AppCard
                  key={app.id}
                  app={app}
                  onOpen={() => {
                    // Get latest version URL
                    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/apps/${app.id}/${app.latest_version}/index.html`;
                    setSelectedApp({ id: app.id, url });
                  }}
                  onPublish={() => handlePublish(app.id)}
                  onUnpublish={() => handleUnpublish(app.id)}
                  onDelete={() => handleDelete(app.id, app.status === 'published')}
                  isOwner
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="installed" className="space-y-4">
          {!installedApps || installedApps.length === 0 ? (
            <div className="text-center p-12 border rounded-lg">
              <p className="text-muted-foreground">
                У вас пока нет установленных приложений. Посетите каталог, чтобы найти полезные приложения.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {installedApps.map(app => (
                <AppCard
                  key={app.id}
                  app={app}
                  onOpen={() => {
                    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/apps/${app.id}/${app.latest_version}/index.html`;
                    setSelectedApp({ id: app.id, url });
                  }}
                  onUninstall={() => uninstallApp({ appId: app.id, teacherId: (teacher as any).user_id || teacher.id })}
                  isInstalled
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedApp && (
        <AppViewer
          appId={selectedApp.id}
          previewUrl={selectedApp.url}
          open={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          teacherId={(teacher as any).user_id || teacher.id}
        />
      )}
    </div>
  );
};
