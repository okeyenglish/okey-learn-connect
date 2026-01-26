import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Clock, Copy } from 'lucide-react';

export interface DaySchedule {
  isOpen: boolean;
  open: string;
  close: string;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const DAYS_OF_WEEK: { key: keyof WorkingHours; label: string; shortLabel: string }[] = [
  { key: 'monday', label: 'Понедельник', shortLabel: 'Пн' },
  { key: 'tuesday', label: 'Вторник', shortLabel: 'Вт' },
  { key: 'wednesday', label: 'Среда', shortLabel: 'Ср' },
  { key: 'thursday', label: 'Четверг', shortLabel: 'Чт' },
  { key: 'friday', label: 'Пятница', shortLabel: 'Пт' },
  { key: 'saturday', label: 'Суббота', shortLabel: 'Сб' },
  { key: 'sunday', label: 'Воскресенье', shortLabel: 'Вс' },
];

const DEFAULT_SCHEDULE: DaySchedule = {
  isOpen: true,
  open: '09:00',
  close: '21:00',
};

const WEEKEND_SCHEDULE: DaySchedule = {
  isOpen: false,
  open: '10:00',
  close: '18:00',
};

export const getDefaultWorkingHours = (): WorkingHours => ({
  monday: { ...DEFAULT_SCHEDULE },
  tuesday: { ...DEFAULT_SCHEDULE },
  wednesday: { ...DEFAULT_SCHEDULE },
  thursday: { ...DEFAULT_SCHEDULE },
  friday: { ...DEFAULT_SCHEDULE },
  saturday: { isOpen: true, open: '10:00', close: '18:00' },
  sunday: { ...WEEKEND_SCHEDULE },
});

interface WorkingHoursEditorProps {
  value: WorkingHours;
  onChange: (hours: WorkingHours) => void;
}

export const WorkingHoursEditor = ({ value, onChange }: WorkingHoursEditorProps) => {
  const updateDay = (day: keyof WorkingHours, updates: Partial<DaySchedule>) => {
    onChange({
      ...value,
      [day]: { ...value[day], ...updates },
    });
  };

  const copyToAllWeekdays = () => {
    const mondaySchedule = value.monday;
    onChange({
      ...value,
      monday: { ...mondaySchedule },
      tuesday: { ...mondaySchedule },
      wednesday: { ...mondaySchedule },
      thursday: { ...mondaySchedule },
      friday: { ...mondaySchedule },
    });
  };

  const setAllClosed = () => {
    const closedSchedule: DaySchedule = { isOpen: false, open: '09:00', close: '18:00' };
    onChange({
      monday: { ...closedSchedule },
      tuesday: { ...closedSchedule },
      wednesday: { ...closedSchedule },
      thursday: { ...closedSchedule },
      friday: { ...closedSchedule },
      saturday: { ...closedSchedule },
      sunday: { ...closedSchedule },
    });
  };

  const setStandardHours = () => {
    onChange(getDefaultWorkingHours());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Рабочие часы
        </Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={setStandardHours}>
            Стандартные
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={copyToAllWeekdays}>
            <Copy className="h-3 w-3 mr-1" />
            Пн → будни
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {DAYS_OF_WEEK.map(({ key, label, shortLabel }) => {
          const daySchedule = value[key];
          
          return (
            <div
              key={key}
              className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                daySchedule.isOpen ? 'bg-background' : 'bg-muted/50'
              }`}
            >
              <div className="w-24 flex items-center gap-2">
                <Switch
                  checked={daySchedule.isOpen}
                  onCheckedChange={(checked) => updateDay(key, { isOpen: checked })}
                />
                <span className="text-sm font-medium hidden sm:inline">{shortLabel}</span>
                <span className="text-sm font-medium sm:hidden">{shortLabel}</span>
              </div>
              
              <span className="text-sm text-muted-foreground w-20 hidden sm:block">{label}</span>
              
              {daySchedule.isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={daySchedule.open}
                    onChange={(e) => updateDay(key, { open: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">—</span>
                  <Input
                    type="time"
                    value={daySchedule.close}
                    onChange={(e) => updateDay(key, { close: e.target.value })}
                    className="w-28"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">Выходной</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Утилита для форматирования рабочих часов в читаемый вид
export const formatWorkingHours = (hours: WorkingHours | null): string => {
  if (!hours) return 'Не указано';
  
  const openDays = DAYS_OF_WEEK.filter(({ key }) => hours[key]?.isOpen);
  if (openDays.length === 0) return 'Закрыто';
  
  // Группируем по одинаковому расписанию
  const groups: { days: string[]; schedule: string }[] = [];
  
  openDays.forEach(({ key, shortLabel }) => {
    const day = hours[key];
    const schedule = `${day.open}–${day.close}`;
    const existing = groups.find((g) => g.schedule === schedule);
    if (existing) {
      existing.days.push(shortLabel);
    } else {
      groups.push({ days: [shortLabel], schedule });
    }
  });
  
  return groups
    .map(({ days, schedule }) => `${days.join(', ')}: ${schedule}`)
    .join(' | ');
};

// Краткое отображение для карточки
export const formatWorkingHoursShort = (hours: WorkingHours | null): string => {
  if (!hours) return '—';
  
  const openDays = DAYS_OF_WEEK.filter(({ key }) => hours[key]?.isOpen);
  if (openDays.length === 0) return 'Закрыто';
  
  // Находим самое раннее открытие и самое позднее закрытие
  let earliestOpen = '23:59';
  let latestClose = '00:00';
  
  openDays.forEach(({ key }) => {
    const day = hours[key];
    if (day.open < earliestOpen) earliestOpen = day.open;
    if (day.close > latestClose) latestClose = day.close;
  });
  
  return `${earliestOpen}–${latestClose}`;
};