import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ACTIVITY_TYPE_CONFIG, ActivityType } from '@/hooks/useStaffActivityLog';

interface StaffActivityFiltersProps {
  branches: string[];
  availableBranches: string[];
  selectedBranches: string[];
  onBranchChange: (branches: string[]) => void;
  selectedActionTypes: string[];
  onActionTypeChange: (types: string[]) => void;
}

export function StaffActivityFilters({
  availableBranches,
  selectedBranches,
  onBranchChange,
  selectedActionTypes,
  onActionTypeChange,
}: StaffActivityFiltersProps) {
  const actionTypes = Object.entries(ACTIVITY_TYPE_CONFIG) as [ActivityType, { label: string }][];

  const handleBranchSelect = (value: string) => {
    if (value === 'all') {
      onBranchChange(['all']);
    } else {
      const newBranches = selectedBranches.includes('all')
        ? [value]
        : selectedBranches.includes(value)
          ? selectedBranches.filter((b) => b !== value)
          : [...selectedBranches, value];
      
      onBranchChange(newBranches.length === 0 ? ['all'] : newBranches);
    }
  };

  const handleActionTypeSelect = (value: string) => {
    if (value === 'all') {
      onActionTypeChange(['all']);
    } else {
      const newTypes = selectedActionTypes.includes('all')
        ? [value]
        : selectedActionTypes.includes(value)
          ? selectedActionTypes.filter((t) => t !== value)
          : [...selectedActionTypes, value];
      
      onActionTypeChange(newTypes.length === 0 ? ['all'] : newTypes);
    }
  };

  const clearFilters = () => {
    onBranchChange(['all']);
    onActionTypeChange(['all']);
  };

  const hasActiveFilters = 
    !selectedBranches.includes('all') || 
    !selectedActionTypes.includes('all');

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Фильтр по филиалам */}
      <Select onValueChange={handleBranchSelect}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Все филиалы" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все филиалы</SelectItem>
          {availableBranches.map((branch) => (
            <SelectItem key={branch} value={branch}>
              {branch}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Фильтр по типам действий */}
      <Select onValueChange={handleActionTypeSelect}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Все действия" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все действия</SelectItem>
          {actionTypes.map(([type, config]) => (
            <SelectItem key={type} value={type}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Активные фильтры */}
      {!selectedBranches.includes('all') && (
        <div className="flex flex-wrap gap-1">
          {selectedBranches.map((branch) => (
            <Badge key={branch} variant="secondary" className="gap-1">
              {branch}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleBranchSelect(branch)}
              />
            </Badge>
          ))}
        </div>
      )}

      {!selectedActionTypes.includes('all') && (
        <div className="flex flex-wrap gap-1">
          {selectedActionTypes.map((type) => {
            const config = ACTIVITY_TYPE_CONFIG[type as ActivityType];
            return (
              <Badge key={type} variant="secondary" className="gap-1">
                {config?.label || type}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleActionTypeSelect(type)}
                />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Кнопка сброса */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Сбросить
        </Button>
      )}
    </div>
  );
}
