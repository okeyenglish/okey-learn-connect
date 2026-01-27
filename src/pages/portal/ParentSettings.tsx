import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/typedClient";
import { toast } from "sonner";
import { Bell, Clock, Save, Loader2, ArrowLeft, Smartphone, CheckCircle, XCircle } from "lucide-react";
import { usePortalPushNotifications } from "@/hooks/usePortalPushNotifications";

type NotificationFrequency = 'instant' | '15min' | 'hourly' | 'daily' | 'disabled';

interface ParentSettings {
  notification_frequency: NotificationFrequency;
  whatsapp_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

const frequencyOptions: { value: NotificationFrequency; label: string; description: string }[] = [
  { value: 'instant', label: 'Мгновенно', description: 'Уведомления приходят сразу при новом сообщении' },
  { value: '15min', label: 'Каждые 15 минут', description: 'Сводка непрочитанных сообщений раз в 15 минут' },
  { value: 'hourly', label: 'Раз в час', description: 'Сводка непрочитанных сообщений раз в час' },
  { value: 'daily', label: 'Раз в день', description: 'Ежедневная сводка в 9:00' },
  { value: 'disabled', label: 'Отключены', description: 'Уведомления не отправляются' },
];

export default function ParentSettings() {
  const navigate = useNavigate();
  const context = useOutletContext<{ client: any }>();
  const client = context?.client;
  
  const [settings, setSettings] = useState<ParentSettings>({
    notification_frequency: '15min',
    whatsapp_notifications: true,
    email_notifications: false,
    push_notifications: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    isSupported: isPushSupported,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    error: pushError,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePortalPushNotifications(client?.id);

  useEffect(() => {
    if (client?.id) {
      loadSettings();
    }
  }, [client?.id]);

  // Sync push subscription state with settings
  useEffect(() => {
    if (!isPushLoading) {
      setSettings(prev => ({
        ...prev,
        push_notifications: isPushSubscribed,
      }));
    }
  }, [isPushSubscribed, isPushLoading]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('portal_settings')
        .eq('id', client.id)
        .single();

      if (error) throw error;

      if (data?.portal_settings) {
        setSettings({
          notification_frequency: data.portal_settings.notification_frequency || '15min',
          whatsapp_notifications: data.portal_settings.whatsapp_notifications ?? true,
          email_notifications: data.portal_settings.email_notifications ?? false,
          push_notifications: data.portal_settings.push_notifications ?? false,
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribeToPush();
      if (success) {
        toast.success('Push-уведомления включены');
        setSettings(prev => ({ ...prev, push_notifications: true }));
      } else if (pushError) {
        toast.error(pushError);
      }
    } else {
      const success = await unsubscribeFromPush();
      if (success) {
        toast.success('Push-уведомления отключены');
        setSettings(prev => ({ ...prev, push_notifications: false }));
      }
    }
  };

  const saveSettings = async () => {
    if (!client?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          portal_settings: settings
        })
        .eq('id', client.id);

      if (error) throw error;

      toast.success('Настройки сохранены');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Настройки</h1>
          <p className="text-muted-foreground">Управление уведомлениями и параметрами портала</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
          <CardDescription>
            Настройте частоту и каналы получения уведомлений о новых сообщениях
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frequency selection */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Clock className="h-4 w-4" />
              Частота уведомлений
            </Label>
            <RadioGroup
              value={settings.notification_frequency}
              onValueChange={(value) => setSettings(prev => ({ 
                ...prev, 
                notification_frequency: value as NotificationFrequency 
              }))}
              className="space-y-3"
            >
              {frequencyOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    settings.notification_frequency === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Notification channels */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Каналы уведомлений</Label>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления в WhatsApp
                  </p>
                </div>
                <Switch
                  checked={settings.whatsapp_notifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    whatsapp_notifications: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления на email
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    email_notifications: checked 
                  }))}
                />
              </div>

              {/* Push notifications with subscription management */}
              <div className="p-3 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <p className="font-medium">Push-уведомления</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Мгновенные уведомления в браузере
                    </p>
                  </div>
                  <Switch
                    checked={settings.push_notifications}
                    onCheckedChange={handlePushToggle}
                    disabled={isPushLoading || !isPushSupported}
                  />
                </div>

                {/* Push status indicator */}
                {isPushSupported ? (
                  <div className={`flex items-center gap-2 text-xs ${
                    isPushSubscribed ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    {isPushLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Проверка...</span>
                      </>
                    ) : isPushSubscribed ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>Подписка активна</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        <span>Подписка не активна</span>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600">
                    Push-уведомления не поддерживаются в вашем браузере
                  </p>
                )}

                {pushError && (
                  <p className="text-xs text-destructive">{pushError}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Сохранить настройки
      </Button>
    </div>
  );
}
