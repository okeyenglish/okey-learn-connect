import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";
import { SessionFilters } from "@/hooks/useLessonSessions";
import { useTeachers } from "@/hooks/useTeachers";
import { getBranchesForSelect } from "@/lib/branches";

interface ScheduleFiltersProps {
  filters: SessionFilters;
  onFiltersChange: (filters: SessionFilters) => void;
}

export const ScheduleFilters = ({ filters, onFiltersChange }: ScheduleFiltersProps) => {
  const { teachers } = useTeachers({});
  const branches = getBranchesForSelect();

  const updateFilter = (key: keyof SessionFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== "");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Label className="font-medium">Фильтры</Label>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Очистить
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Филиал</Label>
            <Select
              value={filters.branch || ""}
              onValueChange={(value) => updateFilter('branch', value)}
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
            <Label className="text-sm">Преподаватель</Label>
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
            <Label className="text-sm">Аудитория</Label>
            <Input
              placeholder="Название аудитории"
              value={filters.classroom || ""}
              onChange={(e) => updateFilter('classroom', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Статус</Label>
            <Select
              value={filters.status || ""}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все статусы</SelectItem>
                <SelectItem value="scheduled">Запланировано</SelectItem>
                <SelectItem value="cancelled">Отменено</SelectItem>
                <SelectItem value="completed">Проведено</SelectItem>
                <SelectItem value="rescheduled">Перенесено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Дата от</Label>
            <Input
              type="date"
              value={filters.date_from || ""}
              onChange={(e) => updateFilter('date_from', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Дата до</Label>
            <Input
              type="date"
              value={filters.date_to || ""}
              onChange={(e) => updateFilter('date_to', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};