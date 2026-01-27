import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/typedClient";
import { Loader2, Plus, Link2, Copy, Check, MessageCircle, Send, GraduationCap, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/hooks/useOrganization';
import { getErrorMessage } from '@/lib/errorUtils';
import { normalizePhone } from '@/utils/phoneNormalization';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface AddTeacherModalProps {
  onTeacherAdded?: () => void;
  children?: React.ReactNode;
}

interface InvitationResult {
  id: string;
  invite_token: string;
  first_name: string;
  phone: string | null;
}

// Форматирование телефона: +7 (999) 123-45-67
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 11);
  const normalized = limited.startsWith('8') ? '7' + limited.slice(1) : limited;
  
  if (normalized.length === 0) return '';
  if (normalized.length <= 1) return `+${normalized}`;
  if (normalized.length <= 4) return `+${normalized.slice(0, 1)} (${normalized.slice(1)}`;
  if (normalized.length <= 7) return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4)}`;
  if (normalized.length <= 9) return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7)}`;
  return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`;
};

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ onTeacherAdded, children }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'share'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitation, setInvitation] = useState<InvitationResult | null>(null);
  const { toast } = useToast();
  const { branches, organizationId } = useOrganization();
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    branch: '',
    subjects: [] as string[],
    categories: [] as string[],
  });

  const baseUrl = window.location.origin;
  const inviteLink = invitation 
    ? `${baseUrl}/teacher/onboarding/${invitation.invite_token}`
    : '';

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  }, []);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      branch: '',
      subjects: [],
      categories: [],
    });
    setStep('form');
    setInvitation(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 0. Проверяем существующий профиль по email или телефону для автопривязки
      let existingProfileId: string | null = null;
      
      if (formData.email || formData.phone) {
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id, email, phone')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (existingProfiles) {
          // Ищем совпадение по email
          if (formData.email) {
            const emailMatch = existingProfiles.find(
              p => p.email?.toLowerCase() === formData.email.toLowerCase()
            );
            if (emailMatch) {
              existingProfileId = emailMatch.id;
            }
          }
          
          // Ищем совпадение по телефону если не нашли по email
          if (!existingProfileId && formData.phone) {
            const normalizedPhone = normalizePhone(formData.phone);
            const phoneMatch = existingProfiles.find(
              p => p.phone && normalizePhone(p.phone) === normalizedPhone
            );
            if (phoneMatch) {
              existingProfileId = phoneMatch.id;
            }
          }
        }
      }

      // Если нашли существующий профиль - привязываем без создания приглашения
      if (existingProfileId) {
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .insert({
            profile_id: existingProfileId,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone ? normalizePhone(formData.phone) : null,
            branch: formData.branch,
            subjects: formData.subjects,
            categories: formData.categories,
            is_active: true,
          })
          .select('id')
          .single();

        if (teacherError) throw teacherError;

        // Добавляем роль teacher если её нет
        await supabase
          .from('user_roles')
          .upsert({
            user_id: existingProfileId,
            role: 'teacher',
          }, { onConflict: 'user_id,role' });

        toast({
          title: 'Преподаватель создан',
          description: (
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-green-500" />
              <span>Автоматически привязан к существующему профилю</span>
            </div>
          ),
        });

        resetForm();
        setOpen(false);
        onTeacherAdded?.();
      } else {
        // 1. Создаём запись преподавателя БЕЗ profile_id
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .insert({
            first_name: formData.firstName,
            last_name: formData.lastName || null,
            email: formData.email || null,
            phone: formData.phone ? normalizePhone(formData.phone) : null,
            branch: formData.branch || null,
            subjects: formData.subjects,
            categories: formData.categories,
            is_active: true,
            profile_id: null, // Будет заполнено при онбординге
          })
          .select('id')
          .single();

        if (teacherError) throw teacherError;

        // 2. Создаём приглашение с magic link
        const { data: inviteData, error: inviteError } = await (supabase
          .from('teacher_invitations' as any)
          .insert({
            organization_id: organizationId,
            teacher_id: teacher.id,
            first_name: formData.firstName,
            last_name: formData.lastName || null,
            phone: formData.phone ? normalizePhone(formData.phone) : null,
            email: formData.email || null,
            branch: formData.branch || null,
            subjects: formData.subjects,
            categories: formData.categories,
            created_by: profile?.id,
          })
          .select('id, invite_token, first_name, phone')
          .single() as any);

        if (inviteError) throw inviteError;

        setInvitation(inviteData as InvitationResult);
        setStep('share');
        
        toast({
          title: 'Преподаватель создан',
          description: 'Отправьте ссылку для завершения регистрации',
        });
        
        onTeacherAdded?.();
      }
    } catch (error: unknown) {
      console.error('Error creating teacher:', error);
      toast({
        title: 'Ошибка',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: 'Ссылка скопирована' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Не удалось скопировать', variant: 'destructive' });
    }
  };

  const handleSendWhatsApp = () => {
    const message = encodeURIComponent(
      `Здравствуйте, ${invitation?.first_name}! Вы приглашены как преподаватель. Пройдите по ссылке для завершения регистрации: ${inviteLink}`
    );
    const phone = invitation?.phone?.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSendTelegram = () => {
    const message = encodeURIComponent(
      `Здравствуйте, ${invitation?.first_name}! Вы приглашены как преподаватель. Пройдите по ссылке для завершения регистрации: ${inviteLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${message}`, '_blank');
  };

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GraduationCap className="h-5 w-5 text-primary" />
            {step === 'form' ? 'Добавить преподавателя' : 'Отправить приглашение'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя *</Label>
              <Input
                id="firstName"
                placeholder="Введите имя"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                placeholder="Введите фамилию (заполнит сам преподаватель)"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={formData.phone}
                onChange={handlePhoneChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Используется для отправки приглашения
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@example.com (опционально)"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Если указан, система проверит существующий аккаунт
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Филиал</Label>
              <Select
                value={formData.branch}
                onValueChange={(value) => setFormData({ ...formData, branch: value })}
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

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <UserPlus className="mr-2 h-4 w-4" />
                Создать
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Приглашение для <strong>{invitation?.first_name}</strong> создано. 
              Отправьте ссылку преподавателю для завершения регистрации.
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

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Что произойдёт дальше:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                <li>Преподаватель откроет ссылку</li>
                <li>Заполнит свои данные и создаст пароль</li>
                <li>Автоматически получит доступ к системе</li>
              </ul>
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
