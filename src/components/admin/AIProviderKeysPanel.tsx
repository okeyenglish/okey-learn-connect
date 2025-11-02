import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIProviderKeys, useProvisionJobs, useProvisionJobsStats, useBackfillKeys } from '@/hooks/useAIProviderKeys';
import { Key, AlertCircle, CheckCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export const AIProviderKeysPanel = () => {
  const { data: keys, isLoading: keysLoading, refetch: refetchKeys } = useAIProviderKeys();
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useProvisionJobs();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useProvisionJobsStats();
  const backfillMutation = useBackfillKeys();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Активен</Badge>;
      case 'disabled':
        return <Badge variant="secondary">Отключён</Badge>;
      case 'expired':
        return <Badge variant="destructive">Истёк</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> В очереди</Badge>;
      case 'running':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Выполняется</Badge>;
      case 'done':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Готово</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Ошибка</Badge>;
      case 'retry':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1" /> Повтор</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRefresh = () => {
    refetchKeys();
    refetchJobs();
    refetchStats();
  };

  const handleBackfill = (entityType: 'organizations' | 'teachers' | 'all') => {
    backfillMutation.mutate({ entityType });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Активные ключи</CardTitle>
          </CardHeader>
          <CardContent>
            {keysLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{keys?.filter(k => k.status === 'active').length || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Задач в очереди</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{(stats?.queued || 0) + (stats?.retry || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ошибок</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-500">{stats?.failed || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
        <Button
          onClick={() => handleBackfill('all')}
          variant="outline"
          size="sm"
          disabled={backfillMutation.isPending}
        >
          {backfillMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Backfill все
        </Button>
        <Button
          onClick={() => handleBackfill('organizations')}
          variant="outline"
          size="sm"
          disabled={backfillMutation.isPending}
        >
          Backfill организации
        </Button>
        <Button
          onClick={() => handleBackfill('teachers')}
          variant="outline"
          size="sm"
          disabled={backfillMutation.isPending}
        >
          Backfill преподаватели
        </Button>
      </div>

      {/* Provider Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Ключи ({keys?.length || 0})
          </CardTitle>
          <CardDescription>
            Персональные OpenRouter ключи для организаций и преподавателей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : keys && keys.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {keys.map(key => (
                  <div
                    key={key.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {key.organization_id ? 'Организация' : 'Преподаватель'}
                        </Badge>
                        {getStatusBadge(key.status)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(key.created_at), { addSuffix: true, locale: ru })}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{key.key_label}</div>
                      <div className="text-muted-foreground font-mono text-xs">{key.key_preview}</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Лимит: {key.limit_remaining}/{key.limit_monthly}</span>
                      <span>Сброс: {key.reset_policy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Нет созданных ключей
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provision Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Очередь задач ({jobs?.length || 0})</CardTitle>
          <CardDescription>
            Статус создания ключей через OpenRouter Provisioning API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {jobs.map(job => (
                  <div
                    key={job.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{job.entity_name}</span>
                        {getJobStatusBadge(job.status)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Попыток: {job.attempts}/{job.max_attempts}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {job.organization_id ? 'Организация' : 'Преподаватель'} • 
                      Лимит: {job.monthly_limit}/{job.reset_policy}
                    </div>
                    {job.last_error && (
                      <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                        {job.last_error}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Создано: {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ru })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Нет задач в очереди
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
