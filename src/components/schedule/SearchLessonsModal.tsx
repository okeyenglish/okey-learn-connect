import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Clock, User, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useLessonSessions, getStatusLabel, getStatusColor } from "@/hooks/useLessonSessions";

interface SearchLessonsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSession?: (session: any) => void;
}

export const SearchLessonsModal = ({ open, onOpenChange, onSelectSession }: SearchLessonsModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const { data: sessions = [], isLoading } = useLessonSessions({
    teacher: teacherFilter || undefined,
    branch: branchFilter || undefined,
    date_from: dateFilter || undefined,
  });

  // Фильтрация по поисковому запросу
  const filteredSessions = sessions.filter((session: any) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      session.learning_groups?.name?.toLowerCase().includes(query) ||
      session.teacher_name?.toLowerCase().includes(query) ||
      session.classroom?.toLowerCase().includes(query) ||
      session.branch?.toLowerCase().includes(query) ||
      session.notes?.toLowerCase().includes(query)
    );
  });

  const handleSessionClick = (session: any) => {
    if (onSelectSession) {
      onSelectSession(session);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Поиск занятий
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Поисковая строка */}
          <div className="space-y-2">
            <Label>Быстрый поиск</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию группы, преподавателю, аудитории..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Фильтры */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Дата (от)</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Преподаватель</Label>
              <Input
                placeholder="Имя преподавателя"
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Филиал</Label>
              <Input
                placeholder="Название филиала"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Результаты поиска */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Поиск занятий...</p>
                </div>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center p-8">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Занятия не найдены</p>
                  <p className="text-sm">Попробуйте изменить параметры поиска</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredSessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {session.learning_groups?.name || 'Индивидуальное'}
                          </span>
                          <Badge
                            variant="outline"
                            className={getStatusColor(session.status)}
                          >
                            {getStatusLabel(session.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(session.lesson_date), 'd MMMM yyyy', { locale: ru })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.start_time} - {session.end_time}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {session.teacher_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.branch} • {session.classroom}
                          </div>
                        </div>

                        {session.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {session.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Найдено занятий: {filteredSessions.length}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setDateFilter("");
                setTeacherFilter("");
                setBranchFilter("");
              }}
            >
              Сбросить фильтры
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
