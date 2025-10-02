import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { usePayments } from '@/hooks/usePayments';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CreatePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  individualLessonId?: string;
  totalUnpaidCount?: number;
  pricePerLesson?: number;
  onPaymentSuccess?: () => void;
}

const LESSON_PACKAGES = [1, 4, 8, 24, 80];

export function CreatePaymentModal({ 
  open, 
  onOpenChange, 
  studentId, 
  studentName,
  individualLessonId,
  totalUnpaidCount = 0,
  pricePerLesson = 0,
  onPaymentSuccess
}: CreatePaymentModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    method: 'card' as const,
    description: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  
  const { createPayment } = usePayments();
  const { toast } = useToast();

  const calculateAmount = () => {
    return (selectedPackage || 0) * pricePerLesson;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (individualLessonId && !selectedPackage) {
      toast({
        title: "Ошибка",
        description: "Выберите пакет занятий для оплаты",
        variant: "destructive",
      });
      return;
    }

    const amount = calculateAmount();
    
    if (!amount) {
      toast({
        title: "Ошибка",
        description: "Укажите сумму платежа",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createPayment({
        student_id: studentId,
        amount,
        method: formData.method,
        payment_date: formData.payment_date,
        description: formData.description || `Оплата ${selectedPackage} занятий`,
        notes: formData.notes,
        lessons_count: selectedPackage || 0,
        individual_lesson_id: individualLessonId
      });
      
      // Reset form
      setFormData({
        method: 'card' as const,
        description: '',
        notes: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
      setSelectedPackage(null);
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Оплата занятий</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Студент</Label>
            <div className="text-sm text-muted-foreground">{studentName}</div>
          </div>

          {individualLessonId && (
            <div className="space-y-3">
              <div>
                <Label>Неоплачено занятий</Label>
                <div className="text-2xl font-bold text-muted-foreground">{totalUnpaidCount}</div>
              </div>

              <div>
                <Label>Выберите пакет занятий</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LESSON_PACKAGES.map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSelectedPackage(count)}
                      disabled={count > totalUnpaidCount}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-center",
                        selectedPackage === count 
                          ? "border-primary bg-primary/10" 
                          : "border-muted hover:border-primary/50",
                        count > totalUnpaidCount && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {count * pricePerLesson} руб.
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPackage && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">К оплате:</span>
                    <span className="text-2xl font-bold">{calculateAmount()} руб.</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedPackage} {selectedPackage === 1 ? 'занятие' : selectedPackage < 5 ? 'занятия' : 'занятий'}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">

            <div>
              <Label htmlFor="method">Способ оплаты</Label>
              <Select value={formData.method} onValueChange={(value: any) => setFormData(prev => ({...prev, method: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Банковская карта</SelectItem>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="transfer">Банковский перевод</SelectItem>
                  <SelectItem value="online">Онлайн платеж</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="payment_date">Дата платежа</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData(prev => ({...prev, payment_date: e.target.value}))}
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              placeholder="Описание платежа..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
              placeholder="Дополнительные заметки..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}