import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, Mail, Smartphone, Save, MessageCircle, Clock } from 'lucide-react';
import {
  useEffectiveTeacherNotificationSettings,
  useUpsertTeacherNotificationSettings,
  TeacherNotificationSettingsInput,
} from '@/hooks/useTeacherNotificationSettings';
import { useOrganization } from '@/hooks/useOrganization';

interface TeacherNotificationSettingsCardProps {
  teacherId: string;
  teacherPhone?: string | null;
  teacherEmail?: string | null;
}

const REMINDER_PRESETS = [
  { value: 15, label: '15 мин' },
  { value: 30, label: '30 мин' },
  { value: 60, label: '1 час' },
  { value: 120, label: '2 часа' },
];

export const TeacherNotificationSettingsCard: React.FC<TeacherNotificationSettingsCardProps> = ({
  teacherId,
  teacherPhone,
  teacherEmail,
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
        email_enabled: settings.email_enabled,
        push_enabled: settings.push_enabled,
        schedule_changes: settings.schedule_changes,
        lesson_reminders: settings.lesson_reminders,
        reminder_minutes_before: settings.reminder_minutes_before,
        notification_phone: settings.notification_phone,
        notification_email: settings.notification_email,
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

  const formatReminderTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    if (minutes === 60) return '1 час';
    if (minutes < 120) return `1 ч ${minutes - 60} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} часа`;
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

          <div className="grid gap-4">
            {/* WhatsApp */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <div>
                  <Label className="font-medium">WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    {teacherPhone || localSettings.notification_phone || 'Телефон не указан'}
                  </p>
                </div>
              </div>
              <Switch
                checked={localSettings.whatsapp_enabled ?? false}
                onCheckedChange={(checked) => updateSetting('whatsapp_enabled', checked)}
              />
            </div>

            {/* Email */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <Label className="font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">
                    {teacherEmail || localSettings.notification_email || 'Email не указан'}
                  </p>
                </div>
              </div>
              <Switch
                checked={localSettings.email_enabled ?? false}
                onCheckedChange={(checked) => updateSetting('email_enabled', checked)}
              />
            </div>

            {/* Push */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-purple-600" />
                <div>
                  <Label className="font-medium">Push-уведомления</Label>
                  <p className="text-sm text-muted-foreground">
                    Браузерные и мобильные уведомления
                  </p>
                </div>
              </div>
              <Switch
                checked={localSettings.push_enabled ?? false}
                onCheckedChange={(checked) => updateSetting('push_enabled', checked)}
              />
            </div>
          </div>
        </div>

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
              <Label htmlFor="notification_phone">Телефон для уведомлений</Label>
              <Input
                id="notification_phone"
                placeholder="+7 (xxx) xxx-xx-xx"
                value={localSettings.notification_phone || ''}
                onChange={(e) => updateSetting('notification_phone', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
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
