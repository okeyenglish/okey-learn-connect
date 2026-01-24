import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Link2
} from 'lucide-react';

interface WebhookChange {
  messengerType: string;
  provider: string;
  oldUrl: string;
  newUrl: string;
}

const NEW_BASE_URL = 'https://api.academyos.ru/functions/v1';

// Mapping of messenger type + provider to function name
const WEBHOOK_MAPPINGS: Record<string, string> = {
  'whatsapp:greenapi': 'whatsapp-webhook',
  'whatsapp:wappi': 'wappi-whatsapp-webhook',
  'whatsapp:wpp': 'wpp-webhook',
  'telegram:default': 'telegram-webhook',
  'telegram:wappi': 'telegram-wappi-webhook',
  'max:greenapi': 'max-webhook',
  'salebot:default': 'salebot-webhook',
};

export const WebhookUrlReset: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState<WebhookChange[]>([]);
  const [showChanges, setShowChanges] = useState(false);

  const getNewWebhookUrl = (messengerType: string, provider: string | null): string => {
    const key = `${messengerType}:${provider || 'default'}`;
    const functionName = WEBHOOK_MAPPINGS[key];
    
    if (functionName) {
      return `${NEW_BASE_URL}/${functionName}`;
    }
    
    // Fallback: construct from messenger type
    return `${NEW_BASE_URL}/${messengerType}-webhook`;
  };

  const resetWebhookUrls = async () => {
    setLoading(true);
    setChanges([]);
    setShowChanges(false);

    try {
      // Fetch all messenger settings
      const { data: settings, error: fetchError } = await supabase
        .from('messenger_settings')
        .select('id, messenger_type, provider, webhook_url');

      if (fetchError) throw fetchError;

      if (!settings || settings.length === 0) {
        toast({
          title: 'Нет настроек',
          description: 'Не найдено настроек мессенджеров для обновления',
        });
        setLoading(false);
        return;
      }

      const updatedChanges: WebhookChange[] = [];
      const oldDomainPattern = /supabase\.co\/functions\/v1/i;

      for (const setting of settings) {
        const oldUrl = setting.webhook_url || '';
        const newUrl = getNewWebhookUrl(setting.messenger_type, setting.provider);

        // Check if URL needs update (contains old domain or is empty/different)
        const needsUpdate = 
          oldUrl !== newUrl && 
          (oldUrl === '' || oldDomainPattern.test(oldUrl) || !oldUrl.includes('api.academyos.ru'));

        if (needsUpdate) {
          // Update the record
          const { error: updateError } = await supabase
            .from('messenger_settings')
            .update({ 
              webhook_url: newUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', setting.id);

          if (updateError) {
            console.error('Error updating webhook URL:', updateError);
            continue;
          }

          updatedChanges.push({
            messengerType: setting.messenger_type,
            provider: setting.provider || 'default',
            oldUrl: oldUrl || '(пусто)',
            newUrl,
          });
        }
      }

      setChanges(updatedChanges);
      setShowChanges(true);

      if (updatedChanges.length > 0) {
        toast({
          title: 'URLs обновлены',
          description: `Обновлено ${updatedChanges.length} webhook URL(s)`,
        });
      } else {
        toast({
          title: 'Без изменений',
          description: 'Все webhook URLs уже актуальны',
        });
      }

    } catch (error: any) {
      console.error('Error resetting webhook URLs:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить URLs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getMessengerLabel = (type: string): string => {
    const labels: Record<string, string> = {
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      max: 'MAX',
      salebot: 'Salebot',
      viber: 'Viber',
    };
    return labels[type] || type;
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-primary" />
          Webhook URLs
        </CardTitle>
        <CardDescription className="text-sm">
          Обновить все webhook URLs на новый домен api.academyos.ru
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={resetWebhookUrls}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Обновить все Webhook URLs
        </Button>

        {showChanges && (
          <div className="space-y-3">
            {changes.length > 0 ? (
              <>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Обновлено {changes.length} URL(s)</span>
                </div>
                <div className="space-y-2">
                  {changes.map((change, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-muted rounded-lg space-y-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getMessengerLabel(change.messengerType)}
                        </Badge>
                        <Badge variant="secondary">{change.provider}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-red-500 line-through truncate max-w-[200px]">
                          {change.oldUrl}
                        </span>
                        <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        <span className="text-green-600 truncate max-w-[200px]">
                          {change.newUrl}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>Все URLs уже актуальны, изменений не требуется</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
