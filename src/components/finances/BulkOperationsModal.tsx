import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBulkChargeTuition, useBulkGenerateInvoices } from '@/hooks/useBulkOperations';
import { Loader2, FileText, CreditCard, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface BulkOperationsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const BulkOperationsModal: React.FC<BulkOperationsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeBranch, setChargeBranch] = useState('all');
  const [chargeLevel, setChargeLevel] = useState('all');
  const [chargeDescription, setChargeDescription] = useState('Оплата за обучение');
  
  const [invoiceDueDays, setInvoiceDueDays] = useState('30');
  const [invoiceBranch, setInvoiceBranch] = useState('all');

  const bulkCharge = useBulkChargeTuition();
  const bulkInvoices = useBulkGenerateInvoices();

  const handleBulkCharge = async () => {
    if (!chargeAmount) return;

    const filters: any = {};
    if (chargeBranch && chargeBranch !== 'all') filters.branch = chargeBranch;
    if (chargeLevel && chargeLevel !== 'all') filters.level = chargeLevel;

    await bulkCharge.mutateAsync({
      filters,
      amount: parseFloat(chargeAmount),
      description: chargeDescription,
    });

    setChargeAmount('');
    setChargeBranch('');
    setChargeLevel('');
  };

  const handleBulkInvoices = async () => {
    const filters: any = { unpaid_only: true };
    if (invoiceBranch && invoiceBranch !== 'all') filters.branch = invoiceBranch;

    await bulkInvoices.mutateAsync({
      filters,
      due_days: parseInt(invoiceDueDays),
    });

    setInvoiceBranch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Массовые операции
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Массовые операции</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="charge" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="charge">Начисление</TabsTrigger>
            <TabsTrigger value="invoices">Счета</TabsTrigger>
          </TabsList>

          <TabsContent value="charge" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Массовое начисление оплаты
                </CardTitle>
                <CardDescription>
                  Начислить оплату всем студентам по выбранным фильтрам
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="charge-amount">Сумма начисления (руб.)</Label>
                  <Input
                    id="charge-amount"
                    type="number"
                    placeholder="5000"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="charge-description">Описание</Label>
                  <Input
                    id="charge-description"
                    placeholder="Оплата за обучение"
                    value={chargeDescription}
                    onChange={(e) => setChargeDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="charge-branch">Филиал (опционально)</Label>
                    <Select value={chargeBranch} onValueChange={setChargeBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все филиалы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все филиалы</SelectItem>
                        <SelectItem value="Центральный">Центральный</SelectItem>
                        <SelectItem value="Северный">Северный</SelectItem>
                        <SelectItem value="Южный">Южный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="charge-level">Уровень (опционально)</Label>
                    <Select value={chargeLevel} onValueChange={setChargeLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все уровни" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все уровни</SelectItem>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A2">A2</SelectItem>
                        <SelectItem value="B1">B1</SelectItem>
                        <SelectItem value="B2">B2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleBulkCharge}
                  disabled={!chargeAmount || bulkCharge.isPending}
                  className="w-full"
                >
                  {bulkCharge.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Начислить всем студентам
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Генерация счетов
                </CardTitle>
                <CardDescription>
                  Создать счета для всех студентов с неоплаченными начислениями
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-due">Срок оплаты (дней)</Label>
                  <Input
                    id="invoice-due"
                    type="number"
                    placeholder="30"
                    value={invoiceDueDays}
                    onChange={(e) => setInvoiceDueDays(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-branch">Филиал (опционально)</Label>
                  <Select value={invoiceBranch} onValueChange={setInvoiceBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все филиалы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все филиалы</SelectItem>
                      <SelectItem value="Центральный">Центральный</SelectItem>
                      <SelectItem value="Северный">Северный</SelectItem>
                      <SelectItem value="Южный">Южный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleBulkInvoices}
                  disabled={bulkInvoices.isPending}
                  className="w-full"
                >
                  {bulkInvoices.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сгенерировать счета
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
