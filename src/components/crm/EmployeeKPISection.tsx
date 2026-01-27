import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Calendar,
  Award,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EmployeeKPISectionProps {
  className?: string;
}

export const EmployeeKPISection: React.FC<EmployeeKPISectionProps> = ({ className = '' }) => {
  const { user, loading: isLoading } = useAuth();

  // Mock data - replace with real data from hooks/API
  const kpiData = {
    currentMonth: {
      name: format(new Date(), 'LLLL yyyy', { locale: ru }),
      earned: 45600,
      target: 60000,
      bonus: 5200,
      hoursWorked: 142,
      hoursTarget: 160,
      lessonsCompleted: 48,
      lessonsTarget: 55,
      clientSatisfaction: 4.8,
      satisfactionTarget: 4.5,
    },
    metrics: [
      { name: 'Проведено занятий', value: 48, target: 55, unit: 'шт', trend: 'up' as const },
      { name: 'Отработано часов', value: 142, target: 160, unit: 'ч', trend: 'down' as const },
      { name: 'Новые клиенты', value: 8, target: 10, unit: 'чел', trend: 'up' as const },
      { name: 'Конверсия пробных', value: 75, target: 70, unit: '%', trend: 'up' as const },
    ],
    contracts: [
      { id: '1', title: 'Трудовой договор', date: '2024-01-15', status: 'active' as const },
      { id: '2', title: 'Соглашение о конфиденциальности', date: '2024-01-15', status: 'active' as const },
      { id: '3', title: 'Допсоглашение #1', date: '2024-06-01', status: 'active' as const },
    ],
    paymentHistory: [
      { id: '1', period: 'Январь 2026', amount: 52400, date: '2026-02-05', status: 'paid' as const },
      { id: '2', period: 'Декабрь 2025', amount: 48200, date: '2026-01-05', status: 'paid' as const },
      { id: '3', period: 'Ноябрь 2025', amount: 51000, date: '2025-12-05', status: 'paid' as const },
    ],
    workConditions: {
      position: 'Преподаватель английского языка',
      rate: 800,
      rateUnit: 'руб/час',
      schedule: 'Гибкий график',
      branch: 'Котельники',
      startDate: '2024-01-15',
    }
  };

  const getProgressColor = (current: number, target: number) => {
    const percent = (current / target) * 100;
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="p-4 space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Мои показатели</h2>
            <p className="text-sm text-muted-foreground">{kpiData.currentMonth.name}</p>
          </div>
        </div>

        {/* Earnings Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="font-medium">Заработок за месяц</span>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12%
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{kpiData.currentMonth.earned.toLocaleString('ru-RU')}</span>
                <span className="text-muted-foreground mb-1">₽</span>
              </div>
              <Progress 
                value={(kpiData.currentMonth.earned / kpiData.currentMonth.target) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Цель: {kpiData.currentMonth.target.toLocaleString('ru-RU')} ₽</span>
                <span>{Math.round((kpiData.currentMonth.earned / kpiData.currentMonth.target) * 100)}%</span>
              </div>
            </div>
            {kpiData.currentMonth.bonus > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Бонус: <strong>{kpiData.currentMonth.bonus.toLocaleString('ru-RU')} ₽</strong></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              KPI показатели
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpiData.metrics.map((metric, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{metric.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {metric.value}/{metric.target} {metric.unit}
                    </span>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </div>
                <Progress 
                  value={(metric.value / metric.target) * 100} 
                  className="h-1.5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Work Conditions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Условия работы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Должность</p>
                <p className="font-medium">{kpiData.workConditions.position}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Филиал</p>
                <p className="font-medium">{kpiData.workConditions.branch}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ставка</p>
                <p className="font-medium">{kpiData.workConditions.rate} {kpiData.workConditions.rateUnit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">График</p>
                <p className="font-medium">{kpiData.workConditions.schedule}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              История выплат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kpiData.paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-sm">{payment.period}</p>
                  <p className="text-xs text-muted-foreground">Выплачено: {payment.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{payment.amount.toLocaleString('ru-RU')} ₽</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Мои документы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kpiData.contracts.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{contract.title}</p>
                    <p className="text-xs text-muted-foreground">от {contract.date}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  Активен
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default EmployeeKPISection;
