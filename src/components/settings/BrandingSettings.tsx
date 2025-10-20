import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Palette } from 'lucide-react';

export const BrandingSettings = () => {
  const { organization, isLoading } = useOrganization();
  const [isSaving, setIsSaving] = useState(false);
  const [branding, setBranding] = useState({
    primary_color: organization?.branding?.primary_color || '#3b82f6',
    logo_url: organization?.branding?.logo_url || '',
  });

  const handleSave = async () => {
    if (!organization?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          branding: {
            ...organization.branding,
            ...branding,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('Настройки брендинга обновлены');
    } catch (error) {
      console.error('Error updating branding:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primary-color">Основной цвет</Label>
          <div className="flex gap-2">
            <div 
              className="w-12 h-12 rounded border cursor-pointer"
              style={{ backgroundColor: branding.primary_color }}
              onClick={() => document.getElementById('color-picker')?.click()}
            />
            <Input
              id="color-picker"
              type="color"
              value={branding.primary_color}
              onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
              className="hidden"
            />
            <Input
              value={branding.primary_color}
              onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
              placeholder="#3b82f6"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo-url">URL логотипа</Label>
          <Input
            id="logo-url"
            value={branding.logo_url}
            onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
          <p className="text-xs text-muted-foreground">
            Используется в email-уведомлениях и отчетах
          </p>
        </div>
      </div>

      {branding.logo_url && (
        <div className="space-y-2">
          <Label>Предпросмотр логотипа</Label>
          <div className="border rounded-lg p-4 bg-muted/50">
            <img 
              src={branding.logo_url} 
              alt="Логотип" 
              className="max-h-20 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                toast.error('Не удалось загрузить изображение');
              }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={() => setBranding({
            primary_color: organization?.branding?.primary_color || '#3b82f6',
            logo_url: organization?.branding?.logo_url || '',
          })}
          variant="outline"
        >
          Отменить
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
      </div>
    </div>
  );
};
