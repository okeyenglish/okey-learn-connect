import { cn } from '@/lib/utils';
import { format, addDays, isBefore, startOfDay, parse, addMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { IndividualLessonStatusModal } from './IndividualLessonStatusModal';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { AttendanceIndicator } from './AttendanceIndicator';
import { supabase } from '@/integrations/supabase/client';
import { AdditionalLessonsList } from './AdditionalLessonsList';
import { ChevronDown, ChevronUp, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';

interface IndividualLessonScheduleProps {
  lessonId?: string;
  scheduleDays?: string[];
  scheduleTime?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  className?: string;
  onRefresh?: () => void;
  refreshTrigger?: number;
}

interface LessonSession {
  id?: string;
  lesson_date: string;
  status: string;
  payment_id?: string;
  is_additional?: boolean;
  notes?: string;
  duration?: number;
  paid_minutes?: number;
  payment_date?: string;
  payment_amount?: number;
  lessons_count?: number;
}

const DAY_MAP: Record<string, number> = {
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'sunday': 0,
  // Поддержка русских названий для обратной совместимости
  'пн': 1,
  'вт': 2,
  'ср': 3,
  'чт': 4,
  'пт': 5,
  'сб': 6,
  'вс': 0,
};

export function IndividualLessonSchedule({ 
  lessonId,
  scheduleDays, 
  scheduleTime, 
  periodStart,
  periodEnd,
  className,
  refreshTrigger
}: IndividualLessonScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lessonSessions, setLessonSessions] = useState<Record<string, LessonSession>>({});
  const [showAll, setShowAll] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState<Date | null>(null);
  const [showAdditionalLessons, setShowAdditionalLessons] = useState(false);
  const [additionalLessons, setAdditionalLessons] = useState<LessonSession[]>([]);
  const [lessonHistory, setLessonHistory] = useState<any[]>([]);

  useEffect(() => {
    if (lessonId) {
      loadLessonSessions();
      loadAdditionalLessons();
      loadLessonHistory();
    }
  }, [lessonId, refreshTrigger]);

  const loadLessonSessions = async () => {
    if (!lessonId) return;
    
    try {
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .select(`
          id, 
          lesson_date, 
          status, 
          payment_id, 
          is_additional, 
          notes, 
          duration, 
          paid_minutes, 
          updated_at,
          payments:payment_id (
            payment_date,
            amount,
            lessons_count
          )
        `)
        .eq('individual_lesson_id', lessonId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const sessionsMap: Record<string, LessonSession> = {};
      data?.forEach(session => {
        if (!sessionsMap[session.lesson_date]) {
          const payment = Array.isArray(session.payments) ? session.payments[0] : session.payments;
          sessionsMap[session.lesson_date] = { 
            id: session.id,
            lesson_date: session.lesson_date, 
            status: session.status,
            payment_id: session.payment_id,
            is_additional: session.is_additional,
            notes: session.notes,
            duration: session.duration,
            paid_minutes: session.paid_minutes || 0,
            payment_date: payment?.payment_date,
            payment_amount: payment?.amount,
            lessons_count: payment?.lessons_count
          };
        }
      });
      setLessonSessions(sessionsMap);
    } catch (error) {
      console.error('Error loading lesson sessions:', error);
    }
  };

  const loadAdditionalLessons = async () => {
    if (!lessonId) return;
    
    try {
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .select('id, lesson_date, status, notes')
        .eq('individual_lesson_id', lessonId)
        .eq('is_additional', true)
        .order('lesson_date', { ascending: true });

      if (error) throw error;

      setAdditionalLessons(data || []);
    } catch (error) {
      console.error('Error loading additional lessons:', error);
    }
  };

  const loadLessonHistory = async () => {
    if (!lessonId) return;
    
    try {
      const { data, error } = await supabase
        .from('individual_lesson_history')
        .select(`
          id,
          changed_at,
          changed_by,
          change_type,
          changes,
          applied_from_date,
          applied_to_date,
          notes
        `)
        .eq('lesson_id', lessonId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setLessonHistory(data || []);
    } catch (error) {
      console.error('Error loading lesson history:', error);
    }
  };

  const handleStatusUpdated = () => {
    loadLessonSessions();
    loadAdditionalLessons();
    loadLessonHistory();
  };

  const handleAdditionalLessonAdded = () => {
    loadLessonSessions();
    loadAdditionalLessons();
    loadLessonHistory();
  };

  if (!scheduleDays || scheduleDays.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Расписание не указано
      </div>
    );
  }

  const handleDateClick = (date: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const getLessonColor = (date: Date, status?: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const session = lessonSessions[dateStr];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lessonDate = new Date(date);
    lessonDate.setHours(0, 0, 0, 0);
    
    const isPast = lessonDate < today;

    // Сначала учитываем специальные статусы, они важнее оплаты
    if (session?.status) {
      switch (session.status) {
        case 'cancelled':
          return 'bg-black text-white border-black'; // Черный - отменено
        case 'rescheduled':
          return 'bg-black text-white border-black'; // Черный - отменено
        case 'free':
          return 'bg-orange-500 text-white border-orange-500'; // Оранжевый - бесплатное
      }
    }

    // Проверяем частичную оплату
    const duration = session?.duration || 60;
    const paidMinutes = session?.paid_minutes || 0;
    
    if (paidMinutes > 0 && paidMinutes < duration) {
      // Частичная оплата - используем градиент
      const percentage = (paidMinutes / duration) * 100;
      return `partial-payment-${Math.round(percentage)}`;
    }

    // Полная оплата
    if (paidMinutes >= duration || session?.payment_id) {
      if (isPast) {
        return 'bg-gray-500 text-white border-gray-500'; // Серый - оплачено и прошло
      }
      return 'bg-green-600 text-white border-green-600'; // Зеленый - оплачено
    }

    // Не оплачено
    if (isPast) {
      // Прошедшее и не оплаченное - красный (задолженность)
      return 'bg-red-500 text-white border-red-500';
    } else {
      // Будущее и не оплаченное - белый
      return 'bg-white text-gray-900 border-gray-300';
    }
  };

  const getPaymentTooltip = (session?: LessonSession, lessonNumber?: number) => {
    if (!session) return null;
    
    const duration = session.duration || 60;
    const paidMinutes = session.paid_minutes || 0;
    const unpaidMinutes = duration - paidMinutes;

    let paymentInfo = '';
    if (session.payment_date && session.payment_amount && session.lessons_count) {
      const paymentDate = format(new Date(session.payment_date), 'dd.MM.yyyy', { locale: ru });
      const pricePerLesson = Math.round(session.payment_amount / session.lessons_count);
      paymentInfo = `\nОплата от ${paymentDate} (${session.payment_amount.toLocaleString('ru-RU')} ₽ за ${session.lessons_count} ${session.lessons_count === 1 ? 'занятие' : 'занятия'})`;
    }

    if (paidMinutes === 0) {
      return `Не оплачено: ${duration} мин`;
    } else if (paidMinutes >= duration) {
      return `Оплачено: ${duration} мин${paymentInfo}`;
    } else {
      return `Оплачено: ${paidMinutes} мин\nНе оплачено: ${unpaidMinutes} мин${paymentInfo}`;
    }
  };

  const formatChangeValue = (value: any): string => {
    if (value === null || value === undefined) return 'не указано';
    if (Array.isArray(value)) {
      const dayLabels: Record<string, string> = {
        monday: 'Пн',
        tuesday: 'Вт',
        wednesday: 'Ср',
        thursday: 'Чт',
        friday: 'Пт',
        saturday: 'Сб',
        sunday: 'Вс'
      };
      return value.map(v => dayLabels[v.toLowerCase()] || v).join('/');
    }
    return String(value);
  };

  // Определяет актуальное время занятий на конкретную дату с учётом истории изменений
  const getEffectiveTimeForDate = (date: Date): string | undefined => {
    const d = new Date(date);
    d.setHours(0,0,0,0);

    if (!lessonHistory || lessonHistory.length === 0) {
      return scheduleTime;
    }

    // Сортируем записи по applied_from_date по возрастанию (null в конец)
    const records = [...lessonHistory].sort((a, b) => {
      const aFrom = a.applied_from_date ? new Date(a.applied_from_date).getTime() : Number.POSITIVE_INFINITY;
      const bFrom = b.applied_from_date ? new Date(b.applied_from_date).getTime() : Number.POSITIVE_INFINITY;
      return aFrom - bFrom;
    });

    // 1) Попробуем найти запись, диапазон которой покрывает дату
    for (const rec of records) {
      if (!rec.applied_from_date) continue;
      const from = new Date(rec.applied_from_date);
      from.setHours(0,0,0,0);
      const to = rec.applied_to_date ? new Date(rec.applied_to_date) : null;
      if (to) to.setHours(0,0,0,0);

      if (d.getTime() >= from.getTime() && (!to || d.getTime() <= to.getTime())) {
        const changes = Array.isArray(rec.changes) ? rec.changes : [rec.changes];
        const timeChange = changes.find((c: any) => c.field === 'schedule_time');
        if (timeChange?.new_value) return timeChange.new_value as string;
      }
    }

    // 2) Если дата раньше первой записи — берём старое значение из первой записи (old_value)
    const firstWithFrom = records.find(r => r.applied_from_date);
    if (firstWithFrom) {
      const firstFrom = new Date(firstWithFrom.applied_from_date);
      firstFrom.setHours(0,0,0,0);
      if (d.getTime() < firstFrom.getTime()) {
        const changes = Array.isArray(firstWithFrom.changes) ? firstWithFrom.changes : [firstWithFrom.changes];
        const timeChange = changes.find((c: any) => c.field === 'schedule_time');
        if (timeChange?.old_value) return timeChange.old_value as string;
      }
    }

    // 3) Иначе берём последнее известное новое значение до даты
    let lastKnown: string | undefined = undefined;
    for (const rec of records) {
      if (!rec.applied_from_date) continue;
      const from = new Date(rec.applied_from_date);
      from.setHours(0,0,0,0);
      if (from.getTime() <= d.getTime()) {
        const changes = Array.isArray(rec.changes) ? rec.changes : [rec.changes];
        const timeChange = changes.find((c: any) => c.field === 'schedule_time');
        if (timeChange?.new_value) lastKnown = timeChange.new_value as string;
      }
    }
    return lastKnown || scheduleTime;
  };
  // Generate lesson dates based on schedule days and include all sessions with custom statuses
  const generateLessonDates = () => {
    if (!periodStart || !periodEnd) return [];
    
    const dates: Date[] = [];
    const start = startOfDay(new Date(periodStart));
    const end = startOfDay(new Date(periodEnd));
    
    // Нормализуем дни недели к нижнему регистру и преобразуем в номера дней
    const scheduleDayNumbers = scheduleDays
      .map(day => {
        const normalizedDay = day.toLowerCase();
        return DAY_MAP[normalizedDay];
      })
      .filter(d => d !== undefined);
    
    if (scheduleDayNumbers.length === 0) {
      console.warn('No valid schedule days found:', scheduleDays);
      return [];
    }
    
    let currentDate = start;
    while (isBefore(currentDate, end) || currentDate.getTime() === end.getTime()) {
      const dayOfWeek = currentDate.getDay();
      if (scheduleDayNumbers.includes(dayOfWeek)) {
        dates.push(new Date(currentDate));
      }
      currentDate = addDays(currentDate, 1);
    }
    
    // Добавляем ВСЕ даты с сессиями (включая перенесенные, отмененные и т.д.)
    Object.keys(lessonSessions).forEach(dateStr => {
      const sessionDate = startOfDay(new Date(dateStr));
      // Добавляем только если даты еще нет в списке
      if (!dates.some(d => d.getTime() === sessionDate.getTime())) {
        dates.push(sessionDate);
      }
    });
    
    // Сортируем по дате
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    return dates; // Возвращаем все даты, лимит применим при рендере
  };

  const lessonDates = generateLessonDates();
  const displayedDates = showAll ? lessonDates : lessonDates.slice(0, 30);
  const hasMoreLessons = lessonDates.length > 30;

  const handleAttendanceClick = (date: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAttendanceDate(date);
    setAttendanceModalOpen(true);
  };

  if (lessonDates.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Нет запланированных занятий
      </div>
    );
  }

  return (
    <>
      <TooltipProvider>
        <div className={cn("space-y-3", className)}>
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1 flex-wrap">
            {displayedDates.map((date, index) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const session = lessonSessions[dateStr];
              const colorClass = getLessonColor(date, session?.status);
              const duration = session?.duration || 60;
              const paidMinutes = session?.paid_minutes || 0;
              const isPartialPayment = paidMinutes > 0 && paidMinutes < duration;
              const paymentPercentage = isPartialPayment ? (paidMinutes / duration) * 100 : 0;
              const lessonNumber = index + 1;
              
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => handleDateClick(date, e)}
                      className={cn(
                        "h-8 px-2 rounded border flex items-center justify-center hover:opacity-80 transition-all cursor-pointer relative overflow-hidden",
                        !isPartialPayment && colorClass
                      )}
                      style={isPartialPayment ? {
                        background: `linear-gradient(to right, rgb(22 163 74) ${paymentPercentage}%, rgb(243 244 246) ${paymentPercentage}%)`,
                        borderColor: 'rgb(209 213 219)',
                        color: paymentPercentage > 50 ? 'white' : 'rgb(107 114 128)'
                      } : undefined}
                    >
                      <span className="text-xs font-medium whitespace-nowrap relative z-10">
                        {format(date, 'dd.MM', { locale: ru })}
                      </span>
                      <AttendanceIndicator
                        lessonDate={date}
                        lessonId={lessonId || ''}
                        sessionType="individual"
                        onClick={(e) => handleAttendanceClick(date, e)}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <div className="font-semibold">Занятие №{lessonNumber} ({duration} мин.)</div>
                      <div className="text-muted-foreground">{format(date, 'dd MMMM yyyy', { locale: ru })}</div>
                      <div className="text-muted-foreground">
                        {(() => {
                          try {
                            const effective = getEffectiveTimeForDate(date);
                            if (effective) return effective;
                            if (scheduleTime) {
                              const start = parse(scheduleTime.split('-')[0], 'HH:mm', new Date());
                              const end = addMinutes(start, duration);
                              return `${format(start, 'HH:mm')}-${format(end, 'HH:mm')}`;
                            }
                            return null;
                          } catch {
                            return scheduleTime;
                          }
                        })()}
                      </div>
                      {session?.status && (
                        <div className="text-muted-foreground">
                          {session.status === 'cancelled' ? 'Отменено' : 
                           session.status === 'free' ? 'Бесплатное занятие' : 
                           session.status === 'rescheduled' ? 'Перенесено' : 
                           'Занятие'}
                        </div>
                      )}
                      {!session?.status && <div className="text-muted-foreground">Занятие</div>}
                      {session && (
                        <div className="whitespace-pre-line pt-1 border-t">
                          {getPaymentTooltip(session, lessonNumber)}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {!showAll && hasMoreLessons && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(true);
                }}
                className="h-8 px-3 rounded border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-all"
              >
                <span className="text-xs font-medium whitespace-nowrap">
                  +{lessonDates.length - 30} еще
                </span>
              </button>
            )}
            {showAll && hasMoreLessons && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(false);
                }}
                className="h-8 px-3 rounded border border-muted-foreground bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
              >
                <span className="text-xs font-medium whitespace-nowrap">
                  Скрыть
                </span>
              </button>
            )}
          </div>
        </div>

        {(additionalLessons.length > 0 || lessonHistory.length > 0) && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdditionalLessons(!showAdditionalLessons)}
              className="w-full justify-between h-8 text-xs"
            >
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-3 w-3" />
                <span>История изменений</span>
              </div>
              {showAdditionalLessons ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            {showAdditionalLessons && (
              <div className="space-y-3 mt-2">
                {/* История изменений параметров урока */}
                {lessonHistory.length > 0 && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Изменения параметров</div>
                      {lessonHistory.map((record: any) => {
                        const changes = Array.isArray(record.changes) ? record.changes : [record.changes];
                        const userName = record.changed_by ? 'Пользователь' : '—';
                        
                        return (
                          <div key={record.id} className="text-xs space-y-1 pb-2 border-b last:border-0 last:pb-0">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>{format(new Date(record.changed_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
                              <span>{userName}</span>
                            </div>
                            {record.applied_from_date && (
                              <div className="text-muted-foreground">
                                Применено: с {format(new Date(record.applied_from_date), 'dd.MM.yy', { locale: ru })}
                                {record.applied_to_date && ` по ${format(new Date(record.applied_to_date), 'dd.MM.yy', { locale: ru })}`}
                              </div>
                            )}
                            <div className="space-y-0.5">
                              {changes.map((change: any, idx: number) => (
                                <div key={idx} className="text-foreground">
                                  <span className="font-medium">{change.label || change.field}:</span>{' '}
                                  <span className="line-through text-muted-foreground">{formatChangeValue(change.old_value)}</span>
                                  {' → '}
                                  <span>{formatChangeValue(change.new_value)}</span>
                                </div>
                              ))}
                            </div>
                            {record.notes && (
                              <div className="text-muted-foreground italic">{record.notes}</div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
                
                {/* Дополнительные занятия */}
                {additionalLessons.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Дополнительные занятия ({additionalLessons.length})
                    </div>
                    <AdditionalLessonsList
                      lessons={additionalLessons}
                      onDelete={handleAdditionalLessonAdded}
                      onEdit={(lesson) => {
                        setSelectedDate(new Date(lesson.lesson_date));
                        setIsModalOpen(true);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </TooltipProvider>

      <IndividualLessonStatusModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        scheduleTime={scheduleTime}
        lessonId={lessonId}
        onStatusUpdated={handleStatusUpdated}
      />

      {attendanceDate && lessonId && (
        <MarkAttendanceModal
          open={attendanceModalOpen}
          onOpenChange={setAttendanceModalOpen}
          lessonDate={attendanceDate}
          lessonId={lessonId}
          sessionType="individual"
          onMarked={loadLessonSessions}
        />
      )}

    </>
  );
}
