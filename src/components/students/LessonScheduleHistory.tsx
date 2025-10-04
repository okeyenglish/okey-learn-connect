import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface HistoryRecord {
  id: string;
  changed_at: string;
  changed_by: string | null;
  applied_from_date: string | null;
  applied_to_date: string | null;
  changes: any;
  notes: string | null;
}

interface LessonScheduleHistoryProps {
  lessonId: string;
  currentSchedule: {
    scheduleDays?: string[];
    scheduleTime?: string;
    duration?: number;
  };
  refreshTrigger?: number;
}

export function LessonScheduleHistory({ lessonId, currentSchedule, refreshTrigger }: LessonScheduleHistoryProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [lessonId, refreshTrigger]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('individual_lesson_history')
        .select(`
          id,
          changed_at,
          changed_by,
          applied_from_date,
          applied_to_date,
          changes,
          notes,
          profiles:changed_by(first_name, last_name)
        `)
        .eq('lesson_id', lessonId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (history.length === 0) return null;

  const formatScheduleInfo = (scheduleTime?: string, duration?: number) => {
    if (!scheduleTime) return '';
    const startTime = scheduleTime.split('-')[0];
    if (!duration) return `с ${startTime}`;
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    
    return `с ${startTime} до ${endTime}`;
  };

  // Группируем историю по периодам
  const periods: Array<{
    fromDate: string | null;
    toDate: string | null;
    schedule: string;
    isCurrent: boolean;
  }> = [];

  // Добавляем текущее расписание
  if (history.length > 0 && history[0].applied_from_date) {
    const dayLabels: Record<string, string> = {
      monday: 'Пн',
      tuesday: 'Вт',
      wednesday: 'Ср',
      thursday: 'Чт',
      friday: 'Пт',
      saturday: 'Сб',
      sunday: 'Вс'
    };
    
    const daysText = currentSchedule.scheduleDays
      ? currentSchedule.scheduleDays.map(d => dayLabels[d.toLowerCase()] || d).join('/')
      : '';
    const timeText = formatScheduleInfo(currentSchedule.scheduleTime, currentSchedule.duration);
    
    periods.push({
      fromDate: history[0].applied_from_date,
      toDate: history[0].applied_to_date,
      schedule: `${daysText} ${timeText}`,
      isCurrent: true
    });
  }

  // Добавляем старые периоды из истории
  history.forEach((record, index) => {
    if (!record.applied_from_date) return;
    
    const changes = Array.isArray(record.changes) ? record.changes : [record.changes];
    const scheduleTimeChange = changes.find((c: any) => c.field === 'schedule_time');
    const scheduleDaysChange = changes.find((c: any) => c.field === 'schedule_days');
    
    if (scheduleTimeChange || scheduleDaysChange) {
      const oldTime = scheduleTimeChange?.old_value;
      const oldDays = scheduleDaysChange?.old_value;
      
      const dayLabels: Record<string, string> = {
        monday: 'Пн',
        tuesday: 'Вт',
        wednesday: 'Ср',
        thursday: 'Чт',
        friday: 'Пт',
        saturday: 'Сб',
        sunday: 'Вс'
      };
      
      // Используем старые дни из истории, если есть, иначе текущие
      const daysToDisplay = oldDays || (index < history.length - 1 
        ? history[index + 1].changes?.find((c: any) => c.field === 'schedule_days')?.new_value
        : currentSchedule.scheduleDays);
      
      const daysText = daysToDisplay && Array.isArray(daysToDisplay)
        ? daysToDisplay.map((d: string) => dayLabels[d.toLowerCase()] || d).join('/')
        : '';
      
      const timeText = formatScheduleInfo(oldTime || currentSchedule.scheduleTime, currentSchedule.duration);
      
      // Период до изменения - с предыдущей даты до даты применения этого изменения
      const toDate = record.applied_from_date;
      const prevFromDate = index < history.length - 1 && history[index + 1].applied_from_date
        ? history[index + 1].applied_from_date
        : null;
      
      periods.push({
        fromDate: prevFromDate,
        toDate: toDate,
        schedule: `${daysText} ${timeText}`,
        isCurrent: false
      });
    }
  });

  if (periods.length === 0) return null;

  return (
    <Card className="mt-3 bg-muted/30">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <History className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1 text-xs">
            {periods.map((period, index) => (
              <div
                key={index}
                className={period.isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}
              >
                {period.fromDate && period.toDate ? (
                  <>
                    с {format(new Date(period.fromDate), 'dd.MM.yy', { locale: ru })} по {format(new Date(period.toDate), 'dd.MM.yy', { locale: ru })}
                  </>
                ) : period.fromDate ? (
                  <>с {format(new Date(period.fromDate), 'dd.MM.yy', { locale: ru })}</>
                ) : period.toDate ? (
                  <>до {format(new Date(period.toDate), 'dd.MM.yy', { locale: ru })}</>
                ) : null}
                {' — '}
                {period.schedule}
                {period.isCurrent && ' (текущее)'}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}