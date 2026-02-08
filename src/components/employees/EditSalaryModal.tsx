import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/typedClient";
import { getErrorMessage } from '@/lib/errorUtils';
import { SalaryConfigSection, SalaryConfig, getDefaultSalaryConfig } from './SalaryConfigSection';
import { format, parseISO } from 'date-fns';
import { EmployeeInvitation, POSITION_LABELS } from '@/hooks/useEmployeeInvitations';
import { Badge } from '@/components/ui/badge';

interface EditSalaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitation: EmployeeInvitation | null;
  onSaved?: () => void;
}

export const EditSalaryModal = ({ 
  open, 
  onOpenChange, 
  invitation,
  onSaved 
}: EditSalaryModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(getDefaultSalaryConfig());

  // Загружаем текущие настройки при открытии
  useEffect(() => {
    if (open && invitation) {
      loadSalaryConfig();
    }
  }, [open, invitation?.id]);

  const loadSalaryConfig = async () => {
    if (!invitation) return;

    try {
      // Получаем данные из employee_invitations (там хранятся настройки)
      const { data, error } = await (supabase
        .from('employee_invitations' as any)
        .select('salary_type, base_salary, salary_start_date, daily_rate, work_days')
        .eq('id', invitation.id)
        .single() as any);

      if (error) throw error;

      if (data) {
        setSalaryConfig({
          salaryType: data.salary_type || 'monthly',
          baseSalary: data.base_salary?.toString() || '',
          salaryStartDate: data.salary_start_date ? parseISO(data.salary_start_date) : new Date(),
          dailyRate: data.daily_rate?.toString() || '',
          workDays: data.work_days || ['mon', 'tue', 'wed', 'thu', 'fri'],
        });
      }
    } catch (error) {
      console.error('Error loading salary config:', error);
      // Используем дефолтные значения
      setSalaryConfig(getDefaultSalaryConfig());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;

    setIsLoading(true);
    
    try {
      // Обновляем employee_invitations
      const { error: invError } = await (supabase
        .from('employee_invitations' as any)
        .update({
          salary_type: salaryConfig.salaryType,
          base_salary: salaryConfig.baseSalary ? Number(salaryConfig.baseSalary) : null,
          salary_start_date: salaryConfig.salaryStartDate 
            ? format(salaryConfig.salaryStartDate, 'yyyy-MM-dd') 
            : null,
          daily_rate: salaryConfig.dailyRate ? Number(salaryConfig.dailyRate) : null,
          work_days: salaryConfig.workDays,
        })
        .eq('id', invitation.id) as any);

      if (invError) throw invError;

      // Если приглашение принято и есть profile_id - обновляем также профиль
      if (invitation.status === 'accepted' && invitation.profile_id) {
        const { error: profileError } = await (supabase
          .from('profiles' as any)
          .update({
            salary_type: salaryConfig.salaryType,
            base_salary: salaryConfig.baseSalary ? Number(salaryConfig.baseSalary) : null,
            salary_start_date: salaryConfig.salaryStartDate 
              ? format(salaryConfig.salaryStartDate, 'yyyy-MM-dd') 
              : null,
            daily_rate: salaryConfig.dailyRate ? Number(salaryConfig.dailyRate) : null,
            work_days: salaryConfig.workDays,
          })
          .eq('id', invitation.profile_id) as any);

        if (profileError) {
          console.warn('Error updating profile salary:', profileError);
        }
      }

      toast.success("Условия оплаты сохранены");
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving salary config:', error);
      toast.error("Ошибка: " + getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const getSalaryPreview = () => {
    if (salaryConfig.salaryType === 'monthly' && salaryConfig.baseSalary) {
      return `${Number(salaryConfig.baseSalary).toLocaleString('ru-RU')} ₽/мес`;
    }
    if (salaryConfig.salaryType === 'daily' && salaryConfig.dailyRate) {
      const daysCount = salaryConfig.workDays.length;
      const monthlyEstimate = Number(salaryConfig.dailyRate) * daysCount * 4;
      return `~${monthlyEstimate.toLocaleString('ru-RU')} ₽/мес (${Number(salaryConfig.dailyRate).toLocaleString('ru-RU')} ₽/день × ${daysCount} дн.)`;
    }
    return 'Не указано';
  };

  if (!invitation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Условия оплаты
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Информация о сотруднике */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
              {invitation.first_name.charAt(0).toUpperCase()}
              {invitation.last_name?.charAt(0).toUpperCase() || ''}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {invitation.first_name} {invitation.last_name || ''}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{POSITION_LABELS[invitation.position] || invitation.position}</span>
                {invitation.branch && (
                  <>
                    <span>•</span>
                    <span>{invitation.branch}</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant={invitation.status === 'accepted' ? 'default' : 'secondary'}>
              {invitation.status === 'accepted' ? 'Активен' : 'Приглашён'}
            </Badge>
          </div>

          {/* Salary Configuration */}
          <SalaryConfigSection 
            config={salaryConfig} 
            onChange={setSalaryConfig} 
          />

          {/* Preview */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Примерная оплата</div>
            <div className="font-semibold text-primary">{getSalaryPreview()}</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
