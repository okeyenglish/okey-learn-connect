import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Wallet, Clock } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type SalaryType = 'monthly' | 'daily';

export interface SalaryConfig {
  salaryType: SalaryType;
  baseSalary: string;
  salaryStartDate: Date | undefined;
  dailyRate: string;
  workDays: string[];
}

interface SalaryConfigSectionProps {
  config: SalaryConfig;
  onChange: (config: SalaryConfig) => void;
}

const WORK_DAYS = [
  { value: 'mon', label: 'Пн' },
  { value: 'tue', label: 'Вт' },
  { value: 'wed', label: 'Ср' },
  { value: 'thu', label: 'Чт' },
  { value: 'fri', label: 'Пт' },
  { value: 'sat', label: 'Сб' },
  { value: 'sun', label: 'Вс' },
];

export const SalaryConfigSection = ({ config, onChange }: SalaryConfigSectionProps) => {
  const handleTypeChange = (value: SalaryType) => {
    onChange({ ...config, salaryType: value });
  };

  const handleBaseSalaryChange = (value: string) => {
    // Только цифры
    const cleaned = value.replace(/\D/g, '');
    onChange({ ...config, baseSalary: cleaned });
  };

  const handleDailyRateChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    onChange({ ...config, dailyRate: cleaned });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    onChange({ ...config, salaryStartDate: date });
  };

  const handleWorkDayToggle = (day: string) => {
    const newDays = config.workDays.includes(day)
      ? config.workDays.filter(d => d !== day)
      : [...config.workDays, day];
    onChange({ ...config, workDays: newDays });
  };

  const formatSalary = (value: string) => {
    if (!value) return '';
    return Number(value).toLocaleString('ru-RU');
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wallet className="h-4 w-4 text-primary" />
        Настройки оплаты
      </div>

      {/* Тип оплаты */}
      <RadioGroup
        value={config.salaryType}
        onValueChange={(v) => handleTypeChange(v as SalaryType)}
        className="grid grid-cols-2 gap-4"
      >
        <Label
          htmlFor="salary-monthly"
          className={cn(
            "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
            config.salaryType === 'monthly' 
              ? "border-primary bg-primary/5" 
              : "border-border hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value="monthly" id="salary-monthly" />
          <div className="flex-1">
            <div className="font-medium">Оклад</div>
            <div className="text-xs text-muted-foreground">Фиксированная сумма в месяц</div>
          </div>
        </Label>
        
        <Label
          htmlFor="salary-daily"
          className={cn(
            "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
            config.salaryType === 'daily' 
              ? "border-primary bg-primary/5" 
              : "border-border hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value="daily" id="salary-daily" />
          <div className="flex-1">
            <div className="font-medium">За день</div>
            <div className="text-xs text-muted-foreground">Оплата за рабочие дни</div>
          </div>
        </Label>
      </RadioGroup>

      {/* Дата начала */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Дата начала работы
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !config.salaryStartDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {config.salaryStartDate 
                ? format(config.salaryStartDate, "d MMMM yyyy", { locale: ru })
                : "Выберите дату"
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={config.salaryStartDate}
              onSelect={handleStartDateChange}
              initialFocus
              locale={ru}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Оклад за первый месяц будет рассчитан пропорционально
        </p>
      </div>

      {/* Поля для оклада */}
      {config.salaryType === 'monthly' && (
        <div className="space-y-2">
          <Label htmlFor="baseSalary">Оклад (₽/месяц)</Label>
          <div className="relative">
            <Input
              id="baseSalary"
              value={formatSalary(config.baseSalary)}
              onChange={(e) => handleBaseSalaryChange(e.target.value)}
              placeholder="50 000"
              className="pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
          </div>
        </div>
      )}

      {/* Поля для оплаты за день */}
      {config.salaryType === 'daily' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="dailyRate">Ставка за день (₽)</Label>
            <div className="relative">
              <Input
                id="dailyRate"
                value={formatSalary(config.dailyRate)}
                onChange={(e) => handleDailyRateChange(e.target.value)}
                placeholder="2 500"
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Рабочие дни</Label>
            <div className="flex flex-wrap gap-2">
              {WORK_DAYS.map((day) => (
                <label
                  key={day.value}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-colors text-sm font-medium border",
                    config.workDays.includes(day.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  )}
                >
                  <Checkbox
                    checked={config.workDays.includes(day.value)}
                    onCheckedChange={() => handleWorkDayToggle(day.value)}
                    className="sr-only"
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Выберите дни, в которые сотрудник будет работать
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export const getDefaultSalaryConfig = (): SalaryConfig => ({
  salaryType: 'monthly',
  baseSalary: '',
  salaryStartDate: new Date(),
  dailyRate: '',
  workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
});
