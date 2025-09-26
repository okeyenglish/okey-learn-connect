import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Calendar, 
  User, 
  Pause, 
  Play, 
  Eye,
  Snowflake,
  Clock
} from "lucide-react";
import { Subscription } from "@/hooks/useSubscriptions";
import { SubscriptionDetailsModal } from "./SubscriptionDetailsModal";
import { FreezeSubscriptionModal } from "./FreezeSubscriptionModal";
import { useUnfreezeSubscription } from "@/hooks/useSubscriptions";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SubscriptionCardProps {
  subscription: Subscription;
}

export const SubscriptionCard = ({ subscription }: SubscriptionCardProps) => {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  
  const unfreezeSubscription = useUnfreezeSubscription();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'paused':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'expired':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
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

  const handleUnfreeze = () => {
    unfreezeSubscription.mutate(subscription.id);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{subscription.student?.name}</span>
              </div>
              {subscription.student?.phone && (
                <p className="text-sm text-muted-foreground">
                  {subscription.student.phone}
                </p>
              )}
            </div>
            <Badge className={getStatusColor(subscription.status)}>
              {getStatusText(subscription.status)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {subscription.name}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getTypeText(subscription.subscription_type)} • {subscription.total_price}₽
            </p>
          </div>

          {subscription.subscription_type === 'per_lesson' && subscription.total_lessons && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Уроки</span>
                <span className="text-sm font-medium">
                  {subscription.remaining_lessons} / {subscription.total_lessons}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(subscription.valid_from), 'dd.MM.yyyy', { locale: ru })}
              {subscription.valid_until && (
                <> - {format(new Date(subscription.valid_until), 'dd.MM.yyyy', { locale: ru })}</>
              )}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailsModalOpen(true)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Детали
            </Button>
            
            {subscription.status === 'active' && subscription.freeze_enabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFreezeModalOpen(true)}
              >
                <Snowflake className="h-4 w-4 mr-1" />
                Заморозить
              </Button>
            )}
            
            {subscription.status === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnfreeze}
                disabled={unfreezeSubscription.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Разморозить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <SubscriptionDetailsModal
        subscription={subscription}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />

      <FreezeSubscriptionModal
        subscription={subscription}
        open={freezeModalOpen}
        onOpenChange={setFreezeModalOpen}
      />
    </>
  );
};