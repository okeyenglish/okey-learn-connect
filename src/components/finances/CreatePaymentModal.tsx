import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFinances } from '@/hooks/useFinances';
import { useToast } from '@/hooks/use-toast';

interface CreatePaymentModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  studentId?: string;
  onPaymentCreated?: () => void;
}

export function CreatePaymentModal({ open, onOpenChange, children, studentId, onPaymentCreated }: CreatePaymentModalProps) {
  const [formData, setFormData] = useState({
    invoice_id: '',
    student_id: studentId || '',
    amount: '',
    payment_method: 'cash' as const,
    description: '',
    notes: '',
    status: 'completed' as const
  });
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const { createPayment, loading } = useFinances();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !paymentDate) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля",
        variant: "destructive",
      });
      return;
    }

    try {
      await createPayment({
        ...formData,
        amount: parseFloat(formData.amount),
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
      });
      
      // Сброс формы
      setFormData({
        invoice_id: '',
        student_id: studentId || '',
        amount: '',
        payment_method: 'cash',
        description: '',
        notes: '',
        status: 'completed'
      });
      setPaymentDate(new Date());
      
      if (onPaymentCreated) {
        onPaymentCreated();
      }
      
      if (onOpenChange) {
        onOpenChange(false);
      }
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  };

  const paymentMethods = [
    { value: 'cash', label: 'Наличные' },
    { value: 'card', label: 'Банковская карта' },
    { value: 'bank_transfer', label: 'Банковский перевод' },
    { value: 'online', label: 'Онлайн платеж' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'В обработке' },
    { value: 'completed', label: 'Завершен' },
    { value: 'failed', label: 'Ошибка' },
    { value: 'cancelled', label: 'Отменен' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить платеж</DialogTitle>
          <DialogDescription>
            Зафиксируйте поступивший платеж от студента или клиента
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Сумма *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="payment_method">Способ оплаты *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!studentId && (
            <div>
              <Label htmlFor="student_id">Студент</Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, student_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите студента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student1">Иванов Иван</SelectItem>
                  <SelectItem value="student2">Петрова Мария</SelectItem>
                  <SelectItem value="student3">Сидоров Петр</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="invoice_id">Связанный счет</Label>
            <Select
              value={formData.invoice_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, invoice_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите счет (опционально)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inv1">INV-20240101-001 (5000 ₽)</SelectItem>
                <SelectItem value="inv2">INV-20240102-002 (3500 ₽)</SelectItem>
                <SelectItem value="inv3">INV-20240103-003 (7200 ₽)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Дата платежа *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Оплата за обучение"
            />
          </div>

          <div>
            <Label htmlFor="status">Статус</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange?.(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Добавление..." : "Добавить платеж"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}