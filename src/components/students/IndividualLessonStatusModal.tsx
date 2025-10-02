import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Check, 
  DollarSign, 
  Gift, 
  UserX, 
  Calendar, 
  User, 
  MapPin,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IndividualLessonStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  scheduleTime?: string;
  lessonId?: string;
  onStatusUpdated?: () => void;
}

const lessonStatusOptions = [
  {
    value: 'attended',
    label: 'Занятие',
    description: 'Студент присутствовал на занятии',
    icon: Check,
    color: 'text-green-600',
  },
  {
    value: 'partially_paid',
    label: 'Частично оплачиваемое занятие',
    description: 'Занятие оплачено частично',
    icon: DollarSign,
    color: 'text-blue-600',
  },
  {
    value: 'free',
    label: 'Бесплатное занятие',
    description: 'Занятие без оплаты',
    icon: Gift,
    color: 'text-yellow-600',
  },
  {
    value: 'paid_absence',
    label: 'Оплачиваемый пропуск',
    description: 'Пропуск с оплатой',
    icon: UserX,
    color: 'text-orange-600',
  },
  {
    value: 'partially_paid_absence',
    label: 'Частично оплачиваемый пропуск',
    description: 'Пропуск с частичной оплатой',
    icon: UserX,
    color: 'text-amber-600',
  },
  {
    value: 'cancelled',
    label: 'Отменено',
    description: 'Занятие отменено',
    icon: XCircle,
    color: 'text-gray-900',
  },
  {
    value: 'reschedule',
    label: 'Перенести на другой день..',
    description: 'Перенос занятия на другую дату',
    icon: Calendar,
    color: 'text-indigo-600',
  },
  {
    value: 'substitute_teacher',
    label: 'Подменить преподавателя на день..',
    description: 'Замена преподавателя для этого урока',
    icon: User,
    color: 'text-teal-600',
  },
  {
    value: 'substitute_classroom',
    label: 'Подменить аудиторию на день..',
    description: 'Замена аудитории для этого урока',
    icon: MapPin,
    color: 'text-cyan-600',
  },
];

export function IndividualLessonStatusModal({
  open,
  onOpenChange,
  selectedDate,
  scheduleTime,
  lessonId,
  onStatusUpdated,
}: IndividualLessonStatusModalProps) {
  const { toast } = useToast();
  
  if (!selectedDate) return null;

  const handleStatusSelect = async (statusValue: string) => {
    if (!lessonId) {
      toast({
        title: "Ошибка",
        description: "ID занятия не найден",
        variant: "destructive"
      });
      return;
    }

    try {
      const lessonDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Пользователь не авторизован');
      }
      
      const { error } = await supabase
        .from('individual_lesson_sessions')
        .upsert({
          individual_lesson_id: lessonId,
          lesson_date: lessonDate,
          status: statusValue,
          created_by: user.id
        }, {
          onConflict: 'individual_lesson_id,lesson_date'
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Успешно",
        description: "Статус занятия обновлен"
      });

      onStatusUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating lesson status:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить статус занятия",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            Управление уроком
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
            {scheduleTime && ` • ${scheduleTime}`}
          </div>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {lessonStatusOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4 hover:bg-accent"
                onClick={(e) => { e.stopPropagation(); handleStatusSelect(option.value); }}
              >
                <div className="flex items-start gap-3 text-left w-full">
                  <Icon className={`h-5 w-5 mt-0.5 ${option.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
