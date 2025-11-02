import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganizationBalance, useTopUpBalance } from '@/hooks/useOrganizationBalance';

interface OrganizationBalanceModalProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationBalanceModal({
  organizationId,
  open,
  onOpenChange,
}: OrganizationBalanceModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const { data: balance } = useOrganizationBalance(organizationId);
  const topUp = useTopUpBalance();

  const handleTopUp = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    await topUp.mutateAsync({
      organizationId,
      amount: numAmount,
      description: description || undefined,
    });

    setAmount('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Пополнить баланс организации</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Текущий баланс</Label>
            <div className="text-2xl font-bold">
              {balance?.balance?.toFixed(2) || '0.00'} ₽
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Сумма пополнения</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание (опционально)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Пополнение для AI запросов"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTopUp}
              disabled={!amount || parseFloat(amount) <= 0 || topUp.isPending}
              className="flex-1"
            >
              {topUp.isPending ? 'Пополнение...' : 'Пополнить'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
