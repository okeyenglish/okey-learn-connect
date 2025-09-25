import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, BookOpen, Clock, Users, Sparkles } from "lucide-react";
import { useGenerateCourseSchedule } from "@/hooks/useCourseSchedule";
import { useCourseUnitsWithLessons } from "@/hooks/useCourseUnitsWithLessons";
import { useLearningGroups } from "@/hooks/useLearningGroups";
import { supabase } from "@/integrations/supabase/client";

interface CourseScheduleGeneratorProps {
  children: React.ReactNode;
}

export const CourseScheduleGenerator = ({ children }: CourseScheduleGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [courseSlug, setCourseSlug] = useState<string>("");
  
  const { groups } = useLearningGroups({});
  const { data: courseUnits } = useCourseUnitsWithLessons(courseSlug);
  const generateSchedule = useGenerateCourseSchedule();

  const handleGenerate = async () => {
    const group = groups.find(g => g.id === selectedGroup);
    if (!group || !courseSlug || !courseUnits) return;

    // Конвертируем время из строки расписания
    const scheduleTime = group.schedule_time || "";
    const timeMatch = scheduleTime.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    
    if (!timeMatch) return;

    const [, startHour, startMinute, endHour, endMinute] = timeMatch;
    const startTime = `${startHour}:${startMinute}`;
    const endTime = `${endHour}:${endMinute}`;

    try {
      // Получаем ID курса
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('slug', courseSlug)
        .single();

      if (!course) return;

      await generateSchedule.mutateAsync({
        groupId: selectedGroup,
        courseId: course.id,
        startDate: group.period_start || new Date().toISOString().split('T')[0],
        scheduleDays: group.schedule_days || [],
        startTime,
        endTime,
        teacherName: group.responsible_teacher || "Преподаватель",
        classroom: group.schedule_room || "Аудитория",
        branch: group.branch,
        totalLessons: 80
      });

      setOpen(false);
    } catch (error) {
      console.error('Error generating schedule:', error);
    }
  };

  const selectedGroupData = groups.find(g => g.id === selectedGroup);
  const totalLessons = courseUnits?.reduce((sum, unit) => sum + (unit.lessons?.length || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Генератор расписания курса
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор группы */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Выберите группу</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите группу для генерации расписания" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {group.name} - {group.level} ({group.branch})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Выбор курса */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Выберите курс</label>
            <Select value={courseSlug} onValueChange={setCourseSlug}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите курс для привязки к урокам" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super-safari-1">Super Safari 1</SelectItem>
                <SelectItem value="kids-box-1">Kids Box 1</SelectItem>
                <SelectItem value="prepare-1">Prepare 1</SelectItem>
                <SelectItem value="empower-1">Empower 1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Информация о группе */}
          {selectedGroupData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Информация о группе</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                    <span>Дни: {selectedGroupData.schedule_days?.join(", ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span>Время: {selectedGroupData.schedule_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span>Преподаватель: {selectedGroupData.responsible_teacher}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-orange-600" />
                    <span>Аудитория: {selectedGroupData.schedule_room}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Информация о курсе */}
          {courseUnits && courseUnits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Структура курса</CardTitle>
                <CardDescription>
                  Всего {courseUnits.length} юнитов, {totalLessons} уроков
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {courseUnits.map(unit => (
                    <div key={unit.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-medium">Юнит {unit.unit_number}: {unit.title}</span>
                      <Badge variant="secondary">{unit.lessons.length} уроков</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Кнопка генерации */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={!selectedGroup || !courseSlug || generateSchedule.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {generateSchedule.isPending ? "Генерация..." : "Сгенерировать расписание"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};