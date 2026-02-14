import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StaleConversationAlerts } from './StaleConversationAlerts';
import { StaleAlertSettings } from './StaleAlertSettings';
import { HealthScoreDashboard } from './HealthScoreDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { selfHostedGet } from '@/lib/selfHostedApi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell,
  Sankey, Layer, Rectangle,
  LineChart, Line, Legend,
  PieChart, Pie,
} from 'recharts';
import {
  RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
  ArrowRight, Zap, Target, Users, Clock, Brain
} from 'lucide-react';

// Stage labels (defaults)
const STAGE_LABELS: Record<string, string> = {
  greeting: 'Приветствие',
  qualification: 'Квалификация',
  need_discovery: 'Выявление потребности',
  value_explanation: 'Презентация ценности',
  objection: 'Работа с возражениями',
  offer: 'Предложение',
  closing: 'Закрытие',
  follow_up: 'Дожим / Follow-up',
};

const STAGE_COLORS = [
  'hsl(var(--primary))',
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b',
  '#ec4899', '#10b981', '#f97316',
];

const STAGE_BG_COLORS = [
  '#6366f1', '#3b82f6', '#8b5cf6', '#06b6d4',
  '#f59e0b', '#ec4899', '#10b981', '#f97316',
];

interface StageFunnelItem {
  stage: string;
  count: number;
  percentage: number;
  avg_duration_min: number;
  drop_off_rate: number;
}

interface StageTransition {
  from_stage: string;
  to_stage: string;
  count: number;
  avg_confidence: number;
}

interface NBAEffectiveness {
  action_type: string;
  action_label: string;
  times_shown: number;
  times_used: number;
  success_rate: number;
  stage: string;
}

interface TopPerformerPath {
  manager_name: string;
  path: string[];
  conversion_rate: number;
  avg_deal_time_hours: number;
}

interface StageAnalyticsData {
  funnel: StageFunnelItem[];
  transitions: StageTransition[];
  nba_effectiveness: NBAEffectiveness[];
  top_paths: TopPerformerPath[];
  period_stats: {
    total_conversations: number;
    avg_stages_per_deal: number;
    avg_time_to_close_hours: number;
    conversion_rate: number;
    hesitation_rate: number;
  };
  daily_stage_distribution: Array<{
    date: string;
    [stage: string]: string | number;
  }>;
}

export function ConversationStageAnalytics() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['conversation-stage-analytics', period],
    queryFn: async () => {
      const response = await selfHostedGet<StageAnalyticsData>(
        `conversation-stage-analytics?period=${period}`
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch stage analytics');
      }
      return response.data!;
    },
    refetchInterval: 120000,
  });

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive">Ошибка: {(error as Error).message}</p>
          <Button onClick={() => refetch()} className="mt-4">Повторить</Button>
        </CardContent>
      </Card>
    );
  }

  const funnelData = data?.funnel.map((item, i) => ({
    name: STAGE_LABELS[item.stage] || item.stage,
    value: item.count,
    percentage: item.percentage,
    fill: STAGE_BG_COLORS[i % STAGE_BG_COLORS.length],
    dropOff: item.drop_off_rate,
    avgDuration: item.avg_duration_min,
  })) || [];

  const transitionData = data?.transitions.map(t => ({
    from: STAGE_LABELS[t.from_stage] || t.from_stage,
    to: STAGE_LABELS[t.to_stage] || t.to_stage,
    count: t.count,
    confidence: Math.round(t.avg_confidence * 100),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Воронка стадий диалогов</h2>
          <p className="text-muted-foreground">
            Conversation Intelligence — аналитика по стадиям продающих диалогов
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 дней</SelectItem>
              <SelectItem value="30d">30 дней</SelectItem>
              <SelectItem value="90d">90 дней</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          icon={<Users className="h-5 w-5" />}
          label="Всего диалогов"
          value={data?.period_stats.total_conversations ?? 0}
          isLoading={isLoading}
          color="bg-blue-100 text-blue-600"
        />
        <KPICard
          icon={<Target className="h-5 w-5" />}
          label="Конверсия"
          value={`${(data?.period_stats.conversion_rate ?? 0).toFixed(1)}%`}
          isLoading={isLoading}
          color="bg-green-100 text-green-600"
        />
        <KPICard
          icon={<Brain className="h-5 w-5" />}
          label="Ср. стадий до сделки"
          value={(data?.period_stats.avg_stages_per_deal ?? 0).toFixed(1)}
          isLoading={isLoading}
          color="bg-purple-100 text-purple-600"
        />
        <KPICard
          icon={<Clock className="h-5 w-5" />}
          label="Ср. время до закрытия"
          value={`${(data?.period_stats.avg_time_to_close_hours ?? 0).toFixed(0)}ч`}
          isLoading={isLoading}
          color="bg-amber-100 text-amber-600"
        />
        <KPICard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="% колебаний"
          value={`${(data?.period_stats.hesitation_rate ?? 0).toFixed(1)}%`}
          isLoading={isLoading}
          color="bg-red-100 text-red-600"
        />
      </div>

      {/* Health Score Dashboard */}
      <HealthScoreDashboard />

      {/* Stale Conversation Alerts + Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaleConversationAlerts />
        <StaleAlertSettings />
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            Воронка по стадиям
          </CardTitle>
          <CardDescription>
            Количество диалогов, прошедших каждую стадию, и % потерь
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : funnelData.length > 0 ? (
            <div className="space-y-3">
              {funnelData.map((item, i) => {
                const maxValue = funnelData[0]?.value || 1;
                const widthPct = Math.max((item.value / maxValue) * 100, 8);
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-40 text-sm font-medium text-right shrink-0 truncate">
                      {item.name}
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className="h-10 rounded-md flex items-center px-3 text-white text-sm font-medium transition-all"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: item.fill,
                          minWidth: '60px',
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                    <div className="w-16 text-sm text-right shrink-0">
                      <span className="font-medium">{item.percentage.toFixed(0)}%</span>
                    </div>
                    {item.dropOff > 0 && (
                      <div className="w-20 text-xs text-right text-destructive shrink-0">
                        −{item.dropOff.toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* Two-column: Transitions + NBA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Transitions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              Переходы между стадиями
            </CardTitle>
            <CardDescription>Топ переходов по частоте</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : transitionData.length > 0 ? (
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Из</TableHead>
                      <TableHead></TableHead>
                      <TableHead>В</TableHead>
                      <TableHead className="text-right">Кол-во</TableHead>
                      <TableHead className="text-right">Уверенность</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transitionData.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{t.from}</Badge>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{t.to}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{t.count}</TableCell>
                        <TableCell className="text-right">
                          <span className={t.confidence >= 80 ? 'text-green-600' : t.confidence >= 60 ? 'text-amber-600' : 'text-red-500'}>
                            {t.confidence}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        {/* NBA Effectiveness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              Эффективность подсказок (NBA)
            </CardTitle>
            <CardDescription>Next Best Action — какие подсказки работают лучше</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : data?.nba_effectiveness && data.nba_effectiveness.length > 0 ? (
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Действие</TableHead>
                      <TableHead>Стадия</TableHead>
                      <TableHead className="text-right">Показано</TableHead>
                      <TableHead className="text-right">Использовано</TableHead>
                      <TableHead className="text-right">Успешность</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.nba_effectiveness.map((nba, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{nba.action_label}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {STAGE_LABELS[nba.stage] || nba.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{nba.times_shown}</TableCell>
                        <TableCell className="text-right">{nba.times_used}</TableCell>
                        <TableCell className="text-right">
                          <span className={nba.success_rate >= 70 ? 'text-green-600 font-medium' : nba.success_rate >= 40 ? 'text-amber-600' : 'text-red-500'}>
                            {nba.success_rate.toFixed(0)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performer Paths */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Оптимальные пути менеджеров
          </CardTitle>
          <CardDescription>
            Последовательности стадий, которые приводят к конверсии
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : data?.top_paths && data.top_paths.length > 0 ? (
            <div className="space-y-4">
              {data.top_paths.map((path, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      {path.path.map((stage, j) => (
                        <span key={j} className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: STAGE_BG_COLORS[j % STAGE_BG_COLORS.length] + '22', color: STAGE_BG_COLORS[j % STAGE_BG_COLORS.length] }}
                          >
                            {STAGE_LABELS[stage] || stage}
                          </Badge>
                          {j < path.path.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{path.manager_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-600">{path.conversion_rate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">{path.avg_deal_time_hours.toFixed(0)}ч</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* Daily Stage Distribution */}
      {data?.daily_stage_distribution && data.daily_stage_distribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Распределение стадий по дням</CardTitle>
            <CardDescription>Сколько диалогов находилось на каждой стадии</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.daily_stage_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(d) => new Date(d as string).toLocaleDateString('ru-RU')}
                  formatter={(value, name) => [value, STAGE_LABELS[name as string] || name]}
                />
                <Legend formatter={(name) => STAGE_LABELS[name] || name} />
                {Object.keys(STAGE_LABELS).map((stage, i) => (
                  <Bar
                    key={stage}
                    dataKey={stage}
                    stackId="a"
                    fill={STAGE_BG_COLORS[i % STAGE_BG_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Helper components ---

function KPICard({ icon, label, value, isLoading, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isLoading: boolean;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <Brain className="h-10 w-10 mb-3 opacity-40" />
      <p>Нет данных для отображения</p>
      <p className="text-xs mt-1">Данные появятся после классификации диалогов</p>
    </div>
  );
}
