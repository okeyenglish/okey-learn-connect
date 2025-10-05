import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLessonSessions } from "@/hooks/useLessonSessions";
import { useGroupStudents } from "@/hooks/useGroupStudents";
import { GroupLessonScheduleStrip } from "./GroupLessonScheduleStrip";
import { StudentScheduleRow } from "./StudentScheduleRow";
import { LessonColorLegend } from "./LessonColorLegend";
import { AddLessonModal } from "../schedule/AddLessonModal";

interface GroupScheduleCalendarProps {
  groupId: string;
}

export const GroupScheduleCalendar = ({ groupId }: GroupScheduleCalendarProps) => {
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  
  // Загружаем ВСЕ занятия группы
  const { data: sessions = [], isLoading, refetch } = useLessonSessions({});
  const { groupStudents = [], loading: studentsLoading } = useGroupStudents(groupId);

  // Фильтруем занятия только для этой группы
  const groupSessions = sessions.filter(session => session.group_id === groupId);

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
      <LessonColorLegend />

      {/* Общее расписание группы */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Общее расписание группы</h3>
            <Button 
              size="sm" 
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => setAddLessonOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить занятие
            </Button>
          </div>
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

      {/* Расписание каждого студента */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Ученики (всего {groupStudents.filter(gs => gs.status === 'active').length})
          </h3>
          
          {studentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загрузка учеников...</p>
            </div>
          ) : groupStudents.filter(gs => gs.status === 'active').length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет активных учеников в группе
            </div>
          ) : (
            <div className="space-y-4">
              {groupStudents
                .filter(gs => gs.status === 'active')
                .map((groupStudent) => (
                  <StudentScheduleRow
                    key={groupStudent.student.id}
                    studentId={groupStudent.student.id}
                    studentName={groupStudent.student.name || `Студент ${groupStudent.student.id}`}
                    groupId={groupId}
                    defaultExpanded={true}
                    onRefetch={refetch}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно добавления занятия */}
      <AddLessonModal 
        open={addLessonOpen} 
        onOpenChange={(open) => {
          setAddLessonOpen(open);
          if (!open) {
            refetch();
          }
        }}
        defaultGroupId={groupId}
      />
    </div>
  );
};