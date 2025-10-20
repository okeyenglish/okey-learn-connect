import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, DollarSign, Gift, AlertTriangle, Calendar } from 'lucide-react';
import { 
  useUpdateAttendance, 
  AttendanceStatus, 
  getAttendanceLabel,
  getAttendanceColor 
} from '@/hooks/useIndividualLessonAttendance';

interface AttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    lesson_date: string;
    duration?: number;
    attendance_status?: string;
    notes?: string;
    replacement_teacher?: string;
  };
  defaultTeacher?: string;
}

export function AttendanceModal({ open, onOpenChange, session, defaultTeacher }: AttendanceModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>(
    (session.attendance_status as AttendanceStatus) || 'scheduled'
  );
  const [notes, setNotes] = useState(session.notes || '');
  const [replacementTeacher, setReplacementTeacher] = useState(session.replacement_teacher || '');
  const [homeworkText, setHomeworkText] = useState('');
  const [showInPortal, setShowInPortal] = useState(true);

  const updateAttendance = useUpdateAttendance();

  const handleSave = async () => {
    await updateAttendance.mutateAsync({
      sessionId: session.id,
      attendance_status: status,
      notes,
      replacement_teacher: replacementTeacher || undefined,
      homework_text: homeworkText || undefined,
      show_in_student_portal: showInPortal,
    });
    onOpenChange(false);
  };

  const statusOptions: { value: AttendanceStatus; label: string; icon: any; description: string }[] = [
    { 
      value: 'present', 
      label: 'Присутствовал', 
      icon: CheckCircle,
      description: 'Ученик присутствовал, занятие оплачивается' 
    },
    { 
      value: 'free', 
      label: 'Бесплатное занятие', 
      icon: Gift,
      description: 'Занятие не оплачивается (пробное, бонус)' 
    },
    { 
      value: 'paid_absence', 
      label: 'Оплачиваемый пропуск', 
      icon: DollarSign,
      description: 'Ученик отсутствовал, но занятие оплачивается' 
    },
    { 
      value: 'unpaid_absence', 
      label: 'Неоплачиваемый пропуск', 
      icon: XCircle,
      description: 'Ученик отсутствовал, занятие не оплачивается' 
    },
    { 
      value: 'partial_payment', 
      label: 'Частичная оплата', 
      icon: DollarSign,
      description: 'Занятие оплачивается частично' 
    },
    { 
      value: 'makeup', 
      label: 'Отработка', 
      icon: Calendar,
      description: 'Бесплатное занятие (компенсация пропуска)' 
    },
    { 
      value: 'penalty', 
      label: 'Штрафные часы', 
      icon: AlertTriangle,
      description: 'Занятие с наложением штрафа' 
    },
    { 
      value: 'cancelled', 
      label: 'Отменено', 
      icon: XCircle,
      description: 'Занятие отменено' 
    },
    { 
      value: 'rescheduled', 
      label: 'Перенесено', 
      icon: Calendar,
      description: 'Занятие перенесено на другую дату' 
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Отметка посещаемости</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Дата: {new Date(session.lesson_date).toLocaleDateString('ru-RU')} | 
            Продолжительность: {session.duration || 60} мин
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Статус посещаемости */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Статус занятия *</Label>
            <div className="grid grid-cols-1 gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`
                      p-4 border-2 rounded-lg text-left transition-all
                      ${status === option.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${status === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Замена преподавателя */}
          {(status === 'present' || status === 'partial_payment') && (
            <div className="space-y-2">
              <Label>Замена преподавателя (если была)</Label>
              <Input
                value={replacementTeacher}
                onChange={(e) => setReplacementTeacher(e.target.value)}
                placeholder={defaultTeacher || 'Укажите имя преподавателя'}
              />
            </div>
          )}

          {/* Домашнее задание */}
          <div className="space-y-2">
            <Label>Домашнее задание</Label>
            <Textarea
              value={homeworkText}
              onChange={(e) => setHomeworkText(e.target.value)}
              placeholder="Опишите домашнее задание..."
              rows={3}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-portal"
                checked={showInPortal}
                onCheckedChange={(checked) => setShowInPortal(checked as boolean)}
              />
              <label htmlFor="show-portal" className="text-sm">
                Показывать в личном кабинете ученика
              </label>
            </div>
          </div>

          {/* Комментарии */}
          <div className="space-y-2">
            <Label>Комментарии</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительные комментарии к занятию..."
              rows={3}
            />
          </div>

          {/* Действия */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={updateAttendance.isPending}>
              {updateAttendance.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
