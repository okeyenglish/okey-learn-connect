import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/typedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AutoRetrySettings } from './AutoRetrySettings';

export const OrganizationSettings = () => {
  const { organization, isLoading } = useOrganization();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    slug: organization?.slug || '',
    domain: organization?.domain || '',
  });

  const handleSave = async () => {
    if (!organization?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          slug: formData.slug,
          domain: formData.domain || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('Настройки организации обновлены');
    } catch (error) {
      console.error('Error updating organization:', error);
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

  if (!organization) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Организация не найдена
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Basic Organization Info */}
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Название организации</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ООО Языковая школа"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Слаг (URL)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="my-school"
            />
            <p className="text-xs text-muted-foreground">
              Используется для формирования URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Домен (опционально)</Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="myschool.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Статус</Label>
            <div className="flex items-center gap-2 h-10 px-3 py-2 rounded-md border bg-muted/50">
              <div className={`w-2 h-2 rounded-full ${
                organization.status === 'active' ? 'bg-green-500' :
                organization.status === 'trial' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} />
              <span className="text-sm capitalize">{organization.status}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setFormData({
              name: organization.name,
              slug: organization.slug,
              domain: organization.domain || '',
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

      {/* Auto-Retry Settings */}
      <AutoRetrySettings />
    </div>
  );
};
