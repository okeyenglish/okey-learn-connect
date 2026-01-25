import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Users, Calendar, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLearningGroups, formatSchedule, getStatusColor, getStatusLabel } from "@/hooks/useLearningGroups";
import { GroupsModal } from "./GroupsModal";
import { ScheduleModal } from "@/components/schedule/ScheduleModal";
import { SubscriptionsSection } from "@/components/subscriptions/SubscriptionsSection";
import { GroupsTable } from "./GroupsTable";
import { ExportGroupButton } from "./ExportGroupButton";
import { RecruitmentSection } from "./RecruitmentSection";
import { useUserAllowedBranches } from "@/hooks/useUserAllowedBranches";
import { usePersistedBranch } from "@/hooks/usePersistedBranch";

export const LearningGroupsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { selectedBranch: branchFilter, setSelectedBranch: setBranchFilter } = usePersistedBranch("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  
  const { allowedBranches } = useUserAllowedBranches();

  const filters = {
    search: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : [statusFilter],
    branch: branchFilter === "all" ? undefined : branchFilter,
    subject: subjectFilter === "all" ? undefined : subjectFilter,
  };

  const { groups = [], isLoading } = useLearningGroups(filters);

  const getStatusCounts = () => {
    const counts = { 
      forming: 0, 
      active: 0, 
      completed: 0, 
      on_hold: 0, 
      cancelled: 0 
    };
    groups.forEach(group => {
      counts[group.status as keyof typeof counts]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setBranchFilter("all");
    setSubjectFilter("all");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Загрузка групп...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Группы и расписание</h1>
          <p className="text-muted-foreground">
            Управление учебными группами, расписанием и абонементами
          </p>
        </div>
        <div className="flex gap-2">
          <ExportGroupButton mode="list" groups={groups} />
          <Button onClick={() => setScheduleModalOpen(true)} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Расписание
          </Button>
          <Button onClick={() => setGroupsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Новая группа
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Формируются</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.forming}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Активные</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Завершенные</p>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.completed}</p>
              </div>
              <Users className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">На паузе</p>
                <p className="text-2xl font-bold text-orange-600">{statusCounts.on_hold}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Отмененные</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</p>
              </div>
              <Users className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Группы
          </TabsTrigger>
          <TabsTrigger value="recruitment" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Набор
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Расписание
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Абонементы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          {/* Фильтры */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Фильтры
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Поиск групп..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="forming">Формируется</SelectItem>
                    <SelectItem value="active">Активная</SelectItem>
                    <SelectItem value="completed">Завершенная</SelectItem>
                    <SelectItem value="on_hold">На паузе</SelectItem>
                    <SelectItem value="cancelled">Отмененная</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Филиал" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все филиалы</SelectItem>
                    {allowedBranches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Предмет" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все предметы</SelectItem>
                      <SelectItem value="Английский">Английский</SelectItem>
                      <SelectItem value="Немецкий">Немецкий</SelectItem>
                      <SelectItem value="Французский">Французский</SelectItem>
                      <SelectItem value="Испанский">Испанский</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={resetFilters}>
                    Сбросить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Таблица групп */}
          <GroupsTable groups={groups} isLoading={isLoading} />

          {groups.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Группы не найдены</h3>
                <p className="text-muted-foreground">
                  Измените фильтры или создайте новую группу
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recruitment">
          <RecruitmentSection />
        </TabsContent>

        <TabsContent value="schedule">
          <div className="h-[600px] bg-background border rounded-lg p-6">
            <ScheduleModal open={true} />
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsSection />
        </TabsContent>
      </Tabs>

      {/* Модальные окна */}
      <GroupsModal
        open={groupsModalOpen}
        onOpenChange={setGroupsModalOpen}
      />

      <ScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
      />
    </div>
  );
};