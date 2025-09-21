import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Search, Filter, X } from "lucide-react";
import { GroupFilters } from "@/hooks/useLearningGroups";
import { getBranchesForSelect } from "@/lib/branches";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GroupsFiltersProps {
  filters: GroupFilters;
  onFiltersChange: (filters: GroupFilters) => void;
  onReset: () => void;
}

export const GroupsFilters = ({ filters, onFiltersChange, onReset }: GroupsFiltersProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const branches = getBranchesForSelect();
  const subjects = ["Английский"];
  const levels = [
    "Super Safari 1", "Super Safari 2", "Super Safari 3",
    "Kids Box Starter", "Kids Box 1", "Kids Box 2", "Kids Box 3", "Kids Box 4", "Kids Box 5", "Kids Box 6",
    "Kids Box 3+4", "Kids Box Starter + 1",
    "Prepare 1", "Prepare 2", "Prepare 3", "Prepare 4", "Prepare 5", "Prepare 6",
    "Empower 1", "Empower 2", "Empower 3", "Empower 4", "Empower 5"
  ];
  const types = [
    { value: "general", label: "Группа" },
    { value: "mini", label: "Мини-группа" }
  ];

  const statusOptions = [
    { value: "reserve", label: "Резервные" },
    { value: "forming", label: "Формирующиеся" },
    { value: "active", label: "В работе" },
    { value: "suspended", label: "Приостановленные" },
    { value: "finished", label: "Законченные" }
  ];

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.branch) count++;
    if (filters.subject) count++;
    if (filters.level) count++;
    if (filters.category) count++;
    if (filters.group_type) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.responsible_teacher) count++;
    if (filters.only_with_debt) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Фильтры
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
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
              Наименование
            </Label>
            <Input
              id="search"
              placeholder="Поиск по названию группы..."
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
            <Label>Тип</Label>
            <Select
              value={filters.group_type || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, group_type: value === "all" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {types.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              value={filters.responsible_teacher || ""}
              onChange={(e) => onFiltersChange({ ...filters, responsible_teacher: e.target.value })}
            />
          </div>
        </div>

        {/* Status checkboxes */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Статус групп</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statusOptions.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={status.value}
                  checked={filters.status?.includes(status.value) || false}
                  onCheckedChange={(checked) => handleStatusChange(status.value, checked as boolean)}
                />
                <Label
                  htmlFor={status.value}
                  className="text-sm font-normal cursor-pointer"
                >
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto text-blue-600 hover:text-blue-800">
              {isAdvancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Дополнительные параметры
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="debt"
                checked={filters.only_with_debt || false}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, only_with_debt: checked as boolean })}
              />
              <Label htmlFor="debt" className="text-sm font-normal cursor-pointer">
                Только с задолженностью
              </Label>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};