import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserPlus, 
  Loader2, 
  Copy, 
  Check,
  Send,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/typedClient";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { getErrorMessage } from '@/lib/errorUtils';

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
  phone: string;
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

// Валидация телефона
const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) {
    return { valid: false, error: 'Введите номер телефона' };
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
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
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
  
  const [formData, setFormData] = useState({
    firstName: '',
    phone: '',
    branch: '',
    position: 'manager'
  });

  const baseUrl = window.location.origin;
  const inviteLink = invitation 
    ? `${baseUrl}/employee/onboarding/${invitation.invite_token}`
    : '';

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
    
    if (!formData.firstName.trim()) {
      toast.error("Введите имя сотрудника");
      return;
    }

    // Валидация телефона
    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error);
      toast.error(phoneValidation.error || "Некорректный номер телефона");
      return;
    }

    if (!organizationId) {
      toast.error("Организация не найдена");
      return;
    }

    setIsLoading(true);
    
    try {
      // Нормализуем телефон перед сохранением
      const normalizedPhone = normalizePhone(formData.phone);
      
      const { data, error } = await supabase
        .from('employee_invitations')
        .insert({
          organization_id: organizationId,
          first_name: formData.firstName.trim(),
          phone: normalizedPhone,
          branch: formData.branch || null,
          position: formData.position,
          created_by: profile?.id
        })
        .select('id, invite_token, first_name, phone')
        .single();

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
    setFormData({ firstName: '', phone: '', branch: '', position: 'manager' });
    setInvitation(null);
    setCopied(false);
    setPhoneError(undefined);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {step === 'form' ? 'Добавить сотрудника' : 'Отправить приглашение'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                className={phoneError ? "border-destructive" : ""}
                required
              />
              {phoneError && (
                <p className="text-xs text-destructive">{phoneError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Филиал</Label>
              <Select 
                value={formData.branch} 
                onValueChange={(v) => handleInputChange('branch', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите филиал" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Приглашение для <strong>{invitation?.first_name}</strong> создано. 
              Отправьте ссылку сотруднику для заполнения анкеты.
            </p>

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
