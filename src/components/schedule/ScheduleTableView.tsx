import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Users, Clock, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { useLessonSessions, useDeleteLessonSession, SessionFilters, getDayLabel, getStatusLabel, getStatusColor } from "@/hooks/useLessonSessions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { EditLessonModal } from "./EditLessonModal";
import { useLearningGroups } from "@/hooks/useLearningGroups";
import { GroupDetailModal } from "@/components/learning-groups/GroupDetailModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScheduleTableViewProps {
  filters: SessionFilters;
}

export const ScheduleTableView = ({ filters }: ScheduleTableViewProps) => {
  const [editSession, setEditSession] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const { data: sessions = [], isLoading } = useLessonSessions(filters);
  const { groups } = useLearningGroups({});
  const deleteSession = useDeleteLessonSession();
  const { toast } = useToast();

  const handleDelete = async (sessionId: string, sessionInfo: string) => {
    try {
      await deleteSession.mutateAsync(sessionId);
      toast({
        title: "Успешно",
        description: `Занятие "${sessionInfo}" удалено`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить занятие",
        variant: "destructive"
      });
    }
  };

  const handleGroupClick = (session: any) => {
    if (session.group_id) {
      const group = groups.find(g => g.id === session.group_id);
      if (group) {
        setSelectedGroup(group);
        setGroupModalOpen(true);
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка расписания...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Занятия не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить фильтры или добавить новые занятия</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Дата и время</TableHead>
                  <TableHead className="font-semibold">Группа</TableHead>
                  <TableHead className="font-semibold">Преподаватель</TableHead>
                  <TableHead className="font-semibold">Филиал</TableHead>
                  <TableHead className="font-semibold">Аудитория</TableHead>
                  <TableHead className="font-semibold">Статус</TableHead>
                  <TableHead className="font-semibold">Заметки</TableHead>
                  <TableHead className="font-semibold text-center">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {format(new Date(session.lesson_date), "dd.MM.yyyy", { locale: ru })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{session.start_time} - {session.end_time}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {getDayLabel(session.day_of_week)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div 
                          className="font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handleGroupClick(session)}
                        >
                          {session.learning_groups?.name || 'Группа не найдена'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {session.learning_groups?.level} • {session.learning_groups?.subject}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-700">{session.teacher_name}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">{session.branch}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {session.classroom}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(session.status)}>
                        {getStatusLabel(session.status)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm text-gray-600">
                        {session.notes || "—"}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-yellow-600 hover:bg-yellow-50"
                          onClick={() => {
                            setEditSession(session);
                            setEditModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить занятие?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Вы уверены, что хотите удалить занятие "{session.learning_groups?.name}" от {format(new Date(session.lesson_date), "dd.MM.yyyy", { locale: ru })} в {session.start_time}? 
                                Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(
                                  session.id, 
                                  `${session.learning_groups?.name} ${format(new Date(session.lesson_date), "dd.MM.yyyy", { locale: ru })} ${session.start_time}`
                                )}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditLessonModal
        session={editSession}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSessionUpdated={() => {
          setEditSession(null);
          setEditModalOpen(false);
        }}
      />
      
      <GroupDetailModal 
        group={selectedGroup}
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
      />
    </>
  );
};