import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { selfHostedGet } from '@/lib/selfHostedApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Star, CheckCircle, Database, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScenarioStats {
  scenario: string;
  count: number;
  avgQuality: number;
  conversions: number;
  conversionRate: number;
}

interface LowQualityExample {
  id: string;
  scenario: string;
  quality: number;
  summary: string;
  outcome: string;
  created_at: string;
}

interface AnalyticsData {
  total: number;
  avgQuality: number;
  approvedCount: number;
  approvedRate: number;
  conversionRate: number;
  byScenario: ScenarioStats[];
  byOutcome: Record<string, number>;
  qualityDistribution: Record<string, number>;
  lowQualityExamples: LowQualityExample[];
  dailyTrends: Array<{
    date: string;
    count: number;
    avgQuality: number;
    conversions: number;
  }>;
}

const SCENARIO_LABELS: Record<string, string> = {
  new_lead: 'Новый лид',
  returning: 'Возврат',
  complaint: 'Жалоба',
  upsell: 'Допродажа',
  reactivation: 'Реактивация',
  info_request: 'Запрос инфо',
  scheduling: 'Запись',
  payment: 'Оплата',
  unknown: 'Неизвестно',
};

const QUALITY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
const SCENARIO_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#84cc16', '#06b6d4'];

export function ConversationAnalyticsDashboard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['conversation-analytics'],
    queryFn: async () => {
      const response = await selfHostedGet<AnalyticsData>('conversation-analytics');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics');
      }
      return response.data!;
    },
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  const getQualityColor = (quality: number) => {
    if (quality >= 4.5) return 'text-green-600';
    if (quality >= 3.5) return 'text-emerald-500';
    if (quality >= 2.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScenarioColor = (scenario: string) => {
    const colors: Record<string, string> = {
      new_lead: 'bg-green-100 text-green-800',
      returning: 'bg-blue-100 text-blue-800',
      complaint: 'bg-red-100 text-red-800',
      upsell: 'bg-purple-100 text-purple-800',
      reactivation: 'bg-orange-100 text-orange-800',
      info_request: 'bg-gray-100 text-gray-800',
      scheduling: 'bg-cyan-100 text-cyan-800',
      payment: 'bg-amber-100 text-amber-800',
    };
    return colors[scenario] || 'bg-gray-100 text-gray-800';
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive">Ошибка загрузки: {(error as Error).message}</p>
          <Button onClick={() => refetch()} className="mt-4">
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const scenarioChartData = data?.byScenario.map(s => ({
    name: SCENARIO_LABELS[s.scenario] || s.scenario,
    count: s.count,
    conversionRate: Math.round(s.conversionRate),
    avgQuality: Math.round(s.avgQuality * 10) / 10,
  })) || [];

  const qualityPieData = data ? Object.entries(data.qualityDistribution)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: `★${key}`,
      value,
      quality: parseInt(key),
    })) : [];

  const outcomeData = data ? Object.entries(data.byOutcome).map(([name, value]) => ({
    name: name === 'converted' ? 'Конверсия' : name === 'lost' ? 'Потеряно' : name === 'pending' ? 'В процессе' : name,
    value,
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Аналитика проиндексированных диалогов</h2>
          <p className="text-muted-foreground">Метрики качества и конверсии из базы знаний AI</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total indexed */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Всего проиндексировано</p>
                  <p className="text-3xl font-bold">{data?.total || 0}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Average quality */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Средний балл качества</p>
                  <p className={`text-3xl font-bold ${getQualityColor(data?.avgQuality || 0)}`}>
                    ★{data?.avgQuality?.toFixed(1) || '0.0'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion rate */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Конверсия</p>
                  <p className="text-3xl font-bold text-green-600">{data?.conversionRate?.toFixed(1) || 0}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved for RAG */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Одобрено для RAG</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {data?.approvedCount || 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      ({data?.approvedRate?.toFixed(0) || 0}%)
                    </span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion by Scenario */}
        <Card>
          <CardHeader>
            <CardTitle>Конверсия по сценариям</CardTitle>
            <CardDescription>Количество диалогов и % конверсии по типам</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : scenarioChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenarioChartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={75} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'count') return [value, 'Диалогов'];
                      if (name === 'conversionRate') return [`${value}%`, 'Конверсия'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" name="count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Распределение качества</CardTitle>
            <CardDescription>Оценки диалогов по шкале 1-5</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : qualityPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={qualityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {qualityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={QUALITY_COLORS[entry.quality - 1]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Trends */}
      {data && data.dailyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Тренды за 30 дней</CardTitle>
            <CardDescription>Динамика индексации и качества</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString('ru-RU')}
                    formatter={(value, name) => {
                      if (name === 'count') return [value, 'Диалогов'];
                      if (name === 'avgQuality') return [Number(value).toFixed(1), 'Ср. качество'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" name="count" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="avgQuality" stroke="#22c55e" name="avgQuality" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Low Quality Problems Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Проблемные диалоги
          </CardTitle>
          <CardDescription>Диалоги с оценкой качества ниже 3 — требуют анализа</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.lowQualityExamples && data.lowQualityExamples.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сценарий</TableHead>
                    <TableHead>Качество</TableHead>
                    <TableHead>Результат</TableHead>
                    <TableHead className="max-w-[300px]">Краткое описание</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowQualityExamples.map((example) => (
                    <TableRow key={example.id}>
                      <TableCell>
                        <Badge className={getScenarioColor(example.scenario)}>
                          {SCENARIO_LABELS[example.scenario] || example.scenario}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-500 font-medium">★{example.quality.toFixed(1)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={example.outcome === 'converted' ? 'default' : 'secondary'}>
                          {example.outcome === 'converted' ? 'Конверсия' : 
                           example.outcome === 'lost' ? 'Потеряно' : example.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate text-sm text-muted-foreground" title={example.summary}>
                          {example.summary || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(example.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-muted-foreground">Нет проблемных диалогов</p>
              <p className="text-sm text-muted-foreground">Все диалоги имеют оценку 3 и выше</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
