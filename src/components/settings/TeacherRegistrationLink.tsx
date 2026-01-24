import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/typedClient';
import { Copy, Link, RefreshCw } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

export const TeacherRegistrationLink = () => {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const [token, setToken] = useState<string>('');
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [organizationId]);

  const loadSettings = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('teacher_registration_token, teacher_registration_enabled')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      setToken(data.teacher_registration_token || '');
      setEnabled(data.teacher_registration_enabled ?? true);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const regenerateToken = async () => {
    setIsLoading(true);
    try {
      const newToken = crypto.randomUUID();

      const { error } = await supabase
        .from('organizations')
        .update({ teacher_registration_token: newToken })
        .eq('id', organizationId);

      if (error) throw error;

      setToken(newToken);
      toast({
        title: 'Ссылка обновлена',
        description: 'Новая ссылка для регистрации создана',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEnabled = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ teacher_registration_enabled: checked })
        .eq('id', organizationId);

      if (error) throw error;

      setEnabled(checked);
      toast({
        title: checked ? 'Регистрация включена' : 'Регистрация отключена',
        description: checked
          ? 'Преподаватели могут регистрироваться по ссылке'
          : 'Регистрация по ссылке временно недоступна',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/register/teacher/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Скопировано',
      description: 'Ссылка скопирована в буфер обмена',
    });
  };

  const registrationUrl = `${window.location.origin}/register/teacher/${token}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Ссылка для регистрации преподавателей
            </CardTitle>
            <CardDescription>
              Уникальная ссылка для самостоятельной регистрации преподавателей
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="enabled">Включено</Label>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={toggleEnabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Ссылка для регистрации</Label>
          <div className="flex gap-2">
            <Input value={registrationUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              title="Копировать ссылку"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={regenerateToken}
              disabled={isLoading}
              title="Создать новую ссылку"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Отправьте эту ссылку преподавателям для регистрации в вашей организации.
            Они будут автоматически добавлены после заполнения формы.
          </p>
        </div>

        {!enabled && (
          <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
            ⚠️ Регистрация по ссылке отключена. Преподаватели не смогут зарегистрироваться,
            пока вы не включите эту функцию.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
