import { useState } from "react";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, Zap, CheckCircle, XCircle, Clock, AlertTriangle, LayoutGrid } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { EdgeFunctionsVisualization } from "@/components/admin/EdgeFunctionsVisualization";

interface Migration {
  id: number;
  version: string;
  name: string;
  applied_at: string;
  applied_by: string;
  execution_time_ms: number;
  success: boolean;
  error_message?: string;
}

interface HealthCheckResult {
  function_name: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  response_time_ms: number;
  http_status?: number;
  error?: string;
}

interface HealthCheckResponse {
  success: boolean;
  checked_at: string;
  mode: string;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    timeout: number;
    avg_response_time_ms: number;
  };
  unhealthy_functions: HealthCheckResult[];
  all_results?: HealthCheckResult[];
}

export default function SystemMonitor() {
  const [healthMode, setHealthMode] = useState<'critical' | 'all'>('critical');
  const queryClient = useQueryClient();

  // Fetch migrations
  const { data: migrations, isLoading: migrationsLoading, refetch: refetchMigrations } = useQuery({
    queryKey: ['schema_migrations'],
    queryFn: async () => {
      // Use raw fetch to bypass type checking for tables not in generated types
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/schema_migrations?select=*&order=applied_at.desc`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      
      if (!response.ok) {
        console.log('schema_migrations table may not exist');
        return [] as Migration[];
      }
      
      return await response.json() as Migration[];
    },
  });

  // Health check mutation
  const healthCheck = useMutation({
    mutationFn: async (mode: 'critical' | 'all') => {
      const response = await selfHostedPost<HealthCheckResponse>('edge-health-monitor', { mode, alerts: false });
      
      if (!response.success) throw new Error(response.error);
      return response.data as HealthCheckResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health_logs'] });
    },
  });

  // Fetch health logs
  const { data: healthLogs, isLoading: healthLogsLoading } = useQuery({
    queryKey: ['health_logs'],
    queryFn: async () => {
      // Use raw fetch to bypass type checking
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/edge_function_health_logs?select=*&order=checked_at.desc&limit=20`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      
      if (!response.ok) {
        console.log('Health logs table may not exist yet');
        return [];
      }
      
      return await response.json();
    },
  });

  const runHealthCheck = () => {
    healthCheck.mutate(healthMode);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Мониторинг системы</h1>
          <p className="text-muted-foreground">Статус миграций и Edge Functions</p>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Каталог
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Zap className="h-4 w-4" />
            Мониторинг
          </TabsTrigger>
          <TabsTrigger value="migrations" className="gap-2">
            <Database className="h-4 w-4" />
            Миграции
          </TabsTrigger>
        </TabsList>

        {/* Edge Functions Catalog */}
        <TabsContent value="catalog">
          <EdgeFunctionsVisualization healthResults={healthCheck.data?.all_results} />
        </TabsContent>

        {/* Edge Functions Health */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Проверка здоровья</CardTitle>
                  <CardDescription>
                    Проверка доступности Edge Functions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={healthMode}
                    onChange={(e) => setHealthMode(e.target.value as 'critical' | 'all')}
                    className="border rounded px-3 py-2 text-sm"
                  >
                    <option value="critical">Критичные (12)</option>
                    <option value="all">Все (108)</option>
                  </select>
                  <Button 
                    onClick={runHealthCheck} 
                    disabled={healthCheck.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${healthCheck.isPending ? 'animate-spin' : ''}`} />
                    Проверить
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {healthCheck.data && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <SummaryCard 
                      label="Всего" 
                      value={healthCheck.data.summary.total} 
                      icon={<Zap className="h-4 w-4" />}
                    />
                    <SummaryCard 
                      label="Здоровые" 
                      value={healthCheck.data.summary.healthy} 
                      icon={<CheckCircle className="h-4 w-4 text-green-500" />}
                      variant="success"
                    />
                    <SummaryCard 
                      label="Ошибки" 
                      value={healthCheck.data.summary.unhealthy} 
                      icon={<XCircle className="h-4 w-4 text-red-500" />}
                      variant="error"
                    />
                    <SummaryCard 
                      label="Таймауты" 
                      value={healthCheck.data.summary.timeout} 
                      icon={<Clock className="h-4 w-4 text-yellow-500" />}
                      variant="warning"
                    />
                    <SummaryCard 
                      label="Ср. время" 
                      value={`${healthCheck.data.summary.avg_response_time_ms}ms`} 
                      icon={<Clock className="h-4 w-4" />}
                    />
                  </div>

                  {/* Unhealthy functions */}
                  {healthCheck.data.unhealthy_functions.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-red-700">
                          <AlertTriangle className="h-5 w-5 inline mr-2" />
                          Проблемные функции
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {healthCheck.data.unhealthy_functions.map((func) => (
                            <div 
                              key={func.function_name}
                              className="flex items-center justify-between p-2 bg-white rounded border"
                            >
                              <code className="text-sm font-mono">{func.function_name}</code>
                              <div className="flex items-center gap-2">
                                <Badge variant={func.status === 'timeout' ? 'secondary' : 'destructive'}>
                                  {func.status === 'timeout' ? 'Timeout' : `HTTP ${func.http_status}`}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {func.response_time_ms}ms
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* All results (if mode=all) */}
                  {healthCheck.data.all_results && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Все функции</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-1">
                            {healthCheck.data.all_results.map((func) => (
                              <div 
                                key={func.function_name}
                                className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  {func.status === 'healthy' ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : func.status === 'timeout' ? (
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  <code className="text-sm font-mono">{func.function_name}</code>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {func.response_time_ms}ms
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {!healthCheck.data && !healthCheck.isPending && (
                <div className="text-center py-8 text-muted-foreground">
                  Нажмите "Проверить" для запуска диагностики
                </div>
              )}

              {healthCheck.isPending && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health History */}
          <Card>
            <CardHeader>
              <CardTitle>История проверок</CardTitle>
              <CardDescription>Последние 20 проверок</CardDescription>
            </CardHeader>
            <CardContent>
              {healthLogsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : healthLogs && healthLogs.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {healthLogs.map((log: any) => (
                      <div 
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {log.unhealthy_count === 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <div className="font-medium">
                              {log.healthy_count}/{log.total_functions} здоровых
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(log.checked_at), 'dd MMM yyyy HH:mm:ss', { locale: ru })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{log.mode}</Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            avg {log.avg_response_time_ms}ms
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  История проверок пока пуста
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Migrations */}
        <TabsContent value="migrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Миграции базы данных</CardTitle>
                  <CardDescription>
                    История примененных миграций
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => refetchMigrations()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Обновить
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {migrationsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : migrations && migrations.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {migrations.map((migration) => (
                      <div 
                        key={migration.id}
                        className={`p-4 border rounded ${
                          migration.success 
                            ? 'border-green-200 bg-green-50/50' 
                            : 'border-red-200 bg-red-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {migration.success ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <code className="font-mono text-sm font-medium">
                                {migration.version}
                              </code>
                            </div>
                            {migration.name && (
                              <div className="text-sm text-muted-foreground pl-6">
                                {migration.name}
                              </div>
                            )}
                            {migration.error_message && (
                              <div className="text-sm text-red-600 pl-6">
                                {migration.error_message}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-muted-foreground">
                              {format(new Date(migration.applied_at), 'dd MMM yyyy HH:mm', { locale: ru })}
                            </div>
                            {migration.execution_time_ms > 0 && (
                              <div className="text-muted-foreground">
                                {migration.execution_time_ms}ms
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Таблица миграций пока пуста</p>
                  <p className="text-sm mt-2">
                    Выполните SQL для создания таблицы schema_migrations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ 
  label, 
  value, 
  icon, 
  variant 
}: { 
  label: string; 
  value: string | number; 
  icon: ReactNode;
  variant?: 'success' | 'error' | 'warning';
}) {
  const bgClass = variant === 'success' 
    ? 'bg-green-50 border-green-200' 
    : variant === 'error' 
      ? 'bg-red-50 border-red-200'
      : variant === 'warning'
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-muted/50';

  return (
    <div className={`p-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
