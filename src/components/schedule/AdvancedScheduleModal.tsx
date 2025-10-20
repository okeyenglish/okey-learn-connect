import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Search, Download, Calendar } from "lucide-react";
import { AdvancedScheduleFilters } from "./AdvancedScheduleFilters";
import { TeacherScheduleGrid } from "./TeacherScheduleGrid";
import { ClassroomScheduleGrid } from "./ClassroomScheduleGrid";
import { MonthlyScheduleView } from "./MonthlyScheduleView";
import { ScheduleStatusLegend } from "./ScheduleStatusLegend";
import { SessionFilters } from "@/hooks/useLessonSessions";

interface AdvancedScheduleModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const AdvancedScheduleModal = ({ open, onOpenChange, children }: AdvancedScheduleModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'teachers' | 'classrooms' | 'monthly'>('teachers');
  const [filters, setFilters] = useState<SessionFilters>({});
  const [viewFormat, setViewFormat] = useState<string>('day-time-teacher');
  const [gridSettings, setGridSettings] = useState({
    timeStep: 'auto',
    weekMode: false,
    mergedColumns: false,
    rotated: false
  });

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const modalOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  const handleExportXLS = () => {
    // TODO: Implement Excel export functionality
    console.log('Exporting to Excel...');
  };

  const handleSearchLessons = () => {
    // TODO: Open lessons search modal
    console.log('Opening lessons search...');
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
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">
              Расписание занятий
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportXLS}>
                <Download className="h-4 w-4 mr-2" />
                Экспорт в XLS
              </Button>
              <Button variant="outline" size="sm" onClick={handleSearchLessons}>
                <Search className="h-4 w-4 mr-2" />
                Поиск занятий
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Планирование и управление расписанием языкового центра O'KEY ENGLISH
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Filters Sidebar */}
            <div className="w-80 border-r bg-muted/30 p-4 overflow-y-auto">
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
              <Card className="h-full rounded-none border-0">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="flex items-center justify-between">
                    <span>Расписание занятий</span>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'teachers' | 'classrooms' | 'monthly')}>
                      <TabsList>
                        <TabsTrigger value="teachers" className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          По преподавателям
                        </TabsTrigger>
                        <TabsTrigger value="classrooms" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          По аудиториям
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
                  <TabsContent value="monthly" className="h-full m-0 p-4">
                    <MonthlyScheduleView filters={filters} />
                  </TabsContent>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};