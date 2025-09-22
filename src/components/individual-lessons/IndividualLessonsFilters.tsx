import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Search, Filter, X } from "lucide-react";
import { IndividualLessonFilters } from "@/hooks/useIndividualLessons";
import { getBranchesForSelect } from "@/lib/branches";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface IndividualLessonsFiltersProps {
  filters: IndividualLessonFilters;
  onFiltersChange: (filters: IndividualLessonFilters) => void;
  onReset: () => void;
}

export const IndividualLessonsFilters = ({ filters, onFiltersChange, onReset }: IndividualLessonsFiltersProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const branches = getBranchesForSelect();
  const subjects = ["Английский", "Немецкий", "Французский"];
  const levels = [
    "Super Safari 1", "Super Safari 2", "Super Safari 3",
    "Kids Box Starter", "Kids Box 1", "Kids Box 2", "Kids Box 3", "Kids Box 4", "Kids Box 5", "Kids Box 6",
    "Prepare 1", "Prepare 2", "Prepare 3", "Prepare 4", "Prepare 5", "Prepare 6",
    "Empower 1", "Empower 2", "Empower 3", "Empower 4", "Empower 5",
    "Focus 4", "Школьная программа", "Немецкий"
  ];

  const locations = [
    { value: "office", label: "В офисе" },
    { value: "skype", label: "По Skype" },
    { value: "home", label: "На дому" }
  ];

  const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.branch) count++;
    if (filters.subject) count++;
    if (filters.level) count++;
    if (filters.category) count++;
    if (filters.teacher_name) count++;
    if (filters.lesson_location) count++;
    if (filters.is_skype_only) count++;
    if (filters.has_debt) count++;
    if (filters.period_start) count++;
    if (filters.period_end) count++;
    if (filters.schedule_days && filters.schedule_days.length > 0) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const toggleDay = (day: string) => {
    const currentDays = filters.schedule_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    onFiltersChange({ ...filters, schedule_days: newDays.length > 0 ? newDays : undefined });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-green-600" />
            Фильтр
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="h-4 w-4 mr-1" />
              Сбросить
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              Поиск
            </Label>
            <Input
              id="search"
              placeholder="Поиск по имени ученика или преподавателя..."
              value={filters.search || ""}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Филиал</Label>
            <Select
              value={filters.branch || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, branch: value === "all" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все филиалы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все филиалы</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.value} value={branch.label}>
                    {branch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Дисциплина</Label>
            <Select
              value={filters.subject || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, subject: value === "all" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все дисциплины" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все дисциплины</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Уровень</Label>
            <Select
              value={filters.level || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, level: value === "all" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все уровни" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">Все уровни</SelectItem>
                {levels.map(level => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Преподаватель</Label>
            <Input
              placeholder="Имя преподавателя..."
              value={filters.teacher_name || ""}
              onChange={(e) => onFiltersChange({ ...filters, teacher_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Тип</Label>
            <Select
              value={filters.lesson_location || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, lesson_location: value === "all" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Period Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Период занятий:</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                type="date"
                value={filters.period_start || ""}
                onChange={(e) => onFiltersChange({ ...filters, period_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">до</span>
                <Input
                  type="date"
                  value={filters.period_end || ""}
                  onChange={(e) => onFiltersChange({ ...filters, period_end: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto text-green-600 hover:text-green-800">
              {isAdvancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Дополнительные параметры
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Days Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Дни занятий:</Label>
              <div className="flex gap-2 flex-wrap">
                {days.map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={filters.schedule_days?.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day)}
                    className={filters.schedule_days?.includes(day) ? "bg-green-600 text-white" : ""}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Время занятий:</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    type="time"
                    value={filters.time_start || ""}
                    onChange={(e) => onFiltersChange({ ...filters, time_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">до</span>
                    <Input
                      type="time"
                      value={filters.time_end || ""}
                      onChange={(e) => onFiltersChange({ ...filters, time_end: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skype"
                  checked={filters.is_skype_only || false}
                  onCheckedChange={(checked) => onFiltersChange({ ...filters, is_skype_only: checked as boolean })}
                />
                <Label htmlFor="skype" className="text-sm font-normal cursor-pointer">
                  Только занимающиеся по Skype
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="debt"
                  checked={filters.has_debt || false}
                  onCheckedChange={(checked) => onFiltersChange({ ...filters, has_debt: checked as boolean })}
                />
                <Label htmlFor="debt" className="text-sm font-normal cursor-pointer">
                  Только с задолженностью
                </Label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};