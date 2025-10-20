import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Edit, Trash2, Calendar, MapPin, BookOpen, User, Clock } from "lucide-react";
import { IndividualLesson, formatScheduleForIndividual, getLessonLocationLabel, useDeleteIndividualLesson } from "@/hooks/useIndividualLessons";
import { useToast } from "@/hooks/use-toast";
import { IndividualLessonDetailModal } from "./IndividualLessonDetailModal";
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

interface IndividualLessonsTableProps {
  lessons: IndividualLesson[];
  isLoading: boolean;
}

export const IndividualLessonsTable = ({ lessons, isLoading }: IndividualLessonsTableProps) => {
  const { toast } = useToast();
  const deleteLesson = useDeleteIndividualLesson();
  const [selectedLesson, setSelectedLesson] = useState<IndividualLesson | null>(null);

  const handleDelete = async (id: string, studentName: string) => {
    try {
      await deleteLesson.mutateAsync(id);
      toast({
        title: "Успешно",
        description: `Индивидуальное занятие "${studentName}" удалено`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить занятие",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка индивидуальных занятий...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lessons.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Индивидуальные занятия не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить фильтры или добавить новое занятие</p>
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
                <TableHead className="font-semibold">ФИО</TableHead>
                <TableHead className="font-semibold">Филиал</TableHead>
                <TableHead className="font-semibold">Дисциплина</TableHead>
                <TableHead className="font-semibold">Уровень</TableHead>
                <TableHead className="font-semibold">Категория</TableHead>
                <TableHead className="font-semibold">Ак. часов</TableHead>
                <TableHead className="font-semibold">Тип</TableHead>
                <TableHead className="font-semibold">Расписание</TableHead>
                <TableHead className="font-semibold">Преподаватели</TableHead>
                <TableHead className="font-semibold">Аудит.</TableHead>
                <TableHead className="font-semibold">Долг. часы</TableHead>
                <TableHead className="font-semibold">Опис.</TableHead>
                <TableHead className="font-semibold text-center">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => (
                <TableRow key={lesson.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="font-medium text-blue-600">
                      {lesson.student_name}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-blue-600">{lesson.branch}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>{lesson.subject}</TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {lesson.level}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm">
                      {lesson.category === 'school' ? 'Школьники' : 
                       lesson.category === 'adult' ? 'Взрослые' : 
                       lesson.category === 'preschool' ? 'Дошкольники' : 'Все'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span>{lesson.academic_hours || 0} а.ч.</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {getLessonLocationLabel(lesson.lesson_location)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1 max-w-[200px]">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {formatScheduleForIndividual(lesson.schedule_days, lesson.schedule_time)}
                      </div>
                      {lesson.period_start && lesson.period_end && (
                        <div className="text-xs text-gray-600">
                          ({new Date(lesson.period_start).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}-
                          {new Date(lesson.period_end).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })})
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {lesson.teacher_name ? (
                      <div className="space-y-1 max-w-[150px]">
                        <div className="text-sm font-medium">
                          {lesson.teacher_name === '[Нет]' ? (
                            <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-xs">Нет</span>
                          ) : (
                            lesson.teacher_name
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Не назначен</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      {lesson.audit_location || 'Не указано'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      {lesson.debt_hours && lesson.debt_hours > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {lesson.debt_hours} а.ч.
                        </Badge>
                      ) : (
                        <span className="text-gray-400">0 а.ч.</span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm max-w-[100px] truncate">
                      {lesson.description || lesson.notes || '-'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 text-yellow-600 hover:bg-yellow-50"
                        onClick={() => setSelectedLesson(lesson)}
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
                            <AlertDialogTitle>Удалить индивидуальное занятие?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Вы уверены, что хотите удалить индивидуальное занятие для "{lesson.student_name}"? Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(lesson.id, lesson.student_name)}
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
    
    {selectedLesson && (
      <IndividualLessonDetailModal
        lesson={selectedLesson}
        open={!!selectedLesson}
        onOpenChange={(open) => !open && setSelectedLesson(null)}
      />
    )}
    </>
  );
};