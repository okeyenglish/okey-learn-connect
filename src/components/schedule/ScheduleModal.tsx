import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Grid, Table } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleCalendarView } from "./ScheduleCalendarView";
import { ScheduleTableView } from "./ScheduleTableView";
import { ScheduleGridView } from "./ScheduleGridView";
import { ScheduleFilters } from "./ScheduleFilters";
import { AddLessonModal } from "./AddLessonModal";
import { SessionFilters } from "@/hooks/useLessonSessions";

interface ScheduleModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const ScheduleModal = ({ open, onOpenChange, children }: ScheduleModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [filters, setFilters] = useState<SessionFilters>({});
  const [currentView, setCurrentView] = useState<'grid' | 'calendar' | 'table'>('grid');

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const modalOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  const resetFilters = () => {
    setFilters({});
  };

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
        {children && (
          <DialogTrigger asChild>
            {children}
          </DialogTrigger>
        )}
        {!children && (
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white">
              <Calendar className="h-4 w-4" />
              Расписание занятий
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                <Calendar className="h-6 w-6" />
                Управление расписанием занятий
              </DialogTitle>
              <Button
                size="sm"
                onClick={() => setAddLessonOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить занятие
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Фильтры */}
              <ScheduleFilters filters={filters} onFiltersChange={setFilters} onReset={resetFilters} />

              {/* Вкладки */}
              <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'grid' | 'calendar' | 'table')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="grid" className="flex items-center gap-2">
                    <Grid className="h-4 w-4" />
                    Сетка
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Календарь
                  </TabsTrigger>
                  <TabsTrigger value="table" className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    Таблица
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="grid" className="mt-6">
                  <ScheduleGridView filters={filters} />
                </TabsContent>
                
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