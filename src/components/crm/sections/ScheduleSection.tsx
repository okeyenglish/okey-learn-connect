import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Clock, Users, BookOpen, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdvancedScheduleModal } from "@/components/schedule/AdvancedScheduleModal";
import { CourseScheduleGenerator } from "@/components/schedule/CourseScheduleGenerator";
import { useLessonSessions } from "@/hooks/useLessonSessions";

export default function ScheduleSection() {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  
  const { data: sessions = [], isLoading } = useLessonSessions({});

  const getSessionStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(session => session.lesson_date === today);
    const upcomingSessions = sessions.filter(session => session.lesson_date > today);
    const completedToday = todaySessions.filter(session => session.status === 'completed');
    
    return {
      today: todaySessions.length,
      upcoming: upcomingSessions.length,
      completed: completedToday.length,
      total: sessions.length
    };
  };

  const stats = getSessionStats();

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Расписание занятий</h1>
            <p className="text-muted-foreground">
              Управление расписанием и планирование занятий
            </p>
          </div>
          <Button onClick={() => setScheduleModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить занятие
          </Button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Сегодня</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Предстоящие</p>
                  <p className="text-2xl font-bold text-green-600">{stats.upcoming}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Проведено сегодня</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                </div>
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Всего занятий</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.total}</p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Календарь расписания
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Генератор курсов
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="h-[600px] border rounded-lg overflow-hidden">
              <AdvancedScheduleModal open={true} />
            </div>
          </TabsContent>

          <TabsContent value="generator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Автоматическая генерация расписания курса
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CourseScheduleGenerator>
                  <Button className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Сгенерировать расписание курса
                  </Button>
                </CourseScheduleGenerator>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AdvancedScheduleModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
        />
      </div>
    </div>
  );
}