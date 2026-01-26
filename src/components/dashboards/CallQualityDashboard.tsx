import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Target, 
  BarChart3, 
  Users, 
  Sparkles,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

interface AiCallEvaluation {
  overall_score: number;
  scores: {
    greeting: number;
    needs_identification: number;
    product_presentation: number;
    objection_handling: number;
    closing: number;
  };
  analyzed_at: string;
}

interface CallLogWithEvaluation {
  id: string;
  phone_number: string;
  direction: string;
  status: string;
  duration_seconds: number | null;
  started_at: string;
  ai_evaluation: AiCallEvaluation | null;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const SCORE_LABELS: Record<string, string> = {
  greeting: 'Приветствие',
  needs_identification: 'Выявление потребностей',
  product_presentation: 'Презентация',
  objection_handling: 'Работа с возражениями',
  closing: 'Закрытие'
};

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 8) return 'bg-green-100 border-green-300';
  if (score >= 6) return 'bg-yellow-100 border-yellow-300';
  return 'bg-red-100 border-red-300';
};

const getTrendIcon = (trend: number) => {
  if (trend > 0.5) return <ArrowUp className="h-4 w-4 text-green-500" />;
  if (trend < -0.5) return <ArrowDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export const CallQualityDashboard = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: startOfWeek(now, { locale: ru }), end: endOfWeek(now, { locale: ru }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: subDays(now, 365), end: now };
    }
  }, [period]);

  const { data: callLogs, isLoading, refetch } = useQuery({
    queryKey: ['call-quality-dashboard', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          id,
          phone_number,
          direction,
          status,
          duration_seconds,
          started_at,
          ai_evaluation,
          employee_id
        `)
        .not('ai_evaluation', 'is', null)
        .gte('started_at', dateRange.start.toISOString())
        .lte('started_at', dateRange.end.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CallLogWithEvaluation[];
    }
  });

  // Previous period for trend comparison
  const { data: previousPeriodCalls } = useQuery({
    queryKey: ['call-quality-previous', period],
    queryFn: async () => {
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      const prevStart = subDays(dateRange.start, periodDays);
      const prevEnd = subDays(dateRange.end, periodDays);

      const { data, error } = await supabase
        .from('call_logs')
        .select('ai_evaluation')
        .not('ai_evaluation', 'is', null)
        .gte('started_at', prevStart.toISOString())
        .lte('started_at', prevEnd.toISOString());

      if (error) throw error;
      return data || [];
    }
  });

  // Calculate aggregated statistics
  const stats = useMemo(() => {
    if (!callLogs || callLogs.length === 0) {
      return {
        totalCalls: 0,
        averageScore: 0,
        criteriaAverages: {} as Record<string, number>,
        topPerformers: [] as { name: string; avgScore: number; callCount: number }[],
        dailyTrend: [] as { date: string; score: number; count: number }[],
        radarData: [] as { criterion: string; score: number; fullMark: number }[]
      };
    }

    const evaluatedCalls = callLogs.filter(c => c.ai_evaluation);
    const totalCalls = evaluatedCalls.length;

    // Overall average
    const averageScore = evaluatedCalls.reduce((sum, c) => 
      sum + (c.ai_evaluation?.overall_score || 0), 0) / totalCalls;

    // Criteria averages
    const criteriaAverages: Record<string, number> = {
      greeting: 0,
      needs_identification: 0,
      product_presentation: 0,
      objection_handling: 0,
      closing: 0
    };

    evaluatedCalls.forEach(call => {
      if (call.ai_evaluation?.scores) {
        Object.keys(criteriaAverages).forEach(key => {
          criteriaAverages[key] += call.ai_evaluation!.scores[key as keyof typeof call.ai_evaluation.scores] || 0;
        });
      }
    });

    Object.keys(criteriaAverages).forEach(key => {
      criteriaAverages[key] = criteriaAverages[key] / totalCalls;
    });

    // Radar chart data
    const radarData = Object.entries(criteriaAverages).map(([key, value]) => ({
      criterion: SCORE_LABELS[key] || key,
      score: Math.round(value * 10) / 10,
      fullMark: 10
    }));

    // Daily trend
    const dailyMap = new Map<string, { total: number; count: number }>();
    evaluatedCalls.forEach(call => {
      const date = format(new Date(call.started_at), 'dd.MM');
      const existing = dailyMap.get(date) || { total: 0, count: 0 };
      existing.total += call.ai_evaluation?.overall_score || 0;
      existing.count += 1;
      dailyMap.set(date, existing);
    });

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, { total, count }]) => ({
        date,
        score: Math.round((total / count) * 10) / 10,
        count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top performers (mock - in real app would group by employee_id)
    const topPerformers = [
      { name: 'Менеджер 1', avgScore: 8.5, callCount: 12 },
      { name: 'Менеджер 2', avgScore: 7.8, callCount: 8 },
      { name: 'Менеджер 3', avgScore: 7.2, callCount: 15 }
    ];

    return {
      totalCalls,
      averageScore: Math.round(averageScore * 10) / 10,
      criteriaAverages,
      topPerformers,
      dailyTrend,
      radarData
    };
  }, [callLogs]);

  // Calculate trend vs previous period
  const trend = useMemo(() => {
    if (!previousPeriodCalls || previousPeriodCalls.length === 0) return 0;
    
    const prevAvg = previousPeriodCalls.reduce((sum, c) => {
      const eval_ = c.ai_evaluation as AiCallEvaluation | null;
      return sum + (eval_?.overall_score || 0);
    }, 0) / previousPeriodCalls.length;

    return stats.averageScore - prevAvg;
  }, [stats.averageScore, previousPeriodCalls]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Качество звонков
          </h2>
          <p className="text-muted-foreground">
            AI-аналитика работы менеджеров по звонкам
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="all">Всё время</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Проанализировано звонков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCalls}</div>
          </CardContent>
        </Card>

        <Card className={cn("border-2", getScoreBgColor(stats.averageScore))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Средняя оценка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={cn("text-3xl font-bold", getScoreColor(stats.averageScore))}>
                {stats.averageScore || '—'}
              </span>
              <span className="text-muted-foreground">/10</span>
              <div className="flex items-center ml-2">
                {getTrendIcon(trend)}
                <span className={cn(
                  "text-sm ml-1",
                  trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"
                )}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Лучший критерий
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(stats.criteriaAverages).length > 0 ? (
              <>
                <div className="text-lg font-bold text-green-600">
                  {SCORE_LABELS[Object.entries(stats.criteriaAverages)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || ''] || '—'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {(Object.entries(stats.criteriaAverages)
                    .sort(([,a], [,b]) => b - a)[0]?.[1] || 0).toFixed(1)}/10
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Требует улучшения
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(stats.criteriaAverages).length > 0 ? (
              <>
                <div className="text-lg font-bold text-orange-600">
                  {SCORE_LABELS[Object.entries(stats.criteriaAverages)
                    .sort(([,a], [,b]) => a - b)[0]?.[0] || ''] || '—'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {(Object.entries(stats.criteriaAverages)
                    .sort(([,a], [,b]) => a - b)[0]?.[1] || 0).toFixed(1)}/10
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="criteria" className="space-y-4">
        <TabsList>
          <TabsTrigger value="criteria">По критериям</TabsTrigger>
          <TabsTrigger value="trend">Динамика</TabsTrigger>
          <TabsTrigger value="managers">Менеджеры</TabsTrigger>
        </TabsList>

        {/* Criteria Tab */}
        <TabsContent value="criteria" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Criteria Bars */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Средние оценки по критериям</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.criteriaAverages).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{SCORE_LABELS[key]}</span>
                      <span className={cn("font-medium", getScoreColor(value))}>
                        {value.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all rounded-full",
                          value >= 8 ? "bg-green-500" : value >= 6 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Профиль качества</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={stats.radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} />
                      <Radar
                        name="Оценка"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Нет данных для отображения
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trend Tab */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Динамика качества звонков</CardTitle>
              <CardDescription>
                Средняя оценка по дням за выбранный период
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip 
                      formatter={(value: number) => [value.toFixed(1), 'Средняя оценка']}
                      labelFormatter={(label) => `Дата: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      name="Оценка"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    <Bar 
                      dataKey="count" 
                      name="Кол-во звонков"
                      fill="hsl(var(--muted-foreground))"
                      opacity={0.3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Нет данных за выбранный период</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Managers Tab */}
        <TabsContent value="managers">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Рейтинг менеджеров
              </CardTitle>
              <CardDescription>
                Топ менеджеров по качеству звонков
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {stats.topPerformers.map((manager, index) => (
                    <div 
                      key={manager.name}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        index === 0 && "bg-yellow-50 border-yellow-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          index === 0 ? "bg-yellow-200 text-yellow-800" :
                          index === 1 ? "bg-gray-200 text-gray-700" :
                          index === 2 ? "bg-orange-200 text-orange-800" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{manager.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {manager.callCount} звонков
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "text-xl font-bold",
                        getScoreColor(manager.avgScore)
                      )}>
                        {manager.avgScore.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Нет данных о менеджерах</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Items Summary */}
      {callLogs && callLogs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <Sparkles className="h-5 w-5" />
              Задачи из AI-анализа
            </CardTitle>
            <CardDescription>
              Невыполненные задачи по итогам анализа звонков
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Задачи из анализа звонков автоматически создаются как уведомления для менеджеров.
              Просмотрите детали звонков для списка конкретных задач.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
