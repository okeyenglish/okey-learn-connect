import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';
import { toast } from 'sonner';
import { Bell, Save, X, Plus, AlertTriangle, Clock, Shield } from 'lucide-react';

const AVAILABLE_STAGES = [
  { key: 'greeting', label: 'Приветствие' },
  { key: 'qualification', label: 'Квалификация' },
  { key: 'need_discovery', label: 'Выявление потребности' },
  { key: 'value_explanation', label: 'Презентация ценности' },
  { key: 'objection', label: 'Возражение' },
  { key: 'offer', label: 'Предложение' },
  { key: 'closing', label: 'Закрытие' },
  { key: 'follow_up', label: 'Follow-up' },
];

interface AlertConfig {
  enabled: boolean;
  stages: string[];
  thresholdHours: number;
  cooldownHours: number;
}

const DEFAULT_CONFIG: AlertConfig = {
  enabled: true,
  stages: ['objection', 'follow_up'],
  thresholdHours: 24,
  cooldownHours: 12,
};

export function StaleAlertSettings() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['org-alert-settings'],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      const { data, error } = await supabase
        .from('organizations')
        .select('id, settings')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (orgData?.settings) {
      const settings = orgData.settings as Record<string, unknown>;
      const saved = settings.staleConversationAlerts as Partial<AlertConfig> | undefined;
      if (saved) {
        setConfig({
          enabled: saved.enabled ?? DEFAULT_CONFIG.enabled,
          stages: saved.stages ?? DEFAULT_CONFIG.stages,
          thresholdHours: saved.thresholdHours ?? DEFAULT_CONFIG.thresholdHours,
          cooldownHours: saved.cooldownHours ?? DEFAULT_CONFIG.cooldownHours,
        });
      }
    }
  }, [orgData]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig: AlertConfig) => {
      const orgId = await getCurrentOrganizationId();
      const currentSettings = (orgData?.settings as Record<string, unknown>) || {};
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            staleConversationAlerts: newConfig,
          },
        })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Настройки алертов сохранены');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['org-alert-settings'] });
    },
    onError: (err) => {
      toast.error(`Ошибка сохранения: ${(err as Error).message}`);
    },
  });

  const updateConfig = (patch: Partial<AlertConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const toggleStage = (stageKey: string) => {
    const newStages = config.stages.includes(stageKey)
      ? config.stages.filter((s) => s !== stageKey)
      : [...config.stages, stageKey];
    updateConfig({ stages: newStages });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Настройки алертов</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="alerts-enabled" className="text-sm text-muted-foreground">
              {config.enabled ? 'Включено' : 'Выключено'}
            </Label>
            <Switch
              id="alerts-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => updateConfig({ enabled: checked })}
            />
          </div>
        </div>
        <CardDescription>
          Push-уведомления когда клиент застревает на стадии дольше указанного времени
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Monitored Stages */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Мониторируемые стадии
          </Label>
          <p className="text-xs text-muted-foreground">
            Выберите стадии, на которых клиент может «застрять»
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_STAGES.map((stage) => {
              const isSelected = config.stages.includes(stage.key);
              return (
                <Badge
                  key={stage.key}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleStage(stage.key)}
                >
                  {isSelected && '✓ '}
                  {stage.label}
                </Badge>
              );
            })}
          </div>
          {config.stages.length === 0 && (
            <p className="text-xs text-destructive">Выберите хотя бы одну стадию</p>
          )}
        </div>

        {/* Threshold & Cooldown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="threshold" className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Порог (часы)
            </Label>
            <p className="text-xs text-muted-foreground">
              Через сколько часов на стадии отправить алерт
            </p>
            <Input
              id="threshold"
              type="number"
              min={1}
              max={168}
              value={config.thresholdHours}
              onChange={(e) => updateConfig({ thresholdHours: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cooldown" className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Кулдаун (часы)
            </Label>
            <p className="text-xs text-muted-foreground">
              Пауза между повторными уведомлениями
            </p>
            <Input
              id="cooldown"
              type="number"
              min={1}
              max={168}
              value={config.cooldownHours}
              onChange={(e) => updateConfig({ cooldownHours: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-32"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Проверка запускается каждый час автоматически
          </p>
          <Button
            onClick={() => saveMutation.mutate(config)}
            disabled={!hasChanges || saveMutation.isPending || config.stages.length === 0}
            size="sm"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
