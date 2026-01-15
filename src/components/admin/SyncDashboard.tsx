import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Database, MessageSquare, Users, Clock, Pause, Play } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface SalebotProgress {
  totalClientsProcessed: number;
  totalImported: number;
  totalMessagesImported: number;
  currentOffset: number;
  startTime: Date | null;
  lastRunAt: Date | null;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
}

interface ApiUsage {
  used: number;
  limit: number;
  remaining: number;
  date: string;
}

interface DbStats {
  clients: number;
  students: number;
  messages: number;
  familyGroups: number;
}

export function SyncDashboard() {
  const { toast } = useToast();
  const [importProgress, setImportProgress] = useState<SalebotProgress | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsage | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [salebotListId, setSalebotListId] = useState<string>('740756');
  const [isImporting, setIsImporting] = useState(false);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [isSyncingNew, setIsSyncingNew] = useState(false);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get Salebot progress
        const { data: progressData } = await supabase
          .from('salebot_import_progress')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (progressData) {
          // Check if import is completed (offset > 0 and clients processed, not running, not paused)
          const isCompleted = !progressData.is_running && 
            !progressData.is_paused && 
            progressData.total_clients_processed > 0 &&
            progressData.current_offset > 0;
          
          setImportProgress({
            totalClientsProcessed: progressData.total_clients_processed || 0,
            totalImported: progressData.total_imported || 0,
            totalMessagesImported: progressData.total_messages_imported || 0,
            currentOffset: progressData.current_offset || 0,
            startTime: progressData.start_time ? new Date(progressData.start_time) : null,
            lastRunAt: progressData.last_run_at ? new Date(progressData.last_run_at) : null,
            isRunning: progressData.is_running || false,
            isPaused: progressData.is_paused || false,
            isCompleted
          });
        }

        // Get API usage
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await supabase
          .from('salebot_api_usage')
          .select('*')
          .eq('date', today)
          .maybeSingle();

        setApiUsage({
          used: usageData?.api_requests_count || 0,
          limit: usageData?.max_daily_limit || 6000,
          remaining: (usageData?.max_daily_limit || 6000) - (usageData?.api_requests_count || 0),
          date: today
        });

        // Get DB stats
        const [clientsRes, studentsRes, messagesRes, familyRes] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
          supabase.from('family_groups').select('id', { count: 'exact', head: true })
        ]);

        setDbStats({
          clients: clientsRes.count || 0,
          students: studentsRes.count || 0,
          messages: messagesRes.count || 0,
          familyGroups: familyRes.count || 0
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching sync data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStopImport = async () => {
    try {
      const { error } = await supabase.functions.invoke('salebot-stop');
      if (error) throw error;
      toast({
        title: 'Импорт остановлен',
        description: 'Автоматический импорт Salebot успешно остановлен',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleResumeImport = async () => {
    try {
      setIsImporting(true);
      
      // Remove pause flag
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ is_paused: false })
          .eq('id', progress.id);
      }
      
      // Trigger import
      const { error } = await supabase.functions.invoke('import-salebot-chats-auto');
      if (error) throw error;
      
      toast({
        title: 'Импорт возобновлён',
        description: 'Автоматический импорт Salebot успешно запущен',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleRunBatch = async () => {
    try {
      setIsRunningBatch(true);
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto');
      if (error) throw error;
      
      const result = data as any;
      
      if (result?.skipped) {
        toast({
          title: result.apiLimitReached ? 'Лимит API' : 'Пропущено',
          description: result.message || 'Батч пропущен',
          variant: result.apiLimitReached ? 'destructive' : 'default',
        });
      } else {
        toast({
          title: 'Батч выполнен',
          description: `Обработано клиентов: ${result?.totalClients || 0}, сообщений: ${result?.messagesImported || 0}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunningBatch(false);
    }
  };

  const handleSyncNew = async () => {
    try {
      setIsSyncingNew(true);
      
      // Reset offset to 0 and trigger incremental sync
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ current_offset: 0, is_paused: false })
          .eq('id', progress.id);
      }
      
      const { data, error } = await supabase.functions.invoke('import-salebot-chats-auto', {
        body: { mode: 'sync_new' }
      });
      if (error) throw error;
      
      toast({
        title: 'Синхронизация запущена',
        description: 'Поиск новых сообщений у существующих клиентов',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncingNew(false);
    }
  };

  const handleResetProgress = async () => {
    if (!confirm('Вы уверены? Это сбросит весь прогресс импорта Salebot.')) return;
    
    try {
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({
            current_offset: 0,
            total_clients_processed: 0,
            total_imported: 0,
            total_messages_imported: 0,
            is_running: false,
            is_paused: false
          })
          .eq('id', progress.id);
        
        toast({
          title: 'Прогресс сброшен',
          description: 'Счетчики импорта сброшены. Импорт начнется с начала.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateListId = async () => {
    try {
      const { data: progress } = await supabase
        .from('salebot_import_progress')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (progress?.id) {
        await supabase
          .from('salebot_import_progress')
          .update({ list_id: salebotListId || null })
          .eq('id', progress.id);
        
        toast({
          title: 'List ID обновлён',
          description: `Импорт будет использовать список: ${salebotListId || 'все клиенты'}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Синхронизация данных</h1>
        <p className="text-muted-foreground mt-2">
          Управление импортом из HolyHope и Salebot
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Клиенты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{dbStats?.clients.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Студенты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{dbStats?.students.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Сообщения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{dbStats?.messages.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Семьи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{dbStats?.familyGroups.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="salebot" className="space-y-4">
        <TabsList>
          <TabsTrigger value="salebot">Salebot (чаты)</TabsTrigger>
          <TabsTrigger value="holyhope">HolyHope (данные)</TabsTrigger>
        </TabsList>

        <TabsContent value="salebot" className="space-y-4">
          {/* API Limit Card */}
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Clock className="h-5 w-5" />
                Лимит API Salebot (сегодня: {apiUsage?.date})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Использовано: <strong>{apiUsage?.used}</strong> / {apiUsage?.limit}</span>
                  <span className={apiUsage?.remaining && apiUsage.remaining < 500 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                    Осталось: {apiUsage?.remaining}
                  </span>
                </div>
                <Progress value={apiUsage ? (apiUsage.used / apiUsage.limit) * 100 : 0} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  ~{apiUsage ? Math.floor(apiUsage.remaining / 11) : 0} клиентов можно импортировать сегодня (11 API запросов на клиента)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Import Progress Card */}
          <Card className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <MessageSquare className="h-5 w-5" />
                  Импорт чатов из Salebot
                </CardTitle>
                {importProgress?.isRunning ? (
                  <Badge variant="default" className="bg-green-500">
                    <span className="h-2 w-2 bg-white rounded-full animate-pulse mr-1.5"></span>
                    Запущен
                  </Badge>
                ) : importProgress?.isPaused ? (
                  <Badge variant="secondary">
                    <Pause className="h-3 w-3 mr-1" />
                    На паузе
                  </Badge>
                ) : importProgress?.isCompleted ? (
                  <Badge variant="default" className="bg-blue-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Импорт завершён
                  </Badge>
                ) : (
                  <Badge variant="outline">Остановлен</Badge>
                )}
              </div>
              <CardDescription>
                Автоматический импорт истории сообщений WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Клиентов обработано</div>
                  <div className="text-xl font-bold">{importProgress?.totalClientsProcessed || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Сообщений импортировано</div>
                  <div className="text-xl font-bold">{importProgress?.totalMessagesImported || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Текущий offset</div>
                  <div className="text-xl font-bold">{importProgress?.currentOffset || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Последний запуск</div>
                  <div className="text-sm font-medium">
                    {importProgress?.lastRunAt?.toLocaleString() || '—'}
                  </div>
                </div>
              </div>

              {/* List ID Settings */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="list-id">ID списка Salebot</Label>
                  <Input
                    id="list-id"
                    value={salebotListId}
                    onChange={(e) => setSalebotListId(e.target.value)}
                    placeholder="Например: 740756"
                  />
                </div>
                <Button variant="outline" onClick={handleUpdateListId}>
                  Сохранить
                </Button>
              </div>

              {/* Completed Status Alert */}
              {importProgress?.isCompleted && !importProgress?.isRunning && (
                <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <AlertTitle>Импорт списка завершён</AlertTitle>
                  <AlertDescription>
                    Все клиенты из списка обработаны. Используйте "Синхронизировать новые" для загрузки новых сообщений.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {importProgress?.isRunning ? (
                  <Button variant="destructive" onClick={handleStopImport}>
                    <Pause className="mr-2 h-4 w-4" />
                    Остановить
                  </Button>
                ) : (
                  <Button onClick={handleResumeImport} disabled={isImporting || (apiUsage?.remaining || 0) < 11}>
                    {isImporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Запустить импорт
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  onClick={handleRunBatch} 
                  disabled={isRunningBatch || importProgress?.isRunning || (apiUsage?.remaining || 0) < 11}
                >
                  {isRunningBatch ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Запустить 1 батч
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSyncNew} 
                  disabled={isSyncingNew || importProgress?.isRunning || (apiUsage?.remaining || 0) < 11}
                >
                  {isSyncingNew ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Синхронизировать новые
                </Button>
                <Button variant="outline" onClick={handleResetProgress}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Сбросить прогресс
                </Button>
              </div>

              {(apiUsage?.remaining || 0) < 11 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Лимит API исчерпан</AlertTitle>
                  <AlertDescription>
                    Дневной лимит API Salebot исчерпан. Импорт продолжится автоматически завтра.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holyhope" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Импорт данных из HolyHope
              </CardTitle>
              <CardDescription>
                Полный импорт студентов, лидов, расписания и других данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Информация</AlertTitle>
                <AlertDescription>
                  Для полного импорта данных из HolyHope перейдите на специальную страницу импорта.
                </AlertDescription>
              </Alert>
              
              <Button asChild>
                <a href="/holihope-import" target="_blank">
                  <Database className="mr-2 h-4 w-4" />
                  Открыть страницу импорта HolyHope
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Stats from HolyHope */}
          <Card>
            <CardHeader>
              <CardTitle>Данные из HolyHope</CardTitle>
              <CardDescription>Текущие данные в системе</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Студенты</div>
                  <div className="text-2xl font-bold text-green-600">{dbStats?.students.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Клиенты (родители)</div>
                  <div className="text-2xl font-bold text-blue-600">{dbStats?.clients.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Семейные группы</div>
                  <div className="text-2xl font-bold text-orange-600">{dbStats?.familyGroups.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
