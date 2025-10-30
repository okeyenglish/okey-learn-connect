import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useApps } from '@/hooks/useApps';
import { AppCard } from './AppCard';
import { AppFilters } from './AppFilters';
import { AppViewer } from './AppViewer';
interface Teacher {
  user_id: string;
  [key: string]: any;
}

interface AppCatalogProps {
  teacher: Teacher;
}

export const AppCatalog = ({ teacher }: AppCatalogProps) => {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [level, setLevel] = useState('all');
  const [selectedApp, setSelectedApp] = useState<{ id: string; url: string } | null>(null);

  const { catalogApps, catalogLoading, installApp, installedApps } = useApps(teacher.user_id);

  const filteredApps = catalogApps?.filter(app => {
    const matchesSearch = app.title.toLowerCase().includes(search.toLowerCase()) ||
                         app.description.toLowerCase().includes(search.toLowerCase());
    const matchesKind = kind === 'all' || app.kind === kind;
    const matchesLevel = level === 'all' || app.level === level;
    
    return matchesSearch && matchesKind && matchesLevel;
  }) || [];

  const installedAppIds = new Set(installedApps?.map(a => a.id) || []);

  if (catalogLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppFilters
        search={search}
        onSearchChange={setSearch}
        kind={kind}
        onKindChange={setKind}
        level={level}
        onLevelChange={setLevel}
      />

      {filteredApps.length === 0 ? (
        <div className="text-center p-12 border rounded-lg">
          <p className="text-muted-foreground">
            {search || kind !== 'all' || level !== 'all'
              ? 'Приложения не найдены. Попробуйте изменить фильтры.'
              : 'Пока нет опубликованных приложений.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map(app => (
            <AppCard
              key={app.id}
              app={app}
              onOpen={() => setSelectedApp({ id: app.id, url: app.preview_url })}
              onInstall={() => installApp({ appId: app.id, teacherId: teacher.user_id })}
              isInstalled={installedAppIds.has(app.id)}
            />
          ))}
        </div>
      )}

      {selectedApp && (
        <AppViewer
          appId={selectedApp.id}
          previewUrl={selectedApp.url}
          open={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          teacherId={teacher.user_id}
        />
      )}
    </div>
  );
};
