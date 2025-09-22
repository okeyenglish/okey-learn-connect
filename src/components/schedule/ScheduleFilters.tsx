import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import { SessionFilters } from "@/hooks/useLessonSessions";
import { useTeachers } from "@/hooks/useTeachers";
import { getBranchesForSelect } from "@/lib/branches";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ScheduleFiltersProps {
  filters: SessionFilters;
  onFiltersChange: (filters: SessionFilters) => void;
  onReset: () => void;
}

export const ScheduleFilters = ({ filters, onFiltersChange, onReset }: ScheduleFiltersProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { teachers } = useTeachers({});
  const branches = getBranchesForSelect();
  
  const statusLegend = [
    { color: "bg-cyan-100 text-cyan-800 border-cyan-200", label: "Текущие занятия" },
    { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Занятия закончатся в течение недели" },
    { color: "bg-green-100 text-green-800 border-green-200", label: "Занятия начнутся в ближайшее время" },
    { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Нет преподавателя" },
    { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Преподаватель работает в другом месте" },
    { color: "bg-black text-white border-black", label: "Пропуск" }
  ];

  const updateFilter = (key: keyof SessionFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Фильтр</h3>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Status Legend */}
          <div className="mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {statusLegend.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className={`${item.color} text-xs`}>
                    ●
                  </Badge>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Филиал</Label>
                <Select 
                  value={filters.branch || ""} 
                  onValueChange={(value) => updateFilter("branch", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все филиалы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все филиалы</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.value} value={branch.label}>
                        {branch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Преподаватель</Label>
                <Select
                  value={filters.teacher || ""}
                  onValueChange={(value) => updateFilter('teacher', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все преподаватели" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все преподаватели</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={`${teacher.first_name} ${teacher.last_name}`.trim()}>
                        {`${teacher.first_name} ${teacher.last_name}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Дата от</Label>
                <Input
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) => updateFilter('date_from', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Дата до</Label>
                <Input
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) => updateFilter('date_to', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Формат</Label>
                <Select defaultValue="day-time-teacher">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day-time-teacher">День/Время/Преподаватель</SelectItem>
                    <SelectItem value="teacher-time">Преподаватель/Время</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Сетка</Label>
                <Select defaultValue="auto">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Автоматически</SelectItem>
                    <SelectItem value="manual">Вручную</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="week-mode" />
                <Label htmlFor="week-mode" className="text-sm">
                  Режим недели
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="merge-columns"
                />
                <Label htmlFor="merge-columns" className="text-sm">
                  Объединённые столбцы
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="rotate" />
                <Label htmlFor="rotate" className="text-sm">
                  Повернуть
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Искать
              </Button>
              <Button type="button" variant="outline" onClick={onReset} className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Сбросить
              </Button>
              <Button type="button" variant="outline" className="ml-auto">
                По найденным: экспорт в xls
              </Button>
              <Button type="button" variant="outline">
                Поиск занятий
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};