import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  MessageCircle, 
  Send, 
  Bot, 
  Sparkles, 
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
  ChevronRight,
  Zap
} from 'lucide-react';
import { WhatsAppSettings } from './WhatsAppSettings';
import { MaxGreenApiSettings } from './MaxGreenApiSettings';
import { TelegramWappiSettings } from './TelegramWappiSettings';
import { SalebotSettings } from './SalebotSettings';
import { OpenAISettings } from './OpenAISettings';
import { OnlinePBXSettings } from './OnlinePBXSettings';
import { HoliHopeSettings } from './HoliHopeSettings';
import { WebhookUrlReset } from './WebhookUrlReset';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';

interface IntegrationStatus {
  id: string;
  name: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  isEnabled: boolean;
  isConnected: boolean | null;
  lastActivity?: string;
  description: string;
  tabValue: string;
}

export const MessengersSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { organizationId } = useOrganization();

  const defaultIntegrations: Omit<IntegrationStatus, 'isEnabled' | 'isConnected' | 'lastActivity'>[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageSquare,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      description: 'Wappi / Green API',
      tabValue: 'whatsapp'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: Send,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      description: 'Wappi Telegram',
      tabValue: 'telegram'
    },
    {
      id: 'max',
      name: 'MAX (VK)',
      icon: MessageCircle,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      description: 'Green API для VK Teams',
      tabValue: 'max'
    },
    {
      id: 'salebot',
      name: 'Salebot',
      icon: Bot,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      description: 'Автоматизация сообщений',
      tabValue: 'salebot'
    },
    {
      id: 'onlinepbx',
      name: 'OnlinePBX',
      icon: Phone,
      iconColor: 'text-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-950/30',
      description: 'Телефония',
      tabValue: 'onlinepbx'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      icon: Sparkles,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      description: 'GPT / Whisper API',
      tabValue: 'openai'
    },
    {
      id: 'holihope',
      name: 'HoliHope',
      icon: Settings,
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      description: 'CRM для школ',
      tabValue: 'holihope'
    }
  ];

  const loadIntegrationStatuses = async () => {
    if (!organizationId) return;

    try {
      // Fetch all messenger settings for the organization
      const { data: settings, error } = await supabase
        .from('messenger_settings')
        .select('messenger_type, is_enabled, settings, updated_at')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[MessengersSettings] Error loading settings:', error);
        return;
      }

      // Map settings to integration statuses - use string key for flexibility
      const settingsMap = new Map<string, typeof settings[number]>(
        settings?.map(s => [s.messenger_type, s]) || []
      );

      const updatedIntegrations = defaultIntegrations.map(integration => {
        // Map integration ID to messenger_type(s)
        const messengerTypes: string[] = [];
        switch (integration.id) {
          case 'whatsapp':
            messengerTypes.push('wappi_whatsapp', 'green_api', 'whatsapp');
            break;
          case 'telegram':
            messengerTypes.push('wappi_telegram', 'telegram');
            break;
          case 'max':
            messengerTypes.push('max_green_api', 'max');
            break;
          case 'salebot':
            messengerTypes.push('salebot');
            break;
          case 'onlinepbx':
            messengerTypes.push('onlinepbx');
            break;
          case 'openai':
            messengerTypes.push('openai');
            break;
          case 'holihope':
            messengerTypes.push('holihope');
            break;
        }

        // Find any matching setting
        let setting = null;
        for (const type of messengerTypes) {
          if (settingsMap.has(type)) {
            setting = settingsMap.get(type);
            break;
          }
        }

        // Check if has valid credentials
        const hasCredentials = setting?.settings && 
          Object.values(setting.settings as Record<string, unknown>).some(v => v && String(v).length > 0);

        return {
          ...integration,
          isEnabled: setting?.is_enabled ?? false,
          isConnected: hasCredentials ? (setting?.is_enabled ?? false) : null,
          lastActivity: setting?.updated_at
        };
      });

      setIntegrations(updatedIntegrations);
    } catch (err) {
      console.error('[MessengersSettings] Error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadIntegrationStatuses();
  }, [organizationId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadIntegrationStatuses();
  };

  const getStatusBadge = (integration: IntegrationStatus) => {
    if (integration.isConnected === null) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <AlertCircle className="h-3 w-3 mr-1" />
          Не настроено
        </Badge>
      );
    }
    if (integration.isEnabled && integration.isConnected) {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Подключено
        </Badge>
      );
    }
    if (!integration.isEnabled) {
      return (
        <Badge variant="secondary">
          <WifiOff className="h-3 w-3 mr-1" />
          Отключено
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Ошибка
      </Badge>
    );
  };

  const enabledCount = integrations.filter(i => i.isEnabled && i.isConnected).length;
  const configuredCount = integrations.filter(i => i.isConnected !== null).length;

  // If a tab is selected, show the settings component
  if (activeTab) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab(null)}
            className="gap-2"
          >
            ← Назад к списку
          </Button>
        </div>

        {activeTab === 'whatsapp' && <WhatsAppSettings />}
        {activeTab === 'telegram' && <TelegramWappiSettings />}
        {activeTab === 'max' && <MaxGreenApiSettings />}
        {activeTab === 'salebot' && <SalebotSettings />}
        {activeTab === 'onlinepbx' && <OnlinePBXSettings />}
        {activeTab === 'openai' && <OpenAISettings />}
        {activeTab === 'holihope' && <HoliHopeSettings />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Интеграции</h2>
            <p className="text-muted-foreground">
              Управление мессенджерами, телефонией и AI
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего интеграций</p>
                <p className="text-3xl font-bold">{integrations.length}</p>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Настроено</p>
                <p className="text-3xl font-bold">{configuredCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/30">
                <AlertCircle className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных</p>
                <p className="text-3xl font-bold text-green-600">{enabledCount}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 dark:bg-green-950/30">
                <Wifi className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          integrations.map((integration) => {
            const IconComponent = integration.icon;
            return (
              <Card 
                key={integration.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  integration.isEnabled && integration.isConnected && "border-green-200 dark:border-green-800"
                )}
                onClick={() => setActiveTab(integration.tabValue)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2.5 rounded-lg", integration.bgColor)}>
                        <IconComponent className={cn("h-5 w-5", integration.iconColor)} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{integration.name}</h3>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {getStatusBadge(integration)}
                    {integration.lastActivity && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(integration.lastActivity).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Webhook URL Reset utility */}
      <div className="pt-4">
        <WebhookUrlReset />
      </div>
    </div>
  );
};