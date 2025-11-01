import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCreateSubstitution } from '@/hooks/useTeacherSubstitutions';
import { useToast } from '@/hooks/use-toast';

interface SubstitutionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  sessionId?: string;
  sessionDate?: string;
  type: 'substitution' | 'absence';
}

export const SubstitutionRequestModal = ({ 
  open, 
  onOpenChange, 
  teacherId,
  sessionId,
  sessionDate,
  type 
}: SubstitutionRequestModalProps) => {
  const [date, setDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const createSubstitution = useCreateSubstitution();
  const { toast } = useToast();

  // Предзаполнение даты при открытии модалки
  useEffect(() => {
    if (open && sessionDate) {
      setDate(new Date(sessionDate));
    }
  }, [open, sessionDate]);

  const handleSubmit = async () => {
    if (!date) {
      toast({
        title: 'Ошибка',
        description: 'Выберите дату',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createSubstitution.mutateAsync({
        original_teacher_id: teacherId,
        substitution_date: format(date, 'yyyy-MM-dd'),
        lesson_session_id: sessionId,
        reason: reason || null,
        status: 'pending',
      });

      toast({
        title: type === 'substitution' ? 'Заявка на замену создана' : 'Заявка на отсутствие создана',
        description: 'Администратор рассмотрит вашу заявку',
      });

      onOpenChange(false);
      setDate(undefined);
      setReason('');
    } catch (error) {
      console.error('Error creating substitution:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            {type === 'substitution' ? 'Заявка на замену' : 'Заявка на отсутствие'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Дата {type === 'substitution' ? 'замены' : 'отсутствия'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ru}
                  disabled={(date) => date < new Date()}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="reason">Причина</Label>
            <Textarea
              id="reason"
              placeholder={type === 'substitution' 
                ? 'Укажите причину, по которой вам нужна замена...' 
                : 'Укажите причину отсутствия...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          {type === 'substitution' && (
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                После создания заявки администратор подберет подходящего преподавателя для замены
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createSubstitution.isPending || !date}
          >
            {createSubstitution.isPending ? 'Создание...' : 'Создать заявку'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
