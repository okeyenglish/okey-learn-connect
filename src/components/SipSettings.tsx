import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Save, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const SipSettings: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    extension_number: '',
    sip_domain: 'pbx11034.onpbx.ru',
    sip_password: '',
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('extension_number, sip_domain, sip_password')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFormData({
          extension_number: profile.extension_number || '',
          sip_domain: profile.sip_domain || 'pbx11034.onpbx.ru',
          sip_password: profile.sip_password || '',
        });
      }
    } catch (error) {
      console.error('Error loading SIP settings:', error);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (!formData.extension_number || !formData.sip_password) {
      toast({
        title: "Заполните все поля",
        description: "Добавочный номер и пароль обязательны",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          extension_number: formData.extension_number,
          sip_domain: formData.sip_domain,
          sip_password: formData.sip_password,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Настройки сохранены",
        description: "SIP настройки успешно обновлены",
      });
    } catch (error) {
      console.error('Error saving SIP settings:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="extension">Добавочный номер</Label>
        <Input
          id="extension"
          placeholder="101"
          value={formData.extension_number}
          onChange={(e) => handleChange('extension_number', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="domain">SIP домен</Label>
        <Input
          id="domain"
          placeholder="pbx11034.onpbx.ru"
          value={formData.sip_domain}
          onChange={(e) => handleChange('sip_domain', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль SIP</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={formData.sip_password}
          onChange={(e) => handleChange('sip_password', e.target.value)}
        />
      </div>

      <Button 
        onClick={handleSave} 
        disabled={isLoading}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? 'Сохранение...' : 'Сохранить настройки'}
      </Button>

      <div className="text-sm text-muted-foreground">
        <p>Получите данные для подключения у администратора PBX:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Добавочный номер (например: 101)</li>
          <li>Пароль для SIP подключения</li>
          <li>SIP домен (обычно: pbx11034.onpbx.ru)</li>
        </ul>
      </div>
    </div>
  );
};