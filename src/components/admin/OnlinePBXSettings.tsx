import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Copy, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";

interface OnlinePBXConfig {
  pbx_domain: string;
  api_key_id: string;
  api_key_secret: string;
  is_enabled: boolean;
}

const defaultConfig: OnlinePBXConfig = {
  pbx_domain: "",
  api_key_id: "",
  api_key_secret: "",
  is_enabled: false
};

export function OnlinePBXSettings() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<OnlinePBXConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [copied, setCopied] = useState(false);

  const organizationId = profile?.organization_id;
  
  // Generate webhook URL for this organization
  const webhookUrl = `https://kbojujfwtvmsgudumown.supabase.co/functions/v1/onlinepbx-webhook`;

  useEffect(() => {
    if (organizationId) {
      loadSettings();
    }
  }, [organizationId]);

  const loadSettings = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('organization_id', organizationId)
        .eq('setting_key', 'onlinepbx_config')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const savedConfig = data.setting_value as Record<string, unknown>;
        setConfig({
          pbx_domain: String(savedConfig.pbx_domain || ''),
          api_key_id: String(savedConfig.api_key_id || ''),
          api_key_secret: String(savedConfig.api_key_secret || ''),
          is_enabled: Boolean(savedConfig.is_enabled)
        });
        
        // If we have credentials, check connection status
        if (savedConfig.api_key_id && savedConfig.api_key_secret) {
          setConnectionStatus(savedConfig.is_enabled ? 'connected' : 'unknown');
        }
      }
    } catch (error) {
      console.error('Error loading OnlinePBX settings:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) {
      toast.error('Не удалось определить организацию');
      return;
    }

    if (!config.pbx_domain || !config.api_key_id || !config.api_key_secret) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      setSaving(true);

      // Check if settings exist
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('setting_key', 'onlinepbx_config')
        .maybeSingle();

      const settingValue = {
        pbx_domain: config.pbx_domain,
        api_key_id: config.api_key_id,
        api_key_secret: config.api_key_secret,
        is_enabled: config.is_enabled
      };

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            setting_value: settingValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            organization_id: organizationId,
            setting_key: 'onlinepbx_config',
            setting_value: settingValue
          });
        
        if (error) throw error;
      }

      toast.success('Настройки сохранены');
      setConnectionStatus(config.is_enabled ? 'connected' : 'unknown');
    } catch (error) {
      console.error('Error saving OnlinePBX settings:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.pbx_domain || !config.api_key_id || !config.api_key_secret) {
      toast.error('Заполните все поля для проверки подключения');
      return;
    }

    try {
      setTesting(true);
      
      const { data, error } = await supabase.functions.invoke('test-onlinepbx', {
        body: {
          pbx_domain: config.pbx_domain,
          api_key_id: config.api_key_id,
          api_key_secret: config.api_key_secret
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
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success('URL скопирован');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Не удалось скопировать');
    }
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
              value={config.pbx_domain}
              onChange={(e) => setConfig({ ...config, pbx_domain: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Домен вашей АТС, например: pbx11034.onpbx.ru
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key_id">API Key ID</Label>
            <Input
              id="api_key_id"
              placeholder="Идентификатор API-ключа"
              value={config.api_key_id}
              onChange={(e) => setConfig({ ...config, api_key_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key_secret">API Key Secret</Label>
            <Input
              id="api_key_secret"
              type="password"
              placeholder="Секретный ключ API"
              value={config.api_key_secret}
              onChange={(e) => setConfig({ ...config, api_key_secret: e.target.value })}
            />
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
              checked={config.is_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
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

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>URL для вебхука</CardTitle>
          <CardDescription>
            Скопируйте этот URL и вставьте в настройках OnlinePBX для получения уведомлений о звонках
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            В личном кабинете OnlinePBX перейдите в раздел «Интеграции» → «Webhooks» и добавьте этот URL
          </p>
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
            <li>В разделе «Webhooks» добавьте URL вебхука (см. выше)</li>
            <li>Нажмите «Сохранить» и «Проверить подключение»</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
