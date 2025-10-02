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

interface LessonSession {
  id: string;
  lessonDate: string;
  status: string;
}

interface CreatePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  individualLessonId?: string;
  unpaidSessions?: LessonSession[];
  pricePerLesson?: number;
  onPaymentSuccess?: () => void;
}

export function CreatePaymentModal({ 
  open, 
  onOpenChange, 
  studentId, 
  studentName,
  individualLessonId,
  unpaidSessions = [],
  pricePerLesson = 0,
  onPaymentSuccess
}: CreatePaymentModalProps) {
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    amount: '',
    method: 'card' as const,
    description: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  
  const { createPayment } = usePayments();
  const { toast } = useToast();

  const toggleSession = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const calculateAmount = () => {
    return selectedSessions.length * pricePerLesson;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (individualLessonId && selectedSessions.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы одно занятие для оплаты",
        variant: "destructive",
      });
      return;
    }

    const amount = individualLessonId ? calculateAmount() : parseFloat(formData.amount);
    
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
        description: formData.description || `Оплата ${selectedSessions.length} занятий`,
        notes: formData.notes,
        session_ids: individualLessonId ? selectedSessions : undefined,
        individual_lesson_id: individualLessonId
      });
      
      // Reset form
      setFormData({
        amount: '',
        method: 'card' as const,
        description: '',
        notes: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
      setSelectedSessions([]);
      
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Оплата занятий</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Студент</Label>
            <div className="text-sm text-muted-foreground">{studentName}</div>
          </div>

          {individualLessonId && unpaidSessions.length > 0 && (
            <div className="space-y-3">
              <Label>Выберите занятия для оплаты</Label>
              <div className="border rounded-lg p-4 bg-muted/30 space-y-2 max-h-60 overflow-y-auto">
                {unpaidSessions.map(session => (
                  <div key={session.id} className="flex items-center gap-3 p-2 hover:bg-background rounded">
                    <Checkbox
                      checked={selectedSessions.includes(session.id)}
                      onCheckedChange={() => toggleSession(session.id)}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm">
                        {format(new Date(session.lessonDate), 'd MMMM yyyy', { locale: ru })}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {pricePerLesson} руб.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                <span className="font-medium">Выбрано занятий: {selectedSessions.length}</span>
                <span className="font-bold text-lg">{calculateAmount()} руб.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!individualLessonId && (
              <div>
                <Label htmlFor="amount">Сумма *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({...prev, amount: e.target.value}))}
                  placeholder="0.00"
                />
              </div>
            )}

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