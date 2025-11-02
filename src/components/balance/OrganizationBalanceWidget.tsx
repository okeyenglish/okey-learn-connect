import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useOrganizationBalance } from '@/hooks/useOrganizationBalance';
import { useAIProviderKeys } from '@/hooks/useAIProviderKeys';
import { OrganizationBalanceModal } from './OrganizationBalanceModal';
import { Wallet, Zap } from 'lucide-react';

interface OrganizationBalanceWidgetProps {
  organizationId: string;
}

export function OrganizationBalanceWidget({ organizationId }: OrganizationBalanceWidgetProps) {
  const [showModal, setShowModal] = useState(false);
  const { data: balance } = useOrganizationBalance(organizationId);
  const { data: aiKeys } = useAIProviderKeys();

  const orgKey = aiKeys?.find(
    (key) => key.organization_id === organizationId && key.provider === 'openrouter'
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            AI Баланс
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Бесплатные запросы
            </div>
            <div className="text-lg font-semibold">
              {orgKey?.limit_remaining || 0} / {orgKey?.limit_monthly || 200}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Обновляется ежедневно
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Платный баланс
            </div>
            <div className="text-lg font-semibold">
              {balance?.balance?.toFixed(2) || '0.00'} ₽
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ~{Math.floor((balance?.balance || 0) / 0.1)} запросов
            </div>
          </div>

          <Button size="sm" onClick={() => setShowModal(true)} className="w-full">
            Пополнить баланс
          </Button>

          {balance && balance.total_spent > 0 && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <div className="flex justify-between">
                <span>Всего потрачено:</span>
                <span className="font-medium">{balance.total_spent.toFixed(2)} ₽</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <OrganizationBalanceModal
        organizationId={organizationId}
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}
