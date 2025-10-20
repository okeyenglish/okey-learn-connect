import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useFinancialReport,
  useStudentStats,
  useTeacherStatsReport,
  useGroupStatsReport,
} from '@/hooks/useAnalytics';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  Calendar,
  BarChart3,
  Download,
  BookOpen,
  Clock,
  Target,
  AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

export const AnalyticsSection = () => {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: financialReport } = useFinancialReport(
    new Date(startDate),
    new Date(endDate)
  );
  const { data: studentStats } = useStudentStats(new Date(startDate), new Date(endDate));
  const { data: teacherStats = [] } = useTeacherStatsReport(
    new Date(startDate),
    new Date(endDate)
  );
  const { data: groupStats = [] } = useGroupStatsReport(
    new Date(startDate),
    new Date(endDate)
  );

  const handleQuickPeriod = (months: number) => {
    const end = new Date();
    const start = subMonths(end, months);
    setStartDate(format(startOfMonth(start), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(end), 'yyyy-MM-dd'));
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Отчёты и аналитика</h1>
          <p className="text-muted-foreground">
            Финансовые показатели, статистика студентов и преподавателей
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Экспорт
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Начало периода</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Конец периода</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Быстрый выбор</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleQuickPeriod(1)}>
                  1 месяц
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickPeriod(3)}>
                  3 месяца
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickPeriod(6)}>
                  6 месяцев
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickPeriod(12)}>
                  1 год
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Финансы
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            Студенты
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Преподаватели
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Группы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          {financialReport && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Выручка
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {financialReport.total_revenue.toFixed(0)} ₽
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {financialReport.payments_count} платежей
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        Расходы
                      </p>
                      <p className="text-3xl font-bold text-red-600">
                        {financialReport.total_expenses.toFixed(0)} ₽
                      </p>
                      <p className="text-xs text-muted-foreground">Зарплаты</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Прибыль
                      </p>
                      <p
                        className={`text-3xl font-bold ${
                          financialReport.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {financialReport.profit.toFixed(0)} ₽
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Маржа: {financialReport.profit_margin.toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Финансовая сводка</CardTitle>
                  <CardDescription>{financialReport.period}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="text-sm font-medium">Средний платёж</span>
                      <span className="text-lg font-bold">
                        {financialReport.average_payment.toFixed(0)} ₽
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="text-sm font-medium">Количество платежей</span>
                      <span className="text-lg font-bold">
                        {financialReport.payments_count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="text-sm font-medium">Рентабельность</span>
                      <Badge
                        variant={financialReport.profit_margin > 20 ? 'default' : 'secondary'}
                      >
                        {financialReport.profit_margin.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          {studentStats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Всего студентов</p>
                      <p className="text-3xl font-bold">{studentStats.total_students}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        Активных
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {studentStats.active_students}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Новых
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {studentStats.new_students}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Посещаемость
                      </p>
                      <p className="text-3xl font-bold">
                        {studentStats.attendance_rate.toFixed(0)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Дополнительная статистика</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="text-sm font-medium">Средний баланс</span>
                      <span className="text-lg font-bold">
                        {studentStats.average_balance.toFixed(0)} ₽
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">Низкий баланс (&lt;1000₽)</span>
                      </div>
                      <Badge variant="destructive">{studentStats.low_balance_count}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="text-sm font-medium">Отток студентов</span>
                      <span className="text-lg font-bold text-red-600">
                        {studentStats.churned_students}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статистика преподавателей</CardTitle>
              <CardDescription>Отсортировано по заработку</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {teacherStats.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Нет данных за выбранный период
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teacherStats.map((teacher) => (
                      <Card key={teacher.teacher_id}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{teacher.teacher_name}</h3>
                              <Badge variant="default" className="gap-1">
                                <DollarSign className="h-3 w-3" />
                                {teacher.total_earnings.toFixed(0)} ₽
                              </Badge>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Занятий</p>
                                <p className="font-medium">{teacher.total_lessons}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Часов</p>
                                <p className="font-medium">{teacher.total_hours.toFixed(1)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Выполнение</p>
                                <p className="font-medium">
                                  {teacher.completion_rate.toFixed(0)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Ср. ставка</p>
                                <p className="font-medium">
                                  {teacher.average_rate.toFixed(0)} ₽/ч
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статистика по группам</CardTitle>
              <CardDescription>Отсортировано по выручке</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {groupStats.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Нет данных за выбранный период
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groupStats.map((group) => (
                      <Card key={group.group_id}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">{group.group_name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {group.subject} • {group.branch}
                                </p>
                              </div>
                              <Badge variant="default" className="gap-1">
                                <DollarSign className="h-3 w-3" />
                                {group.revenue.toFixed(0)} ₽
                              </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Студентов</p>
                                <p className="font-medium">{group.students_count}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Проведено</p>
                                <p className="font-medium">{group.lessons_held}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Посещаемость</p>
                                <p className="font-medium">
                                  {group.attendance_rate.toFixed(0)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
