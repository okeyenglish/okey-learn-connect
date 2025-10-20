import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { StudentFilters } from '@/hooks/useStudentsWithFilters';

interface AdvancedFiltersProps {
  filters: StudentFilters;
  onFiltersChange: (filters: StudentFilters) => void;
}

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<StudentFilters>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleReset = () => {
    const resetFilters: StudentFilters = {
      searchTerm: filters.searchTerm,
      branch: filters.branch,
      status: filters.status,
      level: filters.level,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    setOpen(false);
  };

  const activeFiltersCount = [
    localFilters.ageMin,
    localFilters.ageMax,
    localFilters.hasDebt,
    localFilters.hasParent,
    localFilters.createdFrom,
    localFilters.createdTo,
  ].filter(f => f !== undefined && f !== null && f !== '').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Дополнительные фильтры
          {activeFiltersCount > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Дополнительные фильтры</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          {/* Возраст */}
          <div className="space-y-2">
            <Label>Возраст</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder="От"
                  value={localFilters.ageMin || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      ageMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="До"
                  value={localFilters.ageMax || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      ageMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Дата создания */}
          <div className="space-y-2">
            <Label>Дата добавления</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.createdFrom
                      ? format(new Date(localFilters.createdFrom), 'dd MMM yyyy', { locale: ru })
                      : 'От'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.createdFrom ? new Date(localFilters.createdFrom) : undefined}
                    onSelect={(date) =>
                      setLocalFilters({
                        ...localFilters,
                        createdFrom: date ? date.toISOString() : undefined,
                      })
                    }
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.createdTo
                      ? format(new Date(localFilters.createdTo), 'dd MMM yyyy', { locale: ru })
                      : 'До'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.createdTo ? new Date(localFilters.createdTo) : undefined}
                    onSelect={(date) =>
                      setLocalFilters({
                        ...localFilters,
                        createdTo: date ? date.toISOString() : undefined,
                      })
                    }
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Задолженность */}
          <div className="flex items-center justify-between">
            <Label htmlFor="has-debt" className="cursor-pointer">
              Только с задолженностью
            </Label>
            <Switch
              id="has-debt"
              checked={localFilters.hasDebt || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, hasDebt: checked })
              }
            />
          </div>

          {/* Привязка к родителям */}
          <div className="flex items-center justify-between">
            <Label htmlFor="has-parent" className="cursor-pointer">
              Только с привязкой к родителям
            </Label>
            <Switch
              id="has-parent"
              checked={localFilters.hasParent || false}
              onCheckedChange={(checked) =>
                setLocalFilters({ ...localFilters, hasParent: checked })
              }
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Применить
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
