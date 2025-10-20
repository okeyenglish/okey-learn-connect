import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, TrendingDown, Phone, DollarSign } from 'lucide-react';
import { useLowBalanceStudents } from '@/hooks/useStudentBalances';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LowBalanceStudentsWidgetProps {
  onStudentClick?: (studentId: string) => void;
  onAddBalance?: (studentId: string) => void;
}

export const LowBalanceStudentsWidget = ({ 
  onStudentClick, 
  onAddBalance 
}: LowBalanceStudentsWidgetProps) => {
  const { data: students, isLoading } = useLowBalanceStudents(7, 4);

  const getUrgencyColor = (daysLeft: number) => {
    if (daysLeft <= 0) return 'destructive';
    if (daysLeft <= 3) return 'destructive';
    if (daysLeft <= 7) return 'default';
    return 'secondary';
  };

  const getUrgencyIcon = (daysLeft: number) => {
    if (daysLeft <= 0) return <AlertCircle className="h-4 w-4" />;
    if (daysLeft <= 3) return <AlertCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!students || students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Студенты с низким балансом
          </CardTitle>
          <CardDescription>
            Нет студентов, требующих пополнения баланса
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>У всех студентов достаточный баланс</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-destructive" />
          Требуется пополнение баланса
        </CardTitle>
        <CardDescription>
          {students.length} {students.length === 1 ? 'студент' : 'студентов'} с низким балансом
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {students.map((student) => (
              <Card 
                key={student.student_id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onStudentClick?.(student.student_id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{student.student_name}</h4>
                        <Badge variant={getUrgencyColor(student.estimated_days_left)} className="gap-1">
                          {getUrgencyIcon(student.estimated_days_left)}
                          {student.estimated_days_left <= 0 
                            ? 'Просрочено' 
                            : `${student.estimated_days_left} дней`
                          }
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{student.balance_hours.toFixed(1)} ак. часов</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingDown className="h-3 w-3" />
                          <span>{student.weekly_consumption.toFixed(1)} часов/нед</span>
                        </div>
                      </div>

                      {student.last_payment_date && (
                        <p className="text-xs text-muted-foreground">
                          Последняя оплата: {new Date(student.last_payment_date).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddBalance?.(student.student_id);
                      }}
                      className="gap-2 shrink-0"
                    >
                      <DollarSign className="h-4 w-4" />
                      Пополнить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
