import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleCalendarView } from "./ScheduleCalendarView";
import { ScheduleTableView } from "./ScheduleTableView";
import { ScheduleFilters } from "./ScheduleFilters";
import { AddLessonModal } from "./AddLessonModal";
import { SessionFilters } from "@/hooks/useLessonSessions";

export const ScheduleModal = () => {
  const [open, setOpen] = useState(false);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [filters, setFilters] = useState<SessionFilters>({});
  const [currentView, setCurrentView] = useState<'calendar' | 'table'>('calendar');

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white">
            <Calendar className="h-4 w-4" />
            Расписание занятий
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Calendar className="h-6 w-6" />
                  </div>
                  Управление расписанием занятий
                </DialogTitle>
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => setAddLessonOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить занятие
                </Button>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Фильтры */}
              <ScheduleFilters filters={filters} onFiltersChange={setFilters} />

              {/* Вкладки */}
              <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'calendar' | 'table')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="calendar">Календарь</TabsTrigger>
                  <TabsTrigger value="table">Таблица</TabsTrigger>
                </TabsList>
                
                <TabsContent value="calendar" className="mt-6">
                  <ScheduleCalendarView filters={filters} />
                </TabsContent>
                
                <TabsContent value="table" className="mt-6">
                  <ScheduleTableView filters={filters} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddLessonModal
        open={addLessonOpen}
        onOpenChange={setAddLessonOpen}
      />
    </>
  );
};