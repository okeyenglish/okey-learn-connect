import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddBalanceTransaction } from '@/hooks/useStudentBalances';
import { DollarSign, Clock } from 'lucide-react';

interface AddBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export const AddBalanceModal = ({ 
  open, 
  onOpenChange, 
  studentId, 
  studentName 
}: AddBalanceModalProps) => {
  const [amount, setAmount] = useState('');
  const [academicHours, setAcademicHours] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState<'payment' | 'bonus' | 'adjustment'>('payment');

  const addTransaction = useAddBalanceTransaction();

  const handleSubmit = () => {
    if (!amount || !academicHours) return;

    const amountNum = parseFloat(amount);
    const hoursNum = parseFloat(academicHours);
    const priceNum = pricePerHour ? parseFloat(pricePerHour) : amountNum / hoursNum;

    addTransaction.mutate({
      student_id: studentId,
      amount: amountNum,
      academic_hours: hoursNum,
      transaction_type: transactionType,
      description: description || `Пополнение баланса на ${hoursNum} ак. часов`,
      price_per_hour: priceNum,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setAmount('');
        setAcademicHours('');
        setPricePerHour('');
        setDescription('');
      },
    });
  };

  // Автоматический расчет
  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (academicHours && value) {
      const price = parseFloat(value) / parseFloat(academicHours);
      setPricePerHour(price.toFixed(2));
    }
  };

  const handleHoursChange = (value: string) => {
    setAcademicHours(value);
    if (amount && value) {
      const price = parseFloat(amount) / parseFloat(value);
      setPricePerHour(price.toFixed(2));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Пополнение баланса</DialogTitle>
          <DialogDescription>
            Студент: {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transaction-type">Тип операции</Label>
            <Select value={transactionType} onValueChange={(value: any) => setTransactionType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment">Платёж</SelectItem>
                <SelectItem value="bonus">Бонус</SelectItem>
                <SelectItem value="adjustment">Корректировка</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Сумма (₽)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="5000"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Академ часы
              </Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                placeholder="10"
                value={academicHours}
                onChange={(e) => handleHoursChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-per-hour">Цена за ак. час (₽)</Label>
            <Input
              id="price-per-hour"
              type="number"
              step="0.01"
              placeholder="500"
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              disabled={!!(amount && academicHours)}
            />
            {amount && academicHours && (
              <p className="text-xs text-muted-foreground">
                Автоматически рассчитано: {pricePerHour} ₽/час
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание (опционально)</Label>
            <Textarea
              id="description"
              placeholder="Пополнение баланса..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || !academicHours || addTransaction.isPending}
          >
            {addTransaction.isPending ? 'Сохранение...' : 'Пополнить баланс'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
