import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Subscription } from "@/hooks/useSubscriptions";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  User, 
  CreditCard, 
  Calendar, 
  Clock, 
  Snowflake,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface SubscriptionDetailsModalProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionDetailsModal = ({ 
  subscription, 
  open, 
  onOpenChange 
}: SubscriptionDetailsModalProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активный';
      case 'paused':
        return 'Заморожен';
      case 'expired':
        return 'Истек';
      case 'cancelled':
        return 'Отменен';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'per_lesson':
        return 'Поурочный';
      case 'monthly':
        return 'Помесячный';
      case 'weekly':
        return 'Понедельный';
      default:
        return type;
    }
  };

  const getProgress = () => {
    if (subscription.subscription_type === 'per_lesson' && subscription.total_lessons && subscription.remaining_lessons !== undefined) {
      const used = subscription.total_lessons - subscription.remaining_lessons;
      return Math.round((used / subscription.total_lessons) * 100);
    }
    return 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CreditCard className="h-6 w-6" />
            Детали абонемента
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Студент и план
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Студент</label>
                  <p className="text-base">{subscription.student?.name}</p>
                  {subscription.student?.phone && (
                    <p className="text-sm text-muted-foreground">{subscription.student.phone}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Статус</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(subscription.status)}>
                      {getStatusText(subscription.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Тарифный план</label>
                  <p className="text-base">{subscription.subscription_plan?.name}</p>
                  {subscription.subscription_plan?.description && (
                    <p className="text-sm text-muted-foreground">{subscription.subscription_plan.description}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Тип</label>
                  <p className="text-base">{getTypeText(subscription.subscription_type)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Стоимость</label>
                <p className="text-2xl font-bold text-primary">{subscription.price}₽</p>
              </div>
            </CardContent>
          </Card>

          {/* Срок действия */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Срок действия
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Дата начала</label>
                  <p className="text-base">
                    {format(new Date(subscription.valid_from), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                </div>
                {subscription.valid_until && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Дата окончания</label>
                    <p className="text-base">
                      {format(new Date(subscription.valid_until), 'dd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Создан</label>
                  <p className="text-sm">
                    {format(new Date(subscription.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Обновлен</label>
                  <p className="text-sm">
                    {format(new Date(subscription.updated_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Уроки (только для поурочных абонементов) */}
          {subscription.subscription_type === 'per_lesson' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Использование уроков
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{subscription.total_lessons || 0}</p>
                    <p className="text-sm text-muted-foreground">Всего уроков</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{subscription.remaining_lessons || 0}</p>
                    <p className="text-sm text-muted-foreground">Осталось</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {(subscription.total_lessons || 0) - (subscription.remaining_lessons || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Использовано</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Прогресс</span>
                    <span className="text-sm text-muted-foreground">{getProgress()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all" 
                      style={{ width: `${getProgress()}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Настройки заморозки */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Snowflake className="h-5 w-5" />
                Заморозка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {subscription.freeze_enabled ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Заморозка разрешена</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Заморозка запрещена</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};