import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  lessonId: string;
  scheduleDays?: string[];
  scheduleTime?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  refreshTrigger?: number;
  className?: string;
}

const dayLabels: Record<string, string> = {
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
  sunday: 'Вс',
};

function fmtDays(days?: string[]) {
  if (!days || days.length === 0) return '';
  return days.map(d => dayLabels[d?.toLowerCase()] || d).join('/');
}

export function ScheduleSummary({ lessonId, scheduleDays, scheduleTime, periodStart, periodEnd, refreshTrigger, className }: Props) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('individual_lesson_history')
        .select('id, changes, applied_from_date, applied_to_date, changed_at')
        .eq('lesson_id', lessonId)
        .order('changed_at', { ascending: true });
      if (!error) setHistory(data || []);
    })();
  }, [lessonId, refreshTrigger]);

  // Если истории нет — выводим обычный период
  if (!history || history.length === 0) {
    if (!periodStart && !periodEnd) return null;
    return (
      <div className={cn('text-sm text-muted-foreground mb-2', className)}>
        {periodStart && periodEnd
          ? `с ${format(new Date(periodStart!), 'dd.MM.yy', { locale: ru })} по ${format(new Date(periodEnd!), 'dd.MM.yy', { locale: ru })}`
          : periodStart
            ? format(new Date(periodStart!), 'dd.MM.yy', { locale: ru })
            : ''}
      </div>
    );
  }

  // Формируем строки периодов по истории
  const rows: { from?: string; to?: string | null; days?: string; time?: string }[] = [];

  const baseDays = fmtDays(scheduleDays);
  const baseTime = scheduleTime || '';

  // Вспомогательная функция извлечения значений из записи истории
  const getValues = (rec: any) => {
    const changes = Array.isArray(rec.changes) ? rec.changes : [rec.changes];
    const daysChange = changes.find((c: any) => c.field === 'schedule_days');
    const timeChange = changes.find((c: any) => c.field === 'schedule_time');
    return {
      daysNew: fmtDays(daysChange?.new_value) || undefined,
      daysOld: fmtDays(daysChange?.old_value) || undefined,
      timeNew: timeChange?.new_value as string | undefined,
      timeOld: timeChange?.old_value as string | undefined,
    };
  };

  const first = history[0];
  if (first?.applied_from_date) {
    const { daysOld, timeOld } = getValues(first);
    rows.push({
      from: undefined,
      to: first.applied_from_date,
      days: daysOld || baseDays,
      time: timeOld || baseTime,
    });
  }

  history.forEach((rec) => {
    const { daysNew, timeNew } = getValues(rec);
    rows.push({
      from: rec.applied_from_date,
      to: rec.applied_to_date,
      days: daysNew || baseDays,
      time: timeNew || baseTime,
    });
  });

  return (
    <div className={cn('text-sm text-muted-foreground mb-2 space-y-0.5', className)}>
      {rows.map((r, i) => (
        <div key={i}>
          {r.from
            ? `с ${format(new Date(r.from), 'dd.MM.yy', { locale: ru })}${r.to ? ` по ${format(new Date(r.to), 'dd.MM.yy', { locale: ru })}` : ''} — ${r.days || baseDays} ${r.time || baseTime}`
            : r.to
              ? `до ${format(new Date(r.to), 'dd.MM.yy', { locale: ru })} — ${r.days || baseDays} ${r.time || baseTime}`
              : `${baseDays} ${baseTime}`}
        </div>
      ))}
    </div>
  );
}
