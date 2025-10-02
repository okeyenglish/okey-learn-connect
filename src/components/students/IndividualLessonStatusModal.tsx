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
  MapPin 
} from "lucide-react";

interface IndividualLessonStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  scheduleTime?: string;
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
    color: 'text-purple-600',
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
}: IndividualLessonStatusModalProps) {
  if (!selectedDate) return null;

  const handleStatusSelect = (statusValue: string) => {
    // TODO: Implement status update logic
    console.log('Selected status:', statusValue, 'for date:', selectedDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
                onClick={() => handleStatusSelect(option.value)}
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
