import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Save, Copy, ExternalLink } from 'lucide-react';
import { useMessengerIntegrations, MessengerIntegration, MessengerType, CreateIntegrationPayload, UpdateIntegrationPayload } from '@/hooks/useMessengerIntegrations';
import { useToast } from '@/hooks/use-toast';
import { SettingsFieldConfig } from './IntegrationsList';
import { cn } from '@/lib/utils';

interface IntegrationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messengerType: MessengerType;
  integration?: MessengerIntegration;
  providerOptions: { value: string; label: string; description?: string }[];
  settingsFields: SettingsFieldConfig[];
}

export const IntegrationEditDialog: React.FC<IntegrationEditDialogProps> = ({
  open,
  onOpenChange,
  messengerType,
  integration,
  providerOptions,
  settingsFields,
}) => {
  const { toast } = useToast();
  const { createIntegration, updateIntegration, isCreating, isUpdating, getWebhookUrl } = useMessengerIntegrations();
  
  const isEditing = !!integration;
  
  const [formData, setFormData] = useState({
    name: '',
    provider: providerOptions[0]?.value || '',
    is_enabled: true,
    is_primary: false,
    settings: {} as Record<string, string>,
  });

  // Reset form when dialog opens/closes or integration changes
  useEffect(() => {
    if (open) {
      if (integration) {
        setFormData({
          name: integration.name,
          provider: integration.provider,
          is_enabled: integration.is_enabled,
          is_primary: integration.is_primary,
          settings: (integration.settings as Record<string, string>) || {},
        });
      } else {
        setFormData({
          name: '',
          provider: providerOptions[0]?.value || '',
          is_enabled: true,
          is_primary: false,
          settings: {},
        });
      }
    }
  }, [open, integration, providerOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название интеграции',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditing && integration) {
        const payload: UpdateIntegrationPayload = {
          id: integration.id,
          name: formData.name,
          provider: formData.provider,
          is_enabled: formData.is_enabled,
          is_primary: formData.is_primary,
          settings: formData.settings,
        };
        await updateIntegration(payload);
      } else {
        const payload: CreateIntegrationPayload = {
          messenger_type: messengerType,
          name: formData.name,
          provider: formData.provider,
          is_enabled: formData.is_enabled,
          is_primary: formData.is_primary,
          settings: formData.settings,
        };
        await createIntegration(payload);
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  };

  const handleCopyWebhook = () => {
    if (!integration) return;
    const url = getWebhookUrl(integration);
    navigator.clipboard.writeText(url);
    toast({
      title: 'Скопировано',
      description: 'Webhook URL скопирован в буфер обмена',
    });
  };

  // Filter fields based on selected provider
  const visibleFields = settingsFields.filter(field => {
    if (!field.showForProviders) return true;
    return field.showForProviders.includes(formData.provider);
  });

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Редактировать интеграцию' : 'Новая интеграция'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Измените настройки интеграции'
                : 'Добавьте новый аккаунт для отправки и приема сообщений'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Основной аккаунт"
              />
              <p className="text-xs text-muted-foreground">
                Название для идентификации аккаунта
              </p>
            </div>

            {/* Provider selection */}
            {providerOptions.length > 1 && (
              <div className="space-y-3">
                <Label>Провайдер</Label>
                <RadioGroup
                  value={formData.provider}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
                  className="grid gap-3"
                >
                  {providerOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-3">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                        <span className="font-medium">{option.label}</span>
                        {option.description && (
                          <span className="text-sm text-muted-foreground block">
                            {option.description}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Dynamic settings fields */}
            {visibleFields.length > 0 && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Настройки подключения</Label>
                {visibleFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                      id={field.key}
                      type={field.type}
                      value={formData.settings[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Webhook URL (only for editing) */}
            {isEditing && integration && (
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={getWebhookUrl(integration)}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyWebhook}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Укажите этот URL в настройках провайдера для получения входящих сообщений
                </p>
              </div>
            )}

            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Активировать</Label>
                <p className="text-xs text-muted-foreground">
                  Включить отправку и прием сообщений
                </p>
              </div>
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Сохранить' : 'Создать'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
