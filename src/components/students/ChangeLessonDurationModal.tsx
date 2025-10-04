import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LESSON_DURATIONS, calculateLessonPrice } from '@/utils/lessonPricing';

interface ChangeLessonDurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  currentDuration: number;
  lessonDate: string;
  onDurationChanged: () => void;
}

export function ChangeLessonDurationModal({
  open,
  onOpenChange,
  sessionId,
  currentDuration,
  lessonDate,
  onDurationChanged
}: ChangeLessonDurationModalProps) {
  const [newDuration, setNewDuration] = useState<number>(currentDuration);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (newDuration === currentDuration) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      // Обновляем продолжительность занятия
      const { error } = await supabase
        .from('individual_lesson_sessions')
        .update({ 
          duration: newDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Если занятие сократилось и было частично оплачено, нужно перераспределить минуты
      if (newDuration < currentDuration) {
        const { data: session } = await supabase
          .from('individual_lesson_sessions')
          .select('paid_minutes, individual_lesson_id')
          .eq('id', sessionId)
          .single();

        if (session && session.paid_minutes && session.paid_minutes > newDuration) {
          // Сколько минут освобождается
          const freedMinutes = session.paid_minutes - newDuration;
          
          // Обновляем текущее занятие - оставляем только оплату за новую продолжительность
          await supabase
            .from('individual_lesson_sessions')
            .update({ 
              paid_minutes: newDuration,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

          // Находим следующее неоплаченное занятие
          const { data: nextSessions } = await supabase
            .from('individual_lesson_sessions')
            .select('id, duration, paid_minutes')
            .eq('individual_lesson_id', session.individual_lesson_id)
            .gt('lesson_date', lessonDate)
            .order('lesson_date', { ascending: true })
            .limit(5);

          if (nextSessions && nextSessions.length > 0) {
            let remainingMinutes = freedMinutes;
            
            // Распределяем освободившиеся минуты на следующие занятия
            for (const nextSession of nextSessions) {
              if (remainingMinutes === 0) break;
              
              const sessionDuration = nextSession.duration || 60;
              const currentPaid = nextSession.paid_minutes || 0;
              const canPay = sessionDuration - currentPaid;
              
              if (canPay > 0) {
                const minutesToPay = Math.min(canPay, remainingMinutes);
                
                await supabase
                  .from('individual_lesson_sessions')
                  .update({ 
                    paid_minutes: currentPaid + minutesToPay,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', nextSession.id);
                
                remainingMinutes -= minutesToPay;
              }
            }

            if (remainingMinutes > 0) {
              toast({
                title: "Внимание",
                description: `${remainingMinutes} минут не удалось перенести на следующие занятия`,
                variant: "default",
              });
            }
          }
        }
      }

      toast({
        title: "Успешно",
        description: "Продолжительность занятия изменена",
      });

      onDurationChanged();
      onOpenChange(false);
    } catch (error) {
      console.error('Error changing lesson duration:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить продолжительность",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const durationDiff = newDuration - currentDuration;
  const priceDiff = calculateLessonPrice(newDuration) - calculateLessonPrice(currentDuration);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить продолжительность занятия</DialogTitle>
          <DialogDescription>
            Выберите новую продолжительность для этого занятия
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Продолжительность</label>
            <Select
              value={newDuration.toString()}
              onValueChange={(value) => setNewDuration(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LESSON_DURATIONS.map(duration => (
                  <SelectItem key={duration} value={duration.toString()}>
                    {duration} минут - {calculateLessonPrice(duration)} ₽
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {durationDiff !== 0 && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="font-medium mb-1">
                {durationDiff > 0 ? 'Увеличение' : 'Сокращение'}: {Math.abs(durationDiff)} минут
              </div>
              <div className="text-muted-foreground">
                Изменение стоимости: {priceDiff > 0 ? '+' : ''}{priceDiff} ₽
              </div>
              {durationDiff < 0 && (
                <div className="mt-2 text-xs text-orange-600">
                  ⚠️ Если занятие было оплачено, освободившиеся минуты будут перенесены на следующие неоплаченные занятия
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || newDuration === currentDuration}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}