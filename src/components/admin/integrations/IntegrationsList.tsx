import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Settings2, 
  Trash2, 
  Star, 
  Copy, 
  ExternalLink,
  Loader2,
  MessageSquare,
  Send,
  MoreVertical,
  Check,
  AlertCircle
} from 'lucide-react';
import { useMessengerIntegrations, MessengerIntegration, MessengerType } from '@/hooks/useMessengerIntegrations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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
import { IntegrationEditDialog } from './IntegrationEditDialog';

interface IntegrationsListProps {
  messengerType: MessengerType;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  providerOptions: { value: string; label: string; description?: string }[];
  settingsFields: SettingsFieldConfig[];
}

export interface SettingsFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  showForProviders?: string[]; // Only show for specific providers
}

const getMessengerIcon = (type: MessengerType) => {
  switch (type) {
    case 'whatsapp':
      return <MessageSquare className="h-5 w-5 text-green-600" />;
    case 'telegram':
      return <Send className="h-5 w-5 text-blue-500" />;
    case 'max':
      return <MessageSquare className="h-5 w-5 text-purple-600" />;
    default:
      return <MessageSquare className="h-5 w-5" />;
  }
};

export const IntegrationsList: React.FC<IntegrationsListProps> = ({
  messengerType,
  title,
  description,
  icon,
  providerOptions,
  settingsFields,
}) => {
  const { toast } = useToast();
  const {
    integrations,
    isLoading,
    deleteIntegration,
    toggleEnabled,
    setPrimary,
    getWebhookUrl,
    isDeleting,
  } = useMessengerIntegrations(messengerType);

  const [editingIntegration, setEditingIntegration] = useState<MessengerIntegration | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCopyWebhook = (integration: MessengerIntegration) => {
    const url = getWebhookUrl(integration);
    navigator.clipboard.writeText(url);
    toast({
      title: 'Скопировано',
      description: 'Webhook URL скопирован в буфер обмена',
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteIntegration(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleSetPrimary = async (id: string) => {
    await setPrimary(id);
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await toggleEnabled(id, enabled);
  };

  const getProviderLabel = (provider: string) => {
    const option = providerOptions.find(p => p.value === provider);
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
              {icon || getMessengerIcon(messengerType)}
              <div>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </div>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить аккаунт
            </Button>
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
                  </div>

                  {/* Toggle */}
                  <Switch
                    checked={integration.is_enabled}
                    onCheckedChange={(enabled) => handleToggleEnabled(integration.id, enabled)}
                  />

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingIntegration(integration)}>
                        <Settings2 className="h-4 w-4 mr-2" />
                        Настройки
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyWebhook(integration)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Копировать Webhook
                      </DropdownMenuItem>
                      {!integration.is_primary && (
                        <DropdownMenuItem onClick={() => handleSetPrimary(integration.id)}>
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

      {/* Create Dialog */}
      <IntegrationEditDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        messengerType={messengerType}
        providerOptions={providerOptions}
        settingsFields={settingsFields}
      />

      {/* Edit Dialog */}
      {editingIntegration && (
        <IntegrationEditDialog
          open={!!editingIntegration}
          onOpenChange={(open) => !open && setEditingIntegration(null)}
          messengerType={messengerType}
          integration={editingIntegration}
          providerOptions={providerOptions}
          settingsFields={settingsFields}
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
    </>
  );
};
