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

export function ScheduleSummary({ lessonId, scheduleDays, scheduleTime, periodStart, periodEnd, className }: Props) {
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
  }, [lessonId]);

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

  history.forEach((rec) => {
    const changes = Array.isArray(rec.changes) ? rec.changes : [rec.changes];
    const daysChange = changes.find((c: any) => c.field === 'schedule_days');
    const timeChange = changes.find((c: any) => c.field === 'schedule_time');
    rows.push({
      from: rec.applied_from_date,
      to: rec.applied_to_date,
      days: fmtDays(timeChange ? undefined : daysChange?.new_value) || fmtDays(daysChange?.new_value),
      time: timeChange?.new_value || scheduleTime,
    });
  });

  // Добавляем период ДО первой записи (если можем восстановить старые значения)
  const first = history[0];
  if (first) {
    const ch = Array.isArray(first.changes) ? first.changes : [first.changes];
    const daysOld = ch.find((c: any) => c.field === 'schedule_days')?.old_value as string[] | undefined;
    const timeOld = ch.find((c: any) => c.field === 'schedule_time')?.old_value as string | undefined;
    if (first.applied_from_date && (daysOld || timeOld) && (periodStart || periodStart === null)) {
      rows.unshift({
        from: undefined,
        to: first.applied_from_date,
        days: fmtDays(daysOld) || fmtDays(scheduleDays),
        time: timeOld || scheduleTime,
      });
    }
  }

  return (
    <div className={cn('text-sm text-muted-foreground mb-2 space-y-0.5', className)}>
      {rows.map((r, i) => (
        <div key={i}>
          {r.from
            ? `с ${format(new Date(r.from), 'dd.MM.yy', { locale: ru })}${r.to ? ` по ${format(new Date(r.to), 'dd.MM.yy', { locale: ru })}` : ''} — ${r.days || fmtDays(scheduleDays)} ${r.time || ''}`
            : r.to
              ? `до ${format(new Date(r.to), 'dd.MM.yy', { locale: ru })} — ${r.days || fmtDays(scheduleDays)} ${r.time || ''}`
              : `${fmtDays(scheduleDays)} ${scheduleTime || ''}`}
        </div>
      ))}
    </div>
  );
}
