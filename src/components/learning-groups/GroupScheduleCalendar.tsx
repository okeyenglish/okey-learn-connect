import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Circle, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { useLessonSessions } from "@/hooks/useLessonSessions";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { GroupLessonScheduleStrip } from "./GroupLessonScheduleStrip";

interface GroupScheduleCalendarProps {
  groupId: string;
}

export const GroupScheduleCalendar = ({ groupId }: GroupScheduleCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Расширяем диапазон для отображения полных недель
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { data: sessions = [], isLoading, refetch } = useLessonSessions({
    date_from: format(calendarStart, 'yyyy-MM-dd'),
    date_to: format(calendarEnd, 'yyyy-MM-dd')
  });

  // Фильтруем занятия только для этой группы
  const groupSessions = sessions.filter(session => session.group_id === groupId);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка календаря...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Легенда статусов */}
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 text-blue-600" />
              <span>Запланировано</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Проведено</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-3 w-3 text-red-600" />
              <span>Отменено</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-3 w-3 text-yellow-600" />
              <span>Перенесено</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-yellow-500 rounded" />
              <span>Требует внимания</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Полоска с занятиями */}
      <Card>
        <CardContent className="p-4">
          {groupSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет занятий в выбранном периоде
            </div>
          ) : (
            <GroupLessonScheduleStrip 
              sessions={groupSessions}
              onSessionUpdated={refetch}
            />
          )}
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {groupSessions.filter(s => s.status === 'scheduled').length}
            </div>
            <div className="text-sm text-gray-600">Запланировано</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {groupSessions.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Проведено</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {groupSessions.filter(s => s.status === 'cancelled').length}
            </div>
            <div className="text-sm text-gray-600">Отменено</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {groupSessions.filter(s => s.status === 'rescheduled').length}
            </div>
            <div className="text-sm text-gray-600">Перенесено</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};