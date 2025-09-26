import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFinances } from '@/hooks/useFinances';
import { useToast } from '@/hooks/use-toast';

interface CreateInvoiceModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function CreateInvoiceModal({ open, onOpenChange, children }: CreateInvoiceModalProps) {
  const [formData, setFormData] = useState({
    invoice_number: '',
    student_id: '',
    amount: '',
    description: '',
    notes: '',
    due_date: undefined as Date | undefined,
    status: 'draft' as const
  });
  const [dueDate, setDueDate] = useState<Date>();
  const { createInvoice, loading } = useFinances();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.invoice_number || !formData.amount) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля",
        variant: "destructive",
      });
      return;
    }

    try {
      await createInvoice({
        ...formData,
        amount: parseFloat(formData.amount),
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
      });
      
      // Сброс формы
      setFormData({
        invoice_number: '',
        student_id: '',
        amount: '',
        description: '',
        notes: '',
        due_date: undefined,
        status: 'draft'
      });
      setDueDate(undefined);
      
      if (onOpenChange) {
        onOpenChange(false);
      }
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  };

  const generateInvoiceNumber = () => {
    const now = new Date();
    const invoiceNumber = `INV-${format(now, 'yyyyMMdd')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, invoice_number: invoiceNumber }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Создать счет</DialogTitle>
          <DialogDescription>
            Создайте новый счет для студента или клиента
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice_number">Номер счета *</Label>
              <div className="flex gap-2">
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="INV-20240101-001"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateInvoiceNumber}
                  className="shrink-0"
                >
                  Сгенерировать
                </Button>
              </div>
            </div>
            
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
          </div>

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

          <div>
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание услуг"
            />
          </div>

          <div>
            <Label>Срок оплаты</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
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
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="sent">Отправлен</SelectItem>
                <SelectItem value="paid">Оплачен</SelectItem>
                <SelectItem value="cancelled">Отменен</SelectItem>
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
              {loading ? "Создание..." : "Создать счет"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}