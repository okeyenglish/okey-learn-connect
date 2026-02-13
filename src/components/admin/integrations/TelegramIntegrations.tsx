import React, { useState } from 'react';
import { Send, Plus, Star, MoreVertical, Settings2, Copy, Trash2, AlertCircle, Loader2, Wifi, MessageSquare, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMessengerIntegrations, MessengerIntegration } from '@/hooks/useMessengerIntegrations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { IntegrationEditDialog } from './IntegrationEditDialog';
import { TelegramCrmConnectDialog } from './TelegramCrmConnectDialog';
import { TelegramCrmProfileStatus } from './TelegramCrmProfileStatus';
import { SettingsFieldConfig } from './IntegrationsList';

// Telegram provider options
const telegramProviders = [
  { 
    value: 'wappi', 
    label: 'Wappi.pro User API', 
    description: 'Интеграция через облачный сервис Wappi.pro' 
  },
  { 
    value: 'telegram_crm', 
    label: 'Telegram CRM', 
    description: 'Подключение через номер телефона' 
  },
];

// Telegram settings fields - only for wappi provider
const telegramFields: SettingsFieldConfig[] = [
  // Wappi.pro fields
  {
    key: 'profileId',
    label: 'Profile ID',
    type: 'text',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'ID Telegram профиля из личного кабинета Wappi.pro',
    required: true,
    showForProviders: ['wappi'],
  },
  {
    key: 'apiToken',
    label: 'API Token',
    type: 'password',
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText: 'Токен авторизации из настроек Wappi.pro',
    required: true,
    showForProviders: ['wappi'],
  },
];

export const TelegramIntegrations: React.FC = () => {
  const { toast } = useToast();
  const {
    integrations,
    isLoading,
    deleteIntegration,
    toggleEnabled,
    setPrimary,
    getWebhookUrl,
    isDeleting,
    refetch,
  } = useMessengerIntegrations('telegram');

  const [editingIntegration, setEditingIntegration] = useState<MessengerIntegration | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCrmConnectOpen, setIsCrmConnectOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [testingSendId, setTestingSendId] = useState<string | null>(null);
  const [testSendIntegration, setTestSendIntegration] = useState<MessengerIntegration | null>(null);
  const [testRecipient, setTestRecipient] = useState('');

  // Test webhook endpoint for Wappi integrations
  const handleTestWebhook = async (integration: MessengerIntegration) => {
    const profileId = integration.settings?.profileId as string | undefined;
    
    if (!profileId) {
      toast({
        title: 'Ошибка',
        description: 'Profile ID не задан в настройках интеграции',
        variant: 'destructive',
      });
      return;
    }

    setTestingWebhookId(integration.id);

    try {
      const webhookUrl = `https://api.academyos.ru/functions/v1/telegram-webhook?profile_id=${encodeURIComponent(profileId)}`;
      const res = await fetch(webhookUrl, { method: 'GET' });
      const data = await res.json();

      if (data.ok) {
        toast({
          title: '✅ Webhook доступен',
          description: `Endpoint отвечает. Profile ID: ${data.profileId || profileId}`,
        });
      } else {
        toast({
          title: 'Проблема с webhook',
          description: JSON.stringify(data),
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({
        title: '❌ Webhook недоступен',
        description: e.message || 'Не удалось подключиться к endpoint',
        variant: 'destructive',
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  // Check Wappi profile status
  const handleCheckStatus = async (integration: MessengerIntegration) => {
    const profileId = integration.settings?.profileId as string | undefined;
    const apiToken = integration.settings?.apiToken as string | undefined;
    
    if (!profileId || !apiToken) {
      toast({
        title: 'Ошибка',
        description: 'Profile ID или API Token не заданы',
        variant: 'destructive',
      });
      return;
    }

    setCheckingStatusId(integration.id);
    try {
      const res = await fetch(`https://wappi.pro/tapi/sync/get/status?profile_id=${profileId}`, {
        headers: { Authorization: apiToken },
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
      
      const status = data?.status || data?.state || 'unknown';
      const isOk = ['online', 'connected', 'authenticated'].includes(status);
      
      toast({
        title: isOk ? '✅ Профиль онлайн' : `⚠️ Статус: ${status}`,
        description: isOk 
          ? `Имя: ${data?.pushname || data?.name || '—'}, Телефон: ${data?.phone || '—'}`
          : `Ответ Wappi: ${JSON.stringify(data).substring(0, 150)}`,
        variant: isOk ? 'default' : 'destructive',
      });
    } catch (e: any) {
      toast({
        title: '❌ Ошибка проверки',
        description: e.message || 'Не удалось получить статус',
        variant: 'destructive',
      });
    } finally {
      setCheckingStatusId(null);
    }
  };

  // Test sending a message via telegram-send
  const handleTestSend = async () => {
    const integration = testSendIntegration;
    if (!integration) return;
    
    const profileId = integration.settings?.profileId as string | undefined;
    const recipient = testRecipient.trim();
    
    if (!profileId) {
      toast({ title: 'Ошибка', description: 'Profile ID не задан', variant: 'destructive' });
      return;
    }
    if (!recipient) {
      toast({ title: 'Ошибка', description: 'Введите Telegram ID или номер телефона', variant: 'destructive' });
      return;
    }

    setTestingSendId(integration.id);
    try {
      const payload: Record<string, unknown> = {
        text: '🔧 Тестовое сообщение от CRM',
        profileId,
        testMode: true,
      };
      // If numeric and looks like a phone, use phoneNumber; otherwise telegramUserId
      if (/^\+?\d{10,15}$/.test(recipient)) {
        payload.phoneNumber = recipient;
      } else {
        payload.telegramUserId = recipient;
      }

      const response = await selfHostedPost<any>('telegram-send', payload);

      if (response.success && response.data?.success) {
        toast({
          title: '✅ Сообщение отправлено',
          description: `Message ID: ${response.data?.messageId || '—'}`,
        });
        setTestSendIntegration(null);
        setTestRecipient('');
      } else {
        toast({
          title: '❌ Ошибка отправки',
          description: response.data?.error || response.error || 'Неизвестная ошибка',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({
        title: '❌ Ошибка',
        description: e.message || 'Не удалось отправить тестовое сообщение',
        variant: 'destructive',
      });
    } finally {
      setTestingSendId(null);
    }
  };

  const handleCopyWebhook = (integration: MessengerIntegration) => {
    const url = getWebhookUrl(integration);
    navigator.clipboard.writeText(url);
    toast({
      title: 'Скопировано',
      description: 'Webhook URL скопирован в буфер обмена',
    });
  };

  const handleAddAccount = (provider: string) => {
    if (provider === 'telegram_crm') {
      setIsCrmConnectOpen(true);
    } else {
      setSelectedProvider(provider);
      setIsCreateDialogOpen(true);
    }
  };

  const handleCrmConnectSuccess = () => {
    refetch();
  };

  const getProviderLabel = (provider: string) => {
    const option = telegramProviders.find(p => p.value === provider);
    return option?.label || provider;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="h-6 w-6 text-blue-500" />
              <div>
                <CardTitle>Telegram аккаунты</CardTitle>
                <CardDescription>Управление подключенными аккаунтами Telegram</CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить аккаунт
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {telegramProviders.map((provider) => (
                  <DropdownMenuItem
                    key={provider.value}
                    onClick={() => handleAddAccount(provider.value)}
                  >
                    <div>
                      <div className="font-medium">{provider.label}</div>
                      {provider.description && (
                        <div className="text-xs text-muted-foreground">{provider.description}</div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет подключенных аккаунтов</p>
              <p className="text-sm">Добавьте первый аккаунт для начала работы</p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                    integration.is_primary && "bg-primary/5 border-primary/20",
                    !integration.is_enabled && "opacity-60"
                  )}
                >
                  {/* Status indicator */}
                  <div className={cn(
                    "h-3 w-3 rounded-full flex-shrink-0",
                    integration.is_enabled ? "bg-green-500" : "bg-gray-300"
                  )} />

                  {/* Integration info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{integration.name}</span>
                      {integration.is_primary && (
                        <Badge variant="secondary" className="flex-shrink-0">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Основной
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>{getProviderLabel(integration.provider)}</span>
                      <span>•</span>
                      <button
                        onClick={() => handleCopyWebhook(integration)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">Webhook</span>
                      </button>
                    </div>
                    
                    {/* Profile status for telegram_crm */}
                    {integration.provider === 'telegram_crm' && integration.settings?.crmPhoneNumber && (
                      <div className="mt-2">
                        <TelegramCrmProfileStatus 
                          phone={integration.settings.crmPhoneNumber as string} 
                        />
                      </div>
                    )}
                  </div>

                  {/* Toggle */}
                  <Switch
                    checked={integration.is_enabled}
                    onCheckedChange={(enabled) => toggleEnabled(integration.id, enabled)}
                  />

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {integration.provider !== 'telegram_crm' && (
                        <DropdownMenuItem onClick={() => setEditingIntegration(integration)}>
                          <Settings2 className="h-4 w-4 mr-2" />
                          Настройки
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleCopyWebhook(integration)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Копировать Webhook
                      </DropdownMenuItem>
                      {/* Test Webhook button for Wappi integrations */}
                      {integration.provider === 'wappi' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => handleTestWebhook(integration)}
                            disabled={testingWebhookId === integration.id}
                          >
                            {testingWebhookId === integration.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Wifi className="h-4 w-4 mr-2" />
                            )}
                            Проверить Webhook
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleCheckStatus(integration)}
                            disabled={checkingStatusId === integration.id}
                          >
                            {checkingStatusId === integration.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Activity className="h-4 w-4 mr-2" />
                            )}
                            Проверить статус
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => { setTestSendIntegration(integration); setTestRecipient(''); }}
                            disabled={testingSendId === integration.id}
                          >
                            {testingSendId === integration.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <MessageSquare className="h-4 w-4 mr-2" />
                            )}
                            Тест отправки
                          </DropdownMenuItem>
                        </>
                      )}
                      {!integration.is_primary && (
                        <DropdownMenuItem onClick={() => setPrimary(integration.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Сделать основным
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteConfirmId(integration.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telegram CRM Connect Dialog (OTP flow) */}
      <TelegramCrmConnectDialog
        open={isCrmConnectOpen}
        onOpenChange={setIsCrmConnectOpen}
        onSuccess={handleCrmConnectSuccess}
      />

      {/* Wappi Create Dialog */}
      <IntegrationEditDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) setSelectedProvider(null);
        }}
        messengerType="telegram"
        providerOptions={telegramProviders.filter(p => p.value !== 'telegram_crm')}
        settingsFields={telegramFields}
      />

      {/* Edit Dialog (only for wappi) */}
      {editingIntegration && editingIntegration.provider !== 'telegram_crm' && (
        <IntegrationEditDialog
          open={!!editingIntegration}
          onOpenChange={(open) => !open && setEditingIntegration(null)}
          messengerType="telegram"
          integration={editingIntegration}
          providerOptions={telegramProviders.filter(p => p.value !== 'telegram_crm')}
          settingsFields={telegramFields}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => {
        if (!open && !isDeleting) setDeleteConfirmId(null);
      }}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить интеграцию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Интеграция будет удалена, и все связанные
              с ней настройки будут потеряны.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteConfirmId) return;
                try {
                  await deleteIntegration(deleteConfirmId);
                  setDeleteConfirmId(null);
                } catch (error) {
                  console.error('Delete failed:', error);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Удалить
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test Send Dialog */}
      <AlertDialog open={!!testSendIntegration} onOpenChange={(open) => {
        if (!open && !testingSendId) { setTestSendIntegration(null); setTestRecipient(''); }
      }}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Тест отправки сообщения</AlertDialogTitle>
            <AlertDialogDescription>
              Введите Telegram ID пользователя или номер телефона для отправки тестового сообщения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="test-recipient">Telegram ID или номер телефона</Label>
            <Input
              id="test-recipient"
              placeholder="123456789 или +79001234567"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!testingSendId}>Отмена</AlertDialogCancel>
            <Button
              onClick={handleTestSend}
              disabled={!!testingSendId || !testRecipient.trim()}
            >
              {testingSendId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Отправить
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
