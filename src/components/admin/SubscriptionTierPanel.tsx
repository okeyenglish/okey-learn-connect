import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Rocket } from 'lucide-react';
import { useOrganizationAISettings, useUpdateSubscriptionTier, type SubscriptionTier } from '@/hooks/useSubscriptionTier';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface SubscriptionTierPanelProps {
  organizationId: string;
}

export function SubscriptionTierPanel({ organizationId }: SubscriptionTierPanelProps) {
  const { data: settings, isLoading } = useOrganizationAISettings(organizationId);
  const updateTier = useUpdateSubscriptionTier();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | undefined>();

  const handleUpdate = () => {
    if (!selectedTier) return;
    updateTier.mutate({ organizationId, tier: selectedTier });
    setSelectedTier(undefined);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Настройки не найдены</p>
        </CardContent>
      </Card>
    );
  }

  const currentTier = settings.subscription_tier;
  const tierInfo = {
    free: {
      icon: Shield,
      label: 'Бесплатный',
      color: 'bg-blue-500',
      limit: 50,
      models: 'Free модели (deepseek:free, qwen:free)',
    },
    paid: {
      icon: Rocket,
      label: 'Платный (BYOK)',
      color: 'bg-purple-500',
      limit: 1000,
      models: 'BYOK модели (deepseek, qwen-coder:7b)',
    },
  };

  const info = tierInfo[currentTier];
  const Icon = info.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Тарифный план организации</CardTitle>
            <CardDescription>Управление AI лимитами и моделями</CardDescription>
          </div>
          <Badge variant="outline" className={`${info.color} text-white`}>
            <Icon className="mr-1 h-3 w-3" />
            {info.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Месячный лимит</div>
            <div className="text-2xl font-bold">{info.limit} запросов</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Осталось</div>
            <div className="text-2xl font-bold">
              {settings.limit_remaining ?? 0} / {settings.limit_monthly ?? info.limit}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Доступные модели</div>
          <div className="text-sm">{info.models}</div>
        </div>

        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Тип ключа</div>
          <Badge variant="secondary">{settings.key_type?.toUpperCase() ?? 'Не выдан'}</Badge>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="text-sm font-medium">Изменить тарифный план</div>
          <div className="flex gap-2">
            <Select
              value={selectedTier}
              onValueChange={(value) => setSelectedTier(value as SubscriptionTier)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Выберите тариф" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Бесплатный (50 запросов)</span>
                  </div>
                </SelectItem>
                <SelectItem value="paid">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    <span>Платный BYOK (1000 запросов)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleUpdate}
              disabled={!selectedTier || updateTier.isPending}
            >
              {updateTier.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Обновить
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          💡 При изменении тарифа необходимо создать новый API ключ через панель провижининга
        </div>
      </CardContent>
    </Card>
  );
}
