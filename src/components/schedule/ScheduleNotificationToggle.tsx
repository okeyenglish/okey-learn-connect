import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, MessageCircle, Loader2 } from 'lucide-react';
import { useScheduleNotifications } from '@/hooks/useScheduleNotifications';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ScheduleNotificationToggleProps {
  className?: string;
}

export const ScheduleNotificationToggle: React.FC<ScheduleNotificationToggleProps> = ({
  className = ''
}) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { checkNotificationSettings } = useScheduleNotifications();

  useEffect(() => {
    const checkSettings = async () => {
      const isEnabled = await checkNotificationSettings();
      setEnabled(isEnabled);
      setLoading(false);
    };
    checkSettings();
  }, [checkNotificationSettings]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Проверка настроек...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-3 ${className}`}>
            <div className="flex items-center gap-2">
              {enabled ? (
                <Bell className="h-4 w-4 text-green-600" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label 
                htmlFor="schedule-notifications" 
                className="text-sm cursor-pointer"
              >
                WhatsApp уведомления
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="schedule-notifications"
                checked={enabled}
                disabled={true}
                className="data-[state=checked]:bg-green-600"
              />
              {enabled && (
                <MessageCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {enabled 
              ? 'Преподаватели получат уведомления об изменениях в расписании' 
              : 'Настройте WhatsApp интеграцию для отправки уведомлений'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
