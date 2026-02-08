import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  Loader2, 
  Copy, 
  Check,
  Send,
  MessageCircle,
  ChevronDown,
  X,
  QrCode
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/typedClient";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { getErrorMessage } from '@/lib/errorUtils';
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { SalaryConfigSection, SalaryConfig, getDefaultSalaryConfig } from './SalaryConfigSection';

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeCreated?: (invitationId: string) => void;
}

// Позиции сотрудников по умолчанию с маппингом на роли
const DEFAULT_POSITIONS = [
  { value: 'manager', label: 'Менеджер', role: 'manager' },
  { value: 'methodist', label: 'Методист', role: 'methodist' },
  { value: 'branch_manager', label: 'Управляющий', role: 'branch_manager' },
  { value: 'teacher', label: 'Преподаватель', role: 'teacher' },
  { value: 'accountant', label: 'Бухгалтер', role: 'accountant' },
  { value: 'receptionist', label: 'Администратор', role: 'receptionist' },
  { value: 'sales_manager', label: 'Менеджер по продажам', role: 'sales_manager' },
  { value: 'head_teacher', label: 'Старший преподаватель', role: 'head_teacher' },
];

interface InvitationResult {
  id: string;
  invite_token: string;
  first_name: string;
  phone: string | null;
}

// Форматирование телефона: +7 (999) 123-45-67
const formatPhoneNumber = (value: string): string => {
  // Убираем всё кроме цифр
  const digits = value.replace(/\D/g, '');
  
  // Ограничиваем 11 цифрами (7 + 10 цифр номера)
  const limited = digits.slice(0, 11);
  
  // Если начинается с 8, заменяем на 7
  const normalized = limited.startsWith('8') ? '7' + limited.slice(1) : limited;
  
  // Форматируем
  if (normalized.length === 0) return '';
  if (normalized.length <= 1) return `+${normalized}`;
  if (normalized.length <= 4) return `+${normalized.slice(0, 1)} (${normalized.slice(1)}`;
  if (normalized.length <= 7) return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4)}`;
  if (normalized.length <= 9) return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7)}`;
  return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`;
};

// Валидация телефона (теперь разрешает пустое значение)
const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  const digits = phone.replace(/\D/g, '');
  
  // Пустой телефон - допустимо
  if (digits.length === 0) {
    return { valid: true };
  }
  
  if (digits.length < 11) {
    return { valid: false, error: 'Номер телефона должен содержать 11 цифр' };
  }
  
  if (!digits.startsWith('7')) {
    return { valid: false, error: 'Номер должен начинаться с +7' };
  }
  
  return { valid: true };
};

// Нормализация для хранения: +79991234567
const normalizePhone = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;
  return digits.startsWith('7') ? `+${digits}` : `+7${digits}`;
};

export const AddEmployeeModal = ({ 
  open, 
  onOpenChange, 
  onEmployeeCreated 
}: AddEmployeeModalProps) => {
  const { profile } = useAuth();
  const { branches, organizationId } = useOrganization();
  
  const [step, setStep] = useState<'form' | 'share'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitation, setInvitation] = useState<InvitationResult | null>(null);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [branchesError, setBranchesError] = useState<string | undefined>();
  
  const [formData, setFormData] = useState({
    firstName: '',
    phone: '',
    branches: [] as string[],
    position: 'manager'
  });
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(getDefaultSalaryConfig());

  const baseUrl = window.location.origin;
  const inviteLink = invitation 
    ? `${baseUrl}/employee/onboarding/${invitation.invite_token}`
    : '';

  const hasPhone = invitation?.phone && invitation.phone.length > 0;

  // Обработчик ввода телефона с автоформатированием
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    
    // Валидация при вводе
    if (formatted) {
      const validation = validatePhone(formatted);
      setPhoneError(validation.valid ? undefined : validation.error);
    } else {
      setPhoneError(undefined);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация обязательных полей
    if (!formData.firstName.trim()) {
      toast.error("Введите имя сотрудника");
      return;
    }

    if (formData.branches.length === 0) {
      setBranchesError("Выберите хотя бы один филиал");
      toast.error("Выберите хотя бы один филиал");
      return;
    }

    if (!formData.position) {
      toast.error("Выберите должность");
      return;
    }

    // Валидация телефона (если введён)
    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error);
        toast.error(phoneValidation.error || "Некорректный номер телефона");
        return;
      }
    }

    if (!organizationId) {
      toast.error("Организация не найдена");
      return;
    }

    setIsLoading(true);
    
    try {
      // Нормализуем телефон перед сохранением (может быть null)
      const normalizedPhone = normalizePhone(formData.phone);
      
      const { data, error } = await (supabase
        .from('employee_invitations' as any)
        .insert({
          organization_id: organizationId,
          first_name: formData.firstName.trim(),
          phone: normalizedPhone,
          branch: formData.branches.join(', '),
          position: formData.position,
          created_by: profile?.id,
          // Salary config
          salary_type: salaryConfig.salaryType,
          base_salary: salaryConfig.baseSalary ? Number(salaryConfig.baseSalary) : null,
          salary_start_date: salaryConfig.salaryStartDate 
            ? format(salaryConfig.salaryStartDate, 'yyyy-MM-dd') 
            : null,
          daily_rate: salaryConfig.dailyRate ? Number(salaryConfig.dailyRate) : null,
          work_days: salaryConfig.workDays,
        })
        .select('id, invite_token, first_name, phone')
        .single() as any);

      if (error) throw error;

      setInvitation(data as InvitationResult);
      setStep('share');
      toast.success("Приглашение создано");
      onEmployeeCreated?.(data.id);
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error("Ошибка: " + getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const handleSendWhatsApp = () => {
    if (!invitation?.phone) return;
    const message = encodeURIComponent(
      `Здравствуйте, ${invitation?.first_name}! Вы приглашены в команду. Пройдите по ссылке для заполнения анкеты: ${inviteLink}`
    );
    const phone = invitation?.phone?.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSendTelegram = () => {
    const message = encodeURIComponent(
      `Здравствуйте, ${invitation?.first_name}! Вы приглашены в команду. Пройдите по ссылке для заполнения анкеты: ${inviteLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${message}`, '_blank');
  };

  const handleClose = () => {
    setStep('form');
    setFormData({ firstName: '', phone: '', branches: [], position: 'manager' });
    setSalaryConfig(getDefaultSalaryConfig());
    setInvitation(null);
    setCopied(false);
    setPhoneError(undefined);
    setBranchesError(undefined);
    setBranchesOpen(false);
    onOpenChange(false);
  };

  const handleBranchToggle = (branchName: string) => {
    setFormData(prev => ({
      ...prev,
      branches: prev.branches.includes(branchName)
        ? prev.branches.filter(b => b !== branchName)
        : [...prev.branches, branchName]
    }));
    setBranchesError(undefined);
  };

  const handleRemoveBranch = (branchName: string) => {
    setFormData(prev => ({
      ...prev,
      branches: prev.branches.filter(b => b !== branchName)
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {step === 'form' ? 'Добавить сотрудника' : 'Отправить приглашение'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
            <form onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Введите имя"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                className={phoneError ? "border-destructive" : ""}
              />
              {phoneError && (
                <p className="text-xs text-destructive">{phoneError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Если не указан, сотрудник заполнит его при регистрации
              </p>
            </div>

            <div className="space-y-2">
              <Label>Филиалы *</Label>
              <Popover open={branchesOpen} onOpenChange={setBranchesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={branchesOpen}
                    className={`w-full justify-between font-normal ${branchesError ? "border-destructive" : ""}`}
                  >
                    {formData.branches.length === 0 
                      ? "Выберите филиалы"
                      : `Выбрано: ${formData.branches.length}`
                    }
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]" 
                  align="start"
                  sideOffset={4}
                >
                  <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-1">
                      {branches.map((branch) => (
                        <div
                          key={branch.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => handleBranchToggle(branch.name)}
                        >
                          <Checkbox
                            checked={formData.branches.includes(branch.name)}
                            onCheckedChange={() => handleBranchToggle(branch.name)}
                          />
                          <span className="text-sm">{branch.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              {branchesError && (
                <p className="text-xs text-destructive">{branchesError}</p>
              )}
              {formData.branches.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.branches.map((branchName) => (
                    <Badge key={branchName} variant="secondary" className="gap-1">
                      {branchName}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveBranch(branchName)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Должность *</Label>
              <Select 
                value={formData.position} 
                onValueChange={(v) => handleInputChange('position', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите должность" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Configuration */}
            <SalaryConfigSection 
              config={salaryConfig} 
              onChange={setSalaryConfig} 
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={handleClose}
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
                    Создание...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Создать
                  </>
                )}
              </Button>
            </div>
          </form>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Приглашение для <strong>{invitation?.first_name}</strong> создано. 
              {hasPhone 
                ? " Отправьте ссылку сотруднику для заполнения анкеты."
                : " Покажите QR-код или передайте ссылку сотруднику для регистрации."
              }
            </p>

            {/* QR-код - показываем всегда, но акцентируем если нет телефона */}
            <div className={`flex flex-col items-center p-4 rounded-lg ${!hasPhone ? 'bg-primary/5 border-2 border-primary/20' : 'bg-muted/50'}`}>
              <QRCodeSVG 
                value={inviteLink} 
                size={180}
                level="M"
                includeMargin
                className="rounded-lg"
              />
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <QrCode className="h-3 w-3" />
                Отсканируйте для регистрации
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input 
                value={inviteLink} 
                readOnly 
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            {/* Кнопки мессенджеров - только если есть телефон */}
            {hasPhone && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleSendWhatsApp}
                  className="gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendTelegram}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Telegram
                </Button>
              </div>
            )}

            {!hasPhone && (
              <p className="text-xs text-center text-muted-foreground bg-muted/50 p-2 rounded">
                💡 Телефон не указан — сотрудник заполнит его при регистрации
              </p>
            )}

            <Button 
              className="w-full" 
              onClick={handleClose}
            >
              Готово
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
