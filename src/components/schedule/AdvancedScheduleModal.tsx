import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Search, Download, Calendar, UserCheck, Printer } from "lucide-react";
import { AdvancedScheduleFilters } from "./AdvancedScheduleFilters";
import { TeacherScheduleGrid } from "./TeacherScheduleGrid";
import { ClassroomScheduleGrid } from "./ClassroomScheduleGrid";
import { MonthlyScheduleView } from "./MonthlyScheduleView";
import { StudentScheduleView } from "./StudentScheduleView";
import { ScheduleStatusLegend } from "./ScheduleStatusLegend";
import { SessionFilters, useLessonSessions, LessonSession } from "@/hooks/useLessonSessions";
import { exportScheduleToExcel, ScheduleExportSession } from "@/utils/scheduleExport";
import { printSchedule, SchedulePrintSession } from "@/utils/schedulePrint";
import { useToast } from "@/hooks/use-toast";
import { SearchLessonsModal } from "./SearchLessonsModal";

interface AdvancedScheduleModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const AdvancedScheduleModal = ({ open, onOpenChange, children }: AdvancedScheduleModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'teachers' | 'classrooms' | 'monthly' | 'student'>('teachers');
  const [filters, setFilters] = useState<SessionFilters>({});
  const [viewFormat, setViewFormat] = useState<string>('day-time-teacher');
  const [gridSettings, setGridSettings] = useState({
    timeStep: 'auto',
    weekMode: false,
    mergedColumns: false,
    rotated: false
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  
  const sessions = useLessonSessions(filters);
  const { toast } = useToast();

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const modalOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  const handleExportXLS = () => {
    if (!sessions?.data) {
      toast({
        title: "Нет данных для экспорта",
        description: "Загрузите расписание перед экспортом",
        variant: "destructive",
      });
      return;
    }

    // Map session data to export format
    const exportSessions: ScheduleExportSession[] = sessions.data.map(session => ({
      id: session.id,
      group_id: session.group_id,
      teacher_name: session.teacher_name,
      branch: session.branch,
      classroom: session.classroom,
      lesson_date: session.lesson_date,
      start_time: session.start_time,
      end_time: session.end_time,
      status: session.status,
      notes: session.notes,
      learning_groups: session.learning_groups,
    }));

    exportScheduleToExcel(
      exportSessions,
      activeTab as 'teachers' | 'classrooms' | 'all',
      `schedule_${activeTab}`
    );

    toast({
      title: "Экспорт завершен",
      description: "Файл Excel успешно сохранен",
    });
  };

  const handleSearchLessons = () => {
    setSearchModalOpen(true);
  };

  const handlePrint = () => {
    if (!sessions?.data) {
      toast({
        title: "Нет данных для печати",
        description: "Загрузите расписание перед печатью",
        variant: "destructive",
      });
      return;
    }

    // Map session data to print format
    const printSessions: SchedulePrintSession[] = sessions.data.map(session => ({
      id: session.id,
      lesson_date: session.lesson_date,
      start_time: session.start_time,
      end_time: session.end_time,
      teacher_name: session.teacher_name,
      branch: session.branch,
      classroom: session.classroom,
      status: session.status,
      notes: session.notes,
      learning_groups: session.learning_groups,
    }));

    printSchedule(
      printSessions,
      activeTab as 'teachers' | 'classrooms' | 'all',
      `Расписание - ${activeTab === 'teachers' ? 'Преподаватели' : activeTab === 'classrooms' ? 'Аудитории' : 'Все'}`
    );
  };

  const resetFilters = () => {
    setFilters({});
  };

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden bg-surface">
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold text-text-primary">
              Расписание занятий
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Печать
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportXLS}>
                <Download className="h-4 w-4 mr-2" />
                Экспорт в XLS
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSearchLessons}>
                <Search className="h-4 w-4 mr-2" />
                Поиск занятий
              </Button>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Планирование и управление расписанием языкового центра O'KEY ENGLISH
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Filters Sidebar */}
            <div className="w-80 border-r border-border/50 bg-bg-soft p-4 overflow-y-auto">
              <div className="space-y-4">
                <ScheduleStatusLegend />
                <AdvancedScheduleFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onReset={resetFilters}
                  viewFormat={viewFormat}
                  onViewFormatChange={setViewFormat}
                  gridSettings={gridSettings}
                  onGridSettingsChange={setGridSettings}
                  scheduleType={activeTab}
                />
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="flex-1 overflow-hidden">
              <Card className="h-full rounded-none border-0 bg-surface shadow-none">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="flex items-center justify-between text-text-primary">
                    <span>Расписание занятий</span>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                      <TabsList>
                        <TabsTrigger value="teachers" className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Преподаватели
                        </TabsTrigger>
                        <TabsTrigger value="classrooms" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Аудитории
                        </TabsTrigger>
                        <TabsTrigger value="student" className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Ученик
                        </TabsTrigger>
                        <TabsTrigger value="monthly" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Месяц
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-hidden p-0">
                  <TabsContent value="teachers" className="h-full m-0 p-4">
                    <TeacherScheduleGrid 
                      filters={filters} 
                      viewFormat={viewFormat}
                      gridSettings={gridSettings}
                    />
                  </TabsContent>
                  <TabsContent value="classrooms" className="h-full m-0 p-4">
                    <ClassroomScheduleGrid 
                      filters={filters} 
                      viewFormat={viewFormat}
                      gridSettings={gridSettings}
                    />
                  </TabsContent>
                  <TabsContent value="student" className="h-full m-0 p-4">
                    <StudentScheduleView />
                  </TabsContent>
                  <TabsContent value="monthly" className="h-full m-0 p-4">
                    <MonthlyScheduleView filters={filters} />
                  </TabsContent>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>

      <SearchLessonsModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
      />
    </Dialog>
  );
};