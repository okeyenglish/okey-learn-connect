import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Loader2, Bell, Mail, Smartphone, Save, MessageCircle, Clock, 
  Send, Building2, Star
} from 'lucide-react';
import {
  useEffectiveTeacherNotificationSettings,
  useUpsertTeacherNotificationSettings,
  TeacherNotificationSettingsInput,
  NotificationChannel,
  getChannelDisplayName,
} from '@/hooks/useTeacherNotificationSettings';
import { useOrganization } from '@/hooks/useOrganization';

interface TeacherNotificationSettingsCardProps {
  teacherId: string;
  teacherPhone?: string | null;
  teacherEmail?: string | null;
  teacherTelegramId?: string | null;
}

const REMINDER_PRESETS = [
  { value: 15, label: '15 мин' },
  { value: 30, label: '30 мин' },
  { value: 60, label: '1 час' },
  { value: 120, label: '2 часа' },
];

// Channel configuration
const MESSENGER_CHANNELS: Array<{
  key: keyof TeacherNotificationSettingsInput;
  channel: NotificationChannel;
  icon: React.ReactNode;
  color: string;
  description: string;
}> = [
  {
    key: 'internal_chat_enabled',
    channel: 'internal_chat',
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-indigo-600',
    description: 'Внутренний чат с организацией',
  },
  {
    key: 'whatsapp_enabled',
    channel: 'whatsapp',
    icon: <MessageCircle className="h-5 w-5" />,
    color: 'text-green-600',
    description: 'WhatsApp',
  },
  {
    key: 'telegram_enabled',
    channel: 'telegram',
    icon: <Send className="h-5 w-5" />,
    color: 'text-blue-500',
    description: 'Telegram',
  },
  {
    key: 'max_enabled',
    channel: 'max',
    icon: <MessageCircle className="h-5 w-5" />,
    color: 'text-purple-600',
    description: 'MAX',
  },
  {
    key: 'email_enabled',
    channel: 'email',
    icon: <Mail className="h-5 w-5" />,
    color: 'text-orange-600',
    description: 'Email',
  },
  {
    key: 'push_enabled',
    channel: 'push',
    icon: <Smartphone className="h-5 w-5" />,
    color: 'text-pink-600',
    description: 'Push-уведомления (браузер/мобильное)',
  },
];

export const TeacherNotificationSettingsCard: React.FC<TeacherNotificationSettingsCardProps> = ({
  teacherId,
  teacherPhone,
  teacherEmail,
  teacherTelegramId,
}) => {
  const { organization } = useOrganization();
  const { settings, isLoading, hasCustomSettings } = useEffectiveTeacherNotificationSettings(teacherId);
  const upsertMutation = useUpsertTeacherNotificationSettings();

  const [localSettings, setLocalSettings] = useState<TeacherNotificationSettingsInput>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local settings when data loads
  useEffect(() => {
    if (!isLoading) {
      setLocalSettings({
        whatsapp_enabled: settings.whatsapp_enabled,
        telegram_enabled: settings.telegram_enabled,
        max_enabled: settings.max_enabled,
        internal_chat_enabled: settings.internal_chat_enabled,
        email_enabled: settings.email_enabled,
        push_enabled: settings.push_enabled,
        preferred_channel: settings.preferred_channel,
        schedule_changes: settings.schedule_changes,
        lesson_reminders: settings.lesson_reminders,
        reminder_minutes_before: settings.reminder_minutes_before,
        notification_phone: settings.notification_phone,
        notification_email: settings.notification_email,
        notification_telegram_id: settings.notification_telegram_id,
      });
    }
  }, [isLoading, settings]);

  const updateSetting = <K extends keyof TeacherNotificationSettingsInput>(
    key: K,
    value: TeacherNotificationSettingsInput[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    await upsertMutation.mutateAsync({
      teacherId,
      organizationId: organization.id,
      settings: localSettings,
    });
    setHasChanges(false);
  };

  // Get enabled channels for preferred channel selection
  const getEnabledChannelsForSelection = (): NotificationChannel[] => {
    const channels: NotificationChannel[] = [];
    if (localSettings.internal_chat_enabled) channels.push('internal_chat');
    if (localSettings.whatsapp_enabled) channels.push('whatsapp');
    if (localSettings.telegram_enabled) channels.push('telegram');
    if (localSettings.max_enabled) channels.push('max');
    if (localSettings.email_enabled) channels.push('email');
    if (localSettings.push_enabled) channels.push('push');
    return channels;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const reminderMinutes = localSettings.reminder_minutes_before ?? 60;
  const enabledChannels = getEnabledChannelsForSelection();

  const formatReminderTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    if (minutes === 60) return '1 час';
    if (minutes < 120) return `1 ч ${minutes - 60} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} часа`;
  };

  const getContactInfo = (channel: NotificationChannel): string => {
    switch (channel) {
      case 'whatsapp':
        return teacherPhone || localSettings.notification_phone || 'Телефон не указан';
      case 'telegram':
        return teacherTelegramId || localSettings.notification_telegram_id || 'Telegram ID не указан';
      case 'max':
        return teacherPhone || localSettings.notification_phone || 'Телефон не указан';
      case 'email':
        return teacherEmail || localSettings.notification_email || 'Email не указан';
      case 'internal_chat':
        return organization?.name || 'Чат с организацией';
      case 'push':
        return 'Браузерные и мобильные уведомления';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Настройки уведомлений
            </CardTitle>
            <CardDescription>
              Выберите каналы и типы уведомлений для преподавателя
            </CardDescription>
          </div>
          {!hasCustomSettings && (
            <Badge variant="outline" className="text-xs">
              По умолчанию
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Каналы уведомлений */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Каналы уведомлений
          </h4>

          <div className="grid gap-3">
            {MESSENGER_CHANNELS.map((channelConfig) => {
              const isEnabled = localSettings[channelConfig.key] as boolean ?? false;
              const isPreferred = localSettings.preferred_channel === channelConfig.channel;
              
              return (
                <div 
                  key={channelConfig.channel}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    isPreferred ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={channelConfig.color}>
                      {channelConfig.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">{channelConfig.description}</Label>
                        {isPreferred && (
                          <Badge variant="default" className="text-xs gap-1">
                            <Star className="h-3 w-3" />
                            Основной
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getContactInfo(channelConfig.channel)}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                      updateSetting(channelConfig.key as keyof TeacherNotificationSettingsInput, checked);
                      // If disabling the preferred channel, switch to another enabled one
                      if (!checked && isPreferred) {
                        const otherEnabled = MESSENGER_CHANNELS.find(
                          c => c.channel !== channelConfig.channel && 
                               localSettings[c.key as keyof TeacherNotificationSettingsInput]
                        );
                        if (otherEnabled) {
                          updateSetting('preferred_channel', otherEnabled.channel);
                        }
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Предпочтительный канал */}
        {enabledChannels.length > 1 && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Star className="h-4 w-4" />
              Основной канал уведомлений
            </h4>
            <p className="text-sm text-muted-foreground">
              Уведомления будут отправляться в первую очередь через выбранный канал
            </p>
            
            <RadioGroup
              value={localSettings.preferred_channel}
              onValueChange={(value) => updateSetting('preferred_channel', value as NotificationChannel)}
              className="grid gap-2"
            >
              {enabledChannels.map((channel) => (
                <div key={channel} className="flex items-center space-x-2">
                  <RadioGroupItem value={channel} id={`channel-${channel}`} />
                  <Label htmlFor={`channel-${channel}`} className="cursor-pointer">
                    {getChannelDisplayName(channel)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Типы уведомлений */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Типы уведомлений
          </h4>

          <div className="grid gap-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="font-medium">Изменения в расписании</Label>
                <p className="text-sm text-muted-foreground">
                  Перенос, отмена или добавление занятий
                </p>
              </div>
              <Switch
                checked={localSettings.schedule_changes ?? true}
                onCheckedChange={(checked) => updateSetting('schedule_changes', checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="font-medium">Напоминания о занятиях</Label>
                <p className="text-sm text-muted-foreground">
                  Напоминание перед началом занятия
                </p>
              </div>
              <Switch
                checked={localSettings.lesson_reminders ?? true}
                onCheckedChange={(checked) => updateSetting('lesson_reminders', checked)}
              />
            </div>
          </div>
        </div>

        {/* Время напоминания */}
        {localSettings.lesson_reminders && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Время напоминания
            </h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">За сколько до занятия напоминать:</span>
                <Badge variant="secondary" className="text-sm">
                  {formatReminderTime(reminderMinutes)}
                </Badge>
              </div>

              <Slider
                value={[reminderMinutes]}
                onValueChange={([value]) => updateSetting('reminder_minutes_before', value)}
                min={5}
                max={180}
                step={5}
                className="w-full"
              />

              <div className="flex gap-2 flex-wrap">
                {REMINDER_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={reminderMinutes === preset.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('reminder_minutes_before', preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Альтернативные контакты */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Альтернативные контакты (опционально)
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notification_phone">Телефон (WhatsApp/MAX)</Label>
              <Input
                id="notification_phone"
                placeholder="+7 (xxx) xxx-xx-xx"
                value={localSettings.notification_phone || ''}
                onChange={(e) => updateSetting('notification_phone', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification_telegram_id">Telegram ID</Label>
              <Input
                id="notification_telegram_id"
                placeholder="@username или ID"
                value={localSettings.notification_telegram_id || ''}
                onChange={(e) => updateSetting('notification_telegram_id', e.target.value || null)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notification_email">Email для уведомлений</Label>
              <Input
                id="notification_email"
                type="email"
                placeholder="teacher@example.com"
                value={localSettings.notification_email || ''}
                onChange={(e) => updateSetting('notification_email', e.target.value || null)}
              />
            </div>
          </div>
        </div>

        {/* Кнопка сохранения */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || upsertMutation.isPending}
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Сохранить настройки
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};