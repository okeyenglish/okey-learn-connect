import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/typedClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GraduationCap, Loader2, Search, UserCheck, UserPlus, Users, ArrowLeft } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { normalizePhone, formatPhoneForDisplay } from '@/utils/phoneNormalization';
import { useTeachers, getTeacherFullName } from '@/hooks/useTeachers';
import type { Teacher } from '@/hooks/useTeachers';

interface ConvertToTeacherModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  onSuccess?: (teacherId: string) => void;
}

type ModalMode = 'loading' | 'check' | 'form' | 'select';

export function ConvertToTeacherModal({
  open,
  onClose,
  clientId,
  clientName,
  clientPhone,
  clientEmail,
  onSuccess,
}: ConvertToTeacherModalProps) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ModalMode>('loading');
  const [matchedTeacher, setMatchedTeacher] = useState<Teacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Parse name into first/last
  const nameParts = clientName.trim().split(/\s+/);
  const defaultFirstName = nameParts[0] || '';
  const defaultLastName = nameParts.slice(1).join(' ') || '';
  
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(clientPhone || '');
  const [email, setEmail] = useState(clientEmail || '');
  const [telegramId, setTelegramId] = useState<string>('');
  const [maxUserId, setMaxUserId] = useState<string>('');

  
  // Store client data for migration
  const [clientData, setClientData] = useState<{
    telegram_user_id?: string;
    telegram_chat_id?: string;
    max_user_id?: string;
    max_chat_id?: string;
  }>({});

  // Fetch all teachers for search mode
  const { teachers: allTeachers } = useTeachers({ includeInactive: false });

  // Filter teachers by search query
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return allTeachers;
    const q = teacherSearch.toLowerCase();
    const digitCount = (teacherSearch.match(/\d/g) || []).length;
    
    return allTeachers.filter(t => {
      const fullName = getTeacherFullName(t).toLowerCase();
      if (fullName.includes(q)) return true;
      // Search by phone only if 3+ digits in query
      if (digitCount >= 3 && t.phone) {
        const tPhone = t.phone.replace(/\D/g, '');
        return tPhone.includes(teacherSearch.replace(/\D/g, ''));
      }
      return false;
    });
  }, [allTeachers, teacherSearch]);

  // Reset form and fetch client data when modal opens
  useEffect(() => {
    if (open) {
      setMode('loading');
      setMatchedTeacher(null);
      setSelectedTeacher(null);
      setTeacherSearch('');
      
      const parts = clientName.trim().split(/\s+/);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      
      const fetchClientData = async () => {
        // Fetch client data with all messenger IDs
        const { data: client } = await supabase
          .from('clients')
          .select('phone, email, telegram_user_id, telegram_chat_id, max_user_id, max_chat_id')
          .eq('id', clientId)
          .maybeSingle();
        
        // Also fetch primary phone from client_phone_numbers
        const { data: phoneNumbers } = await supabase
          .from('client_phone_numbers')
          .select('phone')
          .eq('client_id', clientId)
          .eq('is_primary', true)
          .maybeSingle();
        
        // Determine best phone: props > client_phone_numbers.phone > clients.phone
        const rawPhone = clientPhone || phoneNumbers?.phone || client?.phone || '';
        const bestEmail = clientEmail || client?.email || '';
        
        const normalizedPhone = normalizePhone(rawPhone);
        const displayPhone = normalizedPhone ? formatPhoneForDisplay(normalizedPhone) || `+${normalizedPhone}` : '';
        
        setPhone(displayPhone);
        setEmail(bestEmail);
        setTelegramId(client?.telegram_user_id || '');
        setMaxUserId(client?.max_user_id || '');
        
        setClientData({
          telegram_user_id: client?.telegram_user_id,
          telegram_chat_id: client?.telegram_chat_id,
          max_user_id: client?.max_user_id,
          max_chat_id: client?.max_chat_id,
        });

        // Check for existing teacher by phone
        if (normalizedPhone && normalizedPhone.length >= 10) {
          const last10 = normalizedPhone.slice(-10);
          const { data: existingTeachers } = await supabase
            .from('teachers')
            .select('*')
            .eq('organization_id', organizationId!)
            .not('phone', 'is', null);

          const match = existingTeachers?.find(t => {
            const tPhone = t.phone?.replace(/\D/g, '') || '';
            return tPhone.length >= 10 && tPhone.slice(-10) === last10;
          });

          if (match) {
            setMatchedTeacher(match as Teacher);
            setMode('check');
            return;
          }
        }
        
        // No match — go straight to form
        setMode('form');
      };
      fetchClientData();
    }
  }, [open, clientId, clientName, clientPhone, clientEmail, organizationId]);

  const handleConvertWithTeacher = async (existingTeacherId: string) => {
    if (!organizationId) {
      toast.error('Организация не найдена');
      return;
    }

    setIsLoading(true);
    try {
      // Update existing teacher with messenger IDs if missing
      const updateData: Record<string, string | null> = {};
      if (clientData.telegram_user_id) updateData.telegram_user_id = clientData.telegram_user_id;
      if (clientData.telegram_chat_id) updateData.telegram_chat_id = clientData.telegram_chat_id;
      if (clientData.max_user_id) updateData.max_user_id = clientData.max_user_id;
      if (clientData.max_chat_id) updateData.max_chat_id = clientData.max_chat_id;
      
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('teachers')
          .update(updateData)
          .eq('id', existingTeacherId);
      }

      // Migrate messages
      // @ts-ignore - teacher_id column exists in self-hosted schema
      const { error: migrateError, count: migratedCount } = await (supabase
        .from('chat_messages') as any)
        .update({ teacher_id: existingTeacherId, client_id: null })
        .eq('client_id', clientId);

      if (migrateError) throw new Error('Не удалось перенести историю сообщений');

      // Clear messenger IDs from client BEFORE deletion to prevent webhook conflicts
      await supabase
        .from('clients')
        .update({
          max_chat_id: null,
          max_user_id: null,
          telegram_user_id: null,
          telegram_chat_id: null,
        })
        .eq('id', clientId);

      // Also clear from client_phone_numbers
      await supabase
        .from('client_phone_numbers')
        .update({
          max_chat_id: null,
          max_user_id: null,
          telegram_user_id: null,
          telegram_chat_id: null,
          whatsapp_chat_id: null,
          is_whatsapp_enabled: false,
        })
        .eq('client_id', clientId);

      // Delete client
      const { error: deleteClientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (deleteClientError) {
        await supabase.from('clients').update({ is_active: false }).eq('id', clientId);
      }

      await supabase.from('teacher_client_links').delete().eq('client_id', clientId);

      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-client-links'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });

      toast.success('Привязано к существующему преподавателю', {
        description: `Перенесено ${migratedCount || 0} сообщений`,
      });

      onSuccess?.(existingTeacherId);
      onClose();
    } catch (error) {
      console.error('Error converting to teacher:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertNew = async () => {
    if (!firstName.trim()) {
      toast.error('Введите имя преподавателя');
      return;
    }
    if (!organizationId) {
      toast.error('Организация не найдена');
      return;
    }

    setIsLoading(true);
    try {
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim() || '',
          phone: phone.trim() || null,
          email: email.trim() || null,
          organization_id: organizationId,
          is_active: true,
          telegram_user_id: clientData.telegram_user_id || null,
          telegram_chat_id: clientData.telegram_chat_id || null,
          max_user_id: clientData.max_user_id || null,
          max_chat_id: clientData.max_chat_id || null,
        })
        .select('id')
        .single();

      if (teacherError) throw new Error('Не удалось создать преподавателя');

      // @ts-ignore
      const { error: migrateError, count: migratedCount } = await (supabase
        .from('chat_messages') as any)
        .update({ teacher_id: teacherData.id, client_id: null })
        .eq('client_id', clientId);

      if (migrateError) throw new Error('Не удалось перенести историю сообщений');

      // Clear messenger IDs from client BEFORE deletion to prevent webhook conflicts
      await supabase
        .from('clients')
        .update({
          max_chat_id: null,
          max_user_id: null,
          telegram_user_id: null,
          telegram_chat_id: null,
        })
        .eq('id', clientId);

      await supabase
        .from('client_phone_numbers')
        .update({
          max_chat_id: null,
          max_user_id: null,
          telegram_user_id: null,
          telegram_chat_id: null,
          whatsapp_chat_id: null,
          is_whatsapp_enabled: false,
        })
        .eq('client_id', clientId);

      const { error: deleteClientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (deleteClientError) {
        await supabase.from('clients').update({ is_active: false }).eq('id', clientId);
      }

      await supabase.from('teacher_client_links').delete().eq('client_id', clientId);

      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-client-links'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });

      toast.success(`${firstName} ${lastName} теперь преподаватель`, {
        description: `Перенесено ${migratedCount || 0} сообщений`,
      });

      onSuccess?.(teacherData.id);
      onClose();
    } catch (error) {
      console.error('Error converting to teacher:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCheckStep = () => {
    if (!matchedTeacher) return null;
    const teacherName = getTeacherFullName(matchedTeacher);
    const teacherPhone = matchedTeacher.phone ? formatPhoneForDisplay(matchedTeacher.phone) || matchedTeacher.phone : 'нет телефона';

    return (
      <div className="space-y-4 py-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
            Найден преподаватель с таким же телефоном:
          </p>
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <p className="font-semibold">{teacherName}</p>
            <p>{teacherPhone}</p>
            {matchedTeacher.email && <p>{matchedTeacher.email}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => handleConvertWithTeacher(matchedTeacher.id)}
            disabled={isLoading}
          >
            <UserCheck className="mr-2 h-4 w-4 text-green-600" />
            Склеить с существующим
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => setMode('form')}
            disabled={isLoading}
          >
            <UserPlus className="mr-2 h-4 w-4 text-blue-600" />
            Создать нового преподавателя
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => setMode('select')}
            disabled={isLoading}
          >
            <Users className="mr-2 h-4 w-4 text-purple-600" />
            Выбрать другого преподавателя
          </Button>
        </div>
      </div>
    );
  };

  const renderSelectStep = () => (
    <div className="space-y-4 py-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={teacherSearch}
          onChange={(e) => setTeacherSearch(e.target.value)}
          placeholder="Поиск по имени или телефону..."
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="max-h-60 overflow-y-auto rounded-md border">
        {filteredTeachers.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Преподаватели не найдены</p>
        ) : (
          filteredTeachers.map(teacher => {
            const isSelected = selectedTeacher?.id === teacher.id;
            return (
              <button
                key={teacher.id}
                className={`w-full text-left px-4 py-3 text-sm border-b last:border-b-0 hover:bg-accent transition-colors ${
                  isSelected ? 'bg-accent' : ''
                }`}
                onClick={() => setSelectedTeacher(teacher)}
              >
                <p className="font-medium">{getTeacherFullName(teacher)}</p>
                <p className="text-xs text-muted-foreground">
                  {teacher.phone ? formatPhoneForDisplay(teacher.phone) || teacher.phone : 'нет телефона'}
                  {teacher.email ? ` · ${teacher.email}` : ''}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderFormStep = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Имя *</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Имя" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Фамилия</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Фамилия" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Телефон</Label>
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com" />
      </div>
      {telegramId && (
        <div className="space-y-2">
          <Label>Telegram ID</Label>
          <Input value={telegramId} readOnly className="bg-muted text-muted-foreground" />
        </div>
      )}
      {maxUserId && (
        <div className="space-y-2">
          <Label>MAX ID</Label>
          <Input value={maxUserId} readOnly className="bg-muted text-muted-foreground" />
        </div>
      )}
    </div>
  );

  const getTitle = () => {
    switch (mode) {
      case 'check': return 'Найден совпадающий преподаватель';
      case 'select': return 'Выберите преподавателя';
      default: return 'Перевести в преподаватели';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'check': return `Клиент "${clientName}" — выберите действие:`;
      case 'select': return 'Выберите преподавателя для склеивания диалогов';
      default: return `Клиент "${clientName}" будет преобразован в преподавателя. Вся история сообщений будет перенесена.`;
    }
  };

  const canGoBack = mode === 'form' || mode === 'select';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {mode === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {mode === 'check' && renderCheckStep()}
        {mode === 'form' && renderFormStep()}
        {mode === 'select' && renderSelectStep()}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canGoBack && matchedTeacher && (
            <Button variant="ghost" size="sm" onClick={() => setMode('check')} disabled={isLoading} className="mr-auto">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Назад
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          {mode === 'form' && (
            <Button onClick={handleConvertNew} disabled={isLoading || !firstName.trim()}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GraduationCap className="mr-2 h-4 w-4" />}
              Создать преподавателя
            </Button>
          )}
          {mode === 'select' && (
            <Button
              onClick={() => selectedTeacher && handleConvertWithTeacher(selectedTeacher.id)}
              disabled={isLoading || !selectedTeacher}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              Склеить с выбранным
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
