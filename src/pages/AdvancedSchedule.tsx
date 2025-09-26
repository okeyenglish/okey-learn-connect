import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Calendar, Search, Download } from "lucide-react";
import { AdvancedScheduleFilters } from "@/components/schedule/AdvancedScheduleFilters";
import { TeacherScheduleGrid } from "@/components/schedule/TeacherScheduleGrid";
import { ClassroomScheduleGrid } from "@/components/schedule/ClassroomScheduleGrid";
import { ScheduleStatusLegend } from "@/components/schedule/ScheduleStatusLegend";
import { SessionFilters } from "@/hooks/useLessonSessions";

export default function AdvancedSchedule() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'classrooms'>('teachers');
  const [filters, setFilters] = useState<SessionFilters>({});
  const [viewFormat, setViewFormat] = useState<string>('day-time-teacher');
  const [gridSettings, setGridSettings] = useState({
    timeStep: 'auto',
    weekMode: false,
    mergedColumns: false,
    rotated: false
  });

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Расписание занятий</h1>
              <p className="text-muted-foreground">
                Планирование и управление расписанием языкового центра O'KEY ENGLISH
              </p>
            </div>
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

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
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
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <span>Расписание занятий</span>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'teachers' | 'classrooms')}>
                      <TabsList>
                        <TabsTrigger value="teachers" className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          По преподавателям
                        </TabsTrigger>
                        <TabsTrigger value="classrooms" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          По аудиториям
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TabsContent value="teachers" className="mt-0">
                    <TeacherScheduleGrid 
                      filters={filters} 
                      viewFormat={viewFormat}
                      gridSettings={gridSettings}
                    />
                  </TabsContent>
                  <TabsContent value="classrooms" className="mt-0">
                    <ClassroomScheduleGrid 
                      filters={filters} 
                      viewFormat={viewFormat}
                      gridSettings={gridSettings}
                    />
                  </TabsContent>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}