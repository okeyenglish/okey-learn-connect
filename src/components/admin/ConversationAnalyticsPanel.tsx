import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Users, 
  ThumbsDown,
  RefreshCw,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';
import {
  intentLabels,
  intentColors,
  issueLabels,
  issueColors,
  outcomeLabels,
  outcomeColors,
  dialogTypeLabels,
  dialogTypeColors
} from '@/lib/dialogueTags';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface AnalyticsData {
  total: number;
  avgQuality: number;
  avgConfidence: number;
  byIntent: Record<string, number>;
  byIssue: Record<string, number>;
  byOutcome: Record<string, number>;
  byScenario: Record<string, number>;
  intentConversionRates: Record<string, { total: number; converted: number; rate: number }>;
  issueOutcomes: Record<string, { total: number; lost: number; rate: number }>;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658'
];

export function ConversationAnalyticsPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const { toast } = useToast();

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await selfHostedPost<AnalyticsData>('conversation-analytics', {
        includeTagAnalytics: true
      });

      if (response.success && response.data) {
        setData(response.data);
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось загрузить аналитику',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Analytics error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить аналитику тегов',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Нет данных для аналитики</p>
          <Button onClick={loadAnalytics} variant="outline" className="mt-4">
            Обновить
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const intentChartData = Object.entries(data.byIntent || {})
    .map(([intent, count]) => ({
      name: intentLabels[intent] || intent,
      value: count,
      key: intent
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const issueChartData = Object.entries(data.byIssue || {})
    .map(([issue, count]) => ({
      name: issueLabels[issue] || issue,
      value: count,
      key: issue
    }))
    .sort((a, b) => b.value - a.value);

  const outcomeChartData = Object.entries(data.byOutcome || {})
    .map(([outcome, count]) => ({
      name: outcomeLabels[outcome] || outcome,
      value: count,
      key: outcome
    }));

  // Intent conversion rates
  const intentConversionData = Object.entries(data.intentConversionRates || {})
    .map(([intent, stats]) => ({
      name: intentLabels[intent] || intent,
      rate: Math.round(stats.rate),
      total: stats.total,
      converted: stats.converted
    }))
    .sort((a, b) => b.rate - a.rate);

  // Issue → lost correlation
  const issueOutcomeData = Object.entries(data.issueOutcomes || {})
    .map(([issue, stats]) => ({
      name: issueLabels[issue] || issue,
      lostRate: Math.round(stats.rate),
      total: stats.total,
      lost: stats.lost
    }))
    .sort((a, b) => b.lostRate - a.lostRate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Аналитика по тегам
              </CardTitle>
              <CardDescription>
                Анализ намерений клиентов, возражений и их влияния на конверсию
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalytics}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">Всего диалогов</span>
            </div>
            <p className="text-3xl font-bold">{data.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Ср. качество</span>
            </div>
            <p className="text-3xl font-bold">{data.avgQuality?.toFixed(1) || '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Target className="h-4 w-4" />
              <span className="text-sm">Намерений</span>
            </div>
            <p className="text-3xl font-bold">{Object.keys(data.byIntent || {}).length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Возражений</span>
            </div>
            <p className="text-3xl font-bold">{Object.keys(data.byIssue || {}).length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="intents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="intents">Намерения</TabsTrigger>
          <TabsTrigger value="issues">Возражения</TabsTrigger>
          <TabsTrigger value="conversion">Конверсия</TabsTrigger>
          <TabsTrigger value="outcomes">Исходы</TabsTrigger>
        </TabsList>

        {/* Intents Tab */}
        <TabsContent value="intents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Распределение намерений</CardTitle>
              </CardHeader>
              <CardContent>
                {intentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={intentChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Нет данных о намерениях. Переиндексируйте диалоги.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Топ намерений</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {intentChartData.slice(0, 5).map((item, idx) => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={intentColors[item.key] || ''}>
                        {item.name}
                      </Badge>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                    <Progress 
                      value={(item.value / intentChartData[0].value) * 100} 
                      className="h-2" 
                    />
                  </div>
                ))}
                {intentChartData.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Нет данных
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Частота возражений</CardTitle>
              </CardHeader>
              <CardContent>
                {issueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={issueChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {issueChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Нет данных о возражениях
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4" />
                  Возражения → Потери
                </CardTitle>
                <CardDescription>
                  Какие возражения чаще приводят к потере клиента
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {issueOutcomeData.slice(0, 5).map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className={item.lostRate > 50 ? 'text-destructive font-medium' : ''}>
                        {item.lostRate}% потерь
                      </span>
                    </div>
                    <Progress 
                      value={item.lostRate} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {item.lost} из {item.total} диалогов
                    </p>
                  </div>
                ))}
                {issueOutcomeData.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Нет данных о корреляции
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversion Tab */}
        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Конверсия по намерениям
              </CardTitle>
              <CardDescription>
                Какие намерения клиентов лучше конвертируются
              </CardDescription>
            </CardHeader>
            <CardContent>
              {intentConversionData.length > 0 ? (
                <div className="space-y-4">
                  {intentConversionData.map((item) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <div className="w-32 truncate text-sm">{item.name}</div>
                      <div className="flex-1">
                        <Progress value={item.rate} className="h-3" />
                      </div>
                      <div className="w-24 text-right">
                        <span className={`text-sm font-medium ${item.rate >= 50 ? 'text-green-600' : item.rate >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {item.rate}%
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {item.converted}/{item.total}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Нет данных о конверсии. Переиндексируйте диалоги с новыми тегами.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcomes Tab */}
        <TabsContent value="outcomes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Распределение исходов</CardTitle>
            </CardHeader>
            <CardContent>
              {outcomeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={outcomeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Нет данных об исходах
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {outcomeChartData.map((item) => (
              <Card key={item.key}>
                <CardContent className="p-3 text-center">
                  <Badge className={outcomeColors[item.key] || ''}>
                    {item.name}
                  </Badge>
                  <p className="text-2xl font-bold mt-2">{item.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.total > 0 ? Math.round((item.value / data.total) * 100) : 0}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
