import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, RotateCcw, Calendar, Filter } from "lucide-react";
import { ScheduleFilters } from "@/hooks/useScheduleData";
import { useTeachers } from "@/hooks/useTeachers";
import { getBranchesForSelect } from "@/lib/branches";

interface AdvancedScheduleFiltersProps {
  filters: ScheduleFilters;
  onFiltersChange: (filters: ScheduleFilters) => void;
  onReset: () => void;
  viewFormat: string;
  onViewFormatChange: (format: string) => void;
  gridSettings: {
    timeStep: string;
    weekMode: boolean;
    mergedColumns: boolean;
    rotated: boolean;
  };
  onGridSettingsChange: (settings: any) => void;
  scheduleType: 'teachers' | 'classrooms' | 'monthly' | 'student';
}

export const AdvancedScheduleFilters = ({
  filters,
  onFiltersChange,
  onReset,
  viewFormat,
  onViewFormatChange,
  gridSettings,
  onGridSettingsChange,
  scheduleType
}: AdvancedScheduleFiltersProps) => {
  const { teachers } = useTeachers({});
  const branches = getBranchesForSelect();

  const updateFilter = (key: keyof ScheduleFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const updateGridSetting = (key: string, value: any) => {
    onGridSettingsChange({
      ...gridSettings,
      [key]: value
    });
  };

  const formatOptions = scheduleType === 'teachers' 
    ? [
        { value: 'day-time-teacher', label: 'День/Время/Преподаватель' },
        { value: 'teacher-time', label: 'Преподаватель/Время' }
      ]
    : [
        { value: 'day-time-classroom', label: 'День/Время/Аудитория' },
        { value: 'classroom-time', label: 'Аудитория/Время' }
      ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Фильтры
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Branch Selection */}
        <div className="space-y-2">
          <Label htmlFor="branch" className="text-sm font-medium">Филиал</Label>
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

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Период с</Label>
            <Input
              type="date"
              value={filters.date_from || ""}
              onChange={(e) => updateFilter('date_from', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Период до</Label>
            <Input
              type="date"
              value={filters.date_to || ""}
              onChange={(e) => updateFilter('date_to', e.target.value)}
            />
          </div>
        </div>

        {/* Secondary Date Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">
            Период выборки (дополнительный)
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              placeholder="с"
              className="text-sm"
            />
            <Input
              type="date"
              placeholder="до"
              className="text-sm"
            />
          </div>
        </div>

        {/* Teacher Filter (for teacher view) */}
        {scheduleType === 'teachers' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Преподаватель</Label>
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
        )}

        {/* Format Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Формат</Label>
          <Select value={viewFormat} onValueChange={onViewFormatChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid Settings */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Сетка</Label>
          <Select 
            value={gridSettings.timeStep} 
            onValueChange={(value) => updateGridSetting('timeStep', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Автоматически</SelectItem>
              <SelectItem value="schedules">По графикам</SelectItem>
              <SelectItem value="30min">30 минут</SelectItem>
              <SelectItem value="1hour">1 час</SelectItem>
              <SelectItem value="2hours">2 часа</SelectItem>
              <SelectItem value="3hours">3 часа</SelectItem>
              <SelectItem value="4hours">4 часа</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Additional Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Дополнительные настройки</Label>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="week-mode" 
              checked={gridSettings.weekMode}
              onCheckedChange={(checked) => updateGridSetting('weekMode', checked)}
            />
            <Label htmlFor="week-mode" className="text-sm">
              Режим недели
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="merge-columns"
              checked={gridSettings.mergedColumns}
              onCheckedChange={(checked) => updateGridSetting('mergedColumns', checked)}
            />
            <Label htmlFor="merge-columns" className="text-sm">
              Объединённые столбцы
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="rotate" 
              checked={gridSettings.rotated}
              onCheckedChange={(checked) => updateGridSetting('rotated', checked)}
            />
            <Label htmlFor="rotate" className="text-sm">
              Повернуть
            </Label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={() => console.log('Searching with filters:', filters)}
          >
            <Search className="h-4 w-4 mr-2" />
            Искать
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Сбросить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};