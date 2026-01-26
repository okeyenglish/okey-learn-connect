import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabaseTyped as supabase } from "@/integrations/supabase/typedClient";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Copy, CheckCircle, XCircle, RefreshCw, ExternalLink, Eye, EyeOff, KeyRound } from "lucide-react";

interface OnlinePBXConfig {
  pbxDomain: string;
  apiKeyId: string;
  apiKeySecret: string;
  webhookKey?: string;
}

const defaultConfig: OnlinePBXConfig = {
  pbxDomain: "",
  apiKeyId: "",
  apiKeySecret: "",
  webhookKey: ""
};

export function OnlinePBXSettings() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<OnlinePBXConfig>(defaultConfig);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [copied, setCopied] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [showApiKeyId, setShowApiKeyId] = useState(false);
  const [showApiKeySecret, setShowApiKeySecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (profile?.organization_id) {
      loadSettings();
    }
  }, [profile?.organization_id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('onlinepbx-settings', {
        method: 'GET'
      });

      if (error) throw error;

      if (data?.success) {
        setConfig({
          pbxDomain: data.settings?.pbxDomain || '',
          apiKeyId: data.settings?.apiKeyId || '',
          apiKeySecret: data.settings?.apiKeySecret || '',
          webhookKey: data.settings?.webhookKey || ''
        });
        setIsEnabled(data.isEnabled || false);
        setConfigured(data.configured || false);
        setWebhookUrl(data.webhookUrl || '');
        
        if (data.configured && data.isEnabled) {
          setConnectionStatus('connected');
        }
      }
    } catch (error) {
      console.error('Error loading OnlinePBX settings:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (regenerateKey: boolean = false) => {
    if (!config.pbxDomain) {
      toast.error('Введите домен PBX');
      return;
    }

    // Only require new values if not already configured
    if (!configured) {
      if (!config.apiKeyId || !config.apiKeySecret) {
        toast.error('Заполните все обязательные поля');
        return;
      }
    }

    try {
      setSaving(true);

      const { data, error } = await supabase.functions.invoke('onlinepbx-settings', {
        method: 'POST',
        body: {
          pbxDomain: config.pbxDomain,
          apiKeyId: config.apiKeyId,
          apiKeySecret: config.apiKeySecret,
          isEnabled,
          regenerateWebhookKey: regenerateKey
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(regenerateKey ? 'Webhook ключ обновлён' : 'Настройки сохранены');
        setConfigured(true);
        setConnectionStatus(isEnabled ? 'connected' : 'unknown');
        if (data.webhookUrl) {
          setWebhookUrl(data.webhookUrl);
        }
        // Reload to get masked values
        await loadSettings();
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving OnlinePBX settings:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    // For testing, we need actual values, not masked ones
    if (config.apiKeyId?.startsWith('••••') || config.apiKeySecret?.startsWith('••••')) {
      toast.error('Введите новые API ключи для проверки подключения');
      return;
    }

    if (!config.pbxDomain || !config.apiKeyId || !config.apiKeySecret) {
      toast.error('Заполните все поля для проверки подключения');
      return;
    }

    try {
      setTesting(true);
      
      const { data, error } = await supabase.functions.invoke('test-onlinepbx', {
        body: {
          pbx_domain: config.pbxDomain,
          api_key_id: config.apiKeyId,
          api_key_secret: config.apiKeySecret
        }
      });

      if (error) throw error;

      if (data?.success) {
        setConnectionStatus('connected');
        toast.success('Подключение успешно!');
      } else {
        setConnectionStatus('error');
        toast.error(data?.error || 'Ошибка подключения к OnlinePBX');
      }
    } catch (error) {
      console.error('Error testing OnlinePBX connection:', error);
      setConnectionStatus('error');
      toast.error('Ошибка проверки подключения');
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = async () => {
    const urlToCopy = webhookUrl || `https://api.academyos.ru/functions/v1/onlinepbx-webhook`;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      toast.success('URL скопирован');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Не удалось скопировать');
    }
  };

  const handleClearAndEdit = (field: 'apiKeyId' | 'apiKeySecret') => {
    setConfig(prev => ({ ...prev, [field]: '' }));
    if (field === 'apiKeyId') setShowApiKeyId(true);
    if (field === 'apiKeySecret') setShowApiKeySecret(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Phone className="h-6 w-6" />
          Настройки телефонии (OnlinePBX)
        </h2>
        <p className="text-muted-foreground mt-1">
          Настройте интеграцию с виртуальной АТС OnlinePBX для совершения и приёма звонков
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Статус подключения</CardTitle>
            <Badge 
              variant={
                connectionStatus === 'connected' ? 'default' :
                connectionStatus === 'error' ? 'destructive' : 'secondary'
              }
              className="flex items-center gap-1"
            >
              {connectionStatus === 'connected' && <CheckCircle className="h-3 w-3" />}
              {connectionStatus === 'error' && <XCircle className="h-3 w-3" />}
              {connectionStatus === 'connected' ? 'Подключено' :
               connectionStatus === 'error' ? 'Ошибка' : 'Не проверено'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Webhook URL - IMPORTANT: Show unique URL per organization */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Уникальный URL для вебхука
          </CardTitle>
          <CardDescription>
            Этот URL уникален для вашей организации. Скопируйте его и вставьте в настройках OnlinePBX.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl || 'Сохраните настройки для генерации URL'}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copyWebhookUrl} disabled={!webhookUrl}>
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {webhookUrl && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Сгенерировать новый ключ
              </Button>
              <span className="text-xs text-muted-foreground">
                (Старый URL перестанет работать)
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            В личном кабинете OnlinePBX: «Интеграции» → «Webhooks» → добавьте этот URL
          </p>
        </CardContent>
      </Card>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Данные для подключения</CardTitle>
          <CardDescription>
            Введите данные из личного кабинета OnlinePBX
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pbx_domain">Аккаунт в Online PBX (*.onpbx.ru)</Label>
            <Input
              id="pbx_domain"
              placeholder="pbx11034.onpbx.ru"
              value={config.pbxDomain}
              onChange={(e) => setConfig({ ...config, pbxDomain: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Домен вашей АТС, например: pbx11034.onpbx.ru
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key_id">API Key ID</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api_key_id"
                  type={showApiKeyId ? "text" : "password"}
                  placeholder="Идентификатор API-ключа"
                  value={config.apiKeyId}
                  onChange={(e) => setConfig({ ...config, apiKeyId: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKeyId(!showApiKeyId)}
                >
                  {showApiKeyId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {configured && config.apiKeyId?.startsWith('••••') && (
                <Button variant="outline" size="sm" onClick={() => handleClearAndEdit('apiKeyId')}>
                  Изменить
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key_secret">API Key Secret</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api_key_secret"
                  type={showApiKeySecret ? "text" : "password"}
                  placeholder="Секретный ключ API"
                  value={config.apiKeySecret}
                  onChange={(e) => setConfig({ ...config, apiKeySecret: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKeySecret(!showApiKeySecret)}
                >
                  {showApiKeySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {configured && config.apiKeySecret?.startsWith('••••') && (
                <Button variant="outline" size="sm" onClick={() => handleClearAndEdit('apiKeySecret')}>
                  Изменить
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_enabled">Включить интеграцию</Label>
              <p className="text-xs text-muted-foreground">
                Активировать звонки через OnlinePBX
              </p>
            </div>
            <Switch
              id="is_enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={() => handleSave(false)} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestConnection} 
              disabled={testing || (config.apiKeyId?.startsWith('••••') || config.apiKeySecret?.startsWith('••••'))}
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Проверить подключение
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Инструкция по настройке</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Войдите в личный кабинет OnlinePBX по адресу <a href="https://my.onlinepbx.ru" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">my.onlinepbx.ru <ExternalLink className="h-3 w-3" /></a></li>
            <li>Перейдите в раздел «Настройки» → «Интеграции» → «API»</li>
            <li>Создайте новый API-ключ или используйте существующий</li>
            <li>Скопируйте Key ID и Secret Key в соответствующие поля выше</li>
            <li>Нажмите «Сохранить» — будет сгенерирован уникальный URL для вебхука</li>
            <li>В разделе «Webhooks» добавьте уникальный URL вебхука (см. выше)</li>
            <li>Нажмите «Проверить подключение» для проверки</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
