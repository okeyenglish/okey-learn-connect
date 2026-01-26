import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { usePerformanceAnalytics } from '@/hooks/usePerformanceAnalytics';
import { 
  Activity, 
  Database, 
  Radio, 
  Clock, 
  Zap, 
  AlertTriangle,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const LoadBadge = ({ load }: { load: 'low' | 'medium' | 'high' | 'critical' }) => {
  const variants = {
    low: 'bg-green-500/20 text-green-700 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-700 border-red-500/30',
  };
  
  const labels = {
    low: 'Низкая',
    medium: 'Средняя',
    high: 'Высокая',
    critical: 'Критическая',
  };
  
  return (
    <Badge variant="outline" className={variants[load]}>
      {labels[load]}
    </Badge>
  );
};

export const PerformanceAnalyticsDashboard = () => {
  const { report, isEnabled, toggleEnabled, clearMetrics } = usePerformanceAnalytics();
  const [activeTab, setActiveTab] = useState('overview');

  if (!report) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-4 animate-pulse" />
          Загрузка аналитики...
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (ms: number) => {
    if (ms < 1) return '<1мс';
    if (ms < 1000) return `${Math.round(ms)}мс`;
    return `${(ms / 1000).toFixed(2)}с`;
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Performance Analytics
          </h2>
          <p className="text-muted-foreground">
            Мониторинг нагрузки на систему в реальном времени
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Отслеживание</span>
            <Switch checked={isEnabled} onCheckedChange={toggleEnabled} />
          </div>
          <Button variant="outline" size="sm" onClick={clearMetrics}>
            <Trash2 className="h-4 w-4 mr-2" />
            Очистить
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Запросы к БД
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{report.queries.total}</span>
              <LoadBadge load={report.summary.queryLoad} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              За последние 5 минут
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Realtime каналы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{report.realtime.activeChannels}</span>
              <LoadBadge load={report.summary.realtimeLoad} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {report.realtime.totalEvents} событий
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Polling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{report.polling.sources.length}</span>
              <LoadBadge load={report.summary.pollingLoad} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{Math.round(report.polling.estimatedQueriesPerMinute)} запросов/мин
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Edge Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{report.edgeFunctions.totalCalls}</span>
              <span className="text-sm text-muted-foreground">
                ~{formatDuration(report.edgeFunctions.avgDuration)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {report.edgeFunctions.functions.length} функций
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {report.summary.recommendations.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              Рекомендации по оптимизации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {report.summary.recommendations.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="queries">Запросы ({report.queries.total})</TabsTrigger>
          <TabsTrigger value="realtime">Realtime ({report.realtime.activeChannels})</TabsTrigger>
          <TabsTrigger value="polling">Polling ({report.polling.sources.length})</TabsTrigger>
          <TabsTrigger value="edge">Edge Functions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Most Frequent Tables */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Самые запрашиваемые таблицы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.queries.mostFrequent.slice(0, 5).map((item, i) => (
                    <div key={item.table} className="flex items-center gap-3">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className="flex-1 font-mono text-sm">{item.table}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                  {report.queries.mostFrequent.length === 0 && (
                    <p className="text-sm text-muted-foreground">Нет данных</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Slowest Queries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Самые медленные запросы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.queries.slowest.slice(0, 5).map((query, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className="flex-1 font-mono text-sm truncate">{query.table}</span>
                      <Badge 
                        variant="outline" 
                        className={query.duration > 1000 ? 'text-red-600' : query.duration > 500 ? 'text-yellow-600' : ''}
                      >
                        {formatDuration(query.duration)}
                      </Badge>
                    </div>
                  ))}
                  {report.queries.slowest.length === 0 && (
                    <p className="text-sm text-muted-foreground">Нет данных</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Запросы по таблицам</CardTitle>
              <CardDescription>Статистика за последние 5 минут</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Таблица</TableHead>
                      <TableHead className="text-right">Запросов</TableHead>
                      <TableHead className="text-right">Ср. время</TableHead>
                      <TableHead className="text-right">Общее время</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(report.queries.byTable)
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([table, data]) => (
                        <TableRow key={table}>
                          <TableCell className="font-mono text-sm">{table}</TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right">{formatDuration(data.avgDuration)}</TableCell>
                          <TableCell className="text-right">{formatDuration(data.totalDuration)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Активные Realtime каналы</CardTitle>
              <CardDescription>
                {report.realtime.activeChannels} активных подписок
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Канал</TableHead>
                      <TableHead>Таблица</TableHead>
                      <TableHead className="text-right">События</TableHead>
                      <TableHead className="text-right">Последнее</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.realtime.channels.map((channel) => (
                      <TableRow key={channel.channel}>
                        <TableCell className="font-mono text-sm truncate max-w-[200px]">
                          {channel.channel}
                        </TableCell>
                        <TableCell>{channel.table}</TableCell>
                        <TableCell className="text-right">{channel.eventCount}</TableCell>
                        <TableCell className="text-right">{formatTime(channel.lastEvent)}</TableCell>
                      </TableRow>
                    ))}
                    {report.realtime.channels.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Нет активных каналов
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="polling">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Источники Polling</CardTitle>
              <CardDescription>
                Оценка: ~{Math.round(report.polling.estimatedQueriesPerMinute)} запросов/мин от polling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Источник</TableHead>
                      <TableHead className="text-right">Интервал</TableHead>
                      <TableHead className="text-right">Вызовов</TableHead>
                      <TableHead className="text-right">Ср. время</TableHead>
                      <TableHead className="text-right">Последний</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.polling.sources.map((source) => (
                      <TableRow key={source.source}>
                        <TableCell className="font-mono text-sm">{source.source}</TableCell>
                        <TableCell className="text-right">{source.interval / 1000}с</TableCell>
                        <TableCell className="text-right">{source.pollCount}</TableCell>
                        <TableCell className="text-right">{formatDuration(source.avgDuration)}</TableCell>
                        <TableCell className="text-right">{formatTime(source.lastPoll)}</TableCell>
                      </TableRow>
                    ))}
                    {report.polling.sources.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Нет данных о polling
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edge">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Edge Functions</CardTitle>
              <CardDescription>
                {report.edgeFunctions.totalCalls} вызовов, 
                среднее время: {formatDuration(report.edgeFunctions.avgDuration)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Функция</TableHead>
                      <TableHead className="text-right">Вызовов</TableHead>
                      <TableHead className="text-right">Ср. время</TableHead>
                      <TableHead className="text-right">Ошибок</TableHead>
                      <TableHead className="text-right">Последний</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.edgeFunctions.functions.map((fn) => (
                      <TableRow key={fn.functionName}>
                        <TableCell className="font-mono text-sm">{fn.functionName}</TableCell>
                        <TableCell className="text-right">{fn.callCount}</TableCell>
                        <TableCell className="text-right">{formatDuration(fn.avgDuration)}</TableCell>
                        <TableCell className="text-right">
                          {fn.errors > 0 ? (
                            <Badge variant="destructive">{fn.errors}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatTime(fn.lastCall)}</TableCell>
                      </TableRow>
                    ))}
                    {report.edgeFunctions.functions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Нет данных об Edge Functions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
