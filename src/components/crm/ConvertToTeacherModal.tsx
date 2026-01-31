import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/typedClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { normalizePhone, formatPhoneForDisplay } from '@/utils/phoneNormalization';

interface ConvertToTeacherModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  onSuccess?: () => void;
}

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

  // Parse name into first/last
  const nameParts = clientName.trim().split(/\s+/);
  const defaultFirstName = nameParts[0] || '';
  const defaultLastName = nameParts.slice(1).join(' ') || '';
  
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(clientPhone || '');
  const [email, setEmail] = useState(clientEmail || '');
  const [telegramId, setTelegramId] = useState<string>('');
  const [whatsappId, setWhatsappId] = useState<string>('');
  const [maxUserId, setMaxUserId] = useState<string>('');
  
  // Store client data for migration
  const [clientData, setClientData] = useState<{
    telegram_user_id?: string;
    telegram_chat_id?: string;
    whatsapp_id?: string;
    whatsapp_chat_id?: string;
    max_user_id?: string;
    max_chat_id?: string;
  }>({});

  // Reset form and fetch client data when modal opens
  useEffect(() => {
    if (open) {
      const parts = clientName.trim().split(/\s+/);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      
      // Fetch client data from database (including phone numbers table)
      const fetchClientData = async () => {
        // Fetch client data with all messenger IDs
        const { data: client } = await supabase
          .from('clients')
          .select('phone, email, telegram_user_id, telegram_chat_id, whatsapp_id, whatsapp_chat_id, max_user_id, max_chat_id')
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
        
        // Normalize phone - add +7 to 10-digit Russian numbers
        const normalizedPhone = normalizePhone(rawPhone);
        const displayPhone = normalizedPhone ? formatPhoneForDisplay(normalizedPhone) || `+${normalizedPhone}` : '';
        
        setPhone(displayPhone);
        setEmail(bestEmail);
        setTelegramId(client?.telegram_user_id || '');
        setWhatsappId(client?.whatsapp_id || client?.whatsapp_chat_id || '');
        setMaxUserId(client?.max_user_id || '');
        
        // Store all messenger data for migration
        setClientData({
          telegram_user_id: client?.telegram_user_id,
          telegram_chat_id: client?.telegram_chat_id,
          whatsapp_id: client?.whatsapp_id,
          whatsapp_chat_id: client?.whatsapp_chat_id,
          max_user_id: client?.max_user_id,
          max_chat_id: client?.max_chat_id,
        });
      };
      fetchClientData();
    }
  }, [open, clientId, clientName, clientPhone, clientEmail]);

  const handleConvert = async () => {
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
      const normalizedPhone = phone.trim().replace(/\D/g, '');
      let teacherId: string | null = null;
      let isExistingTeacher = false;
      
      // Check for existing teacher with same phone
      if (normalizedPhone.length >= 10) {
        const last10Digits = normalizedPhone.slice(-10);
        const { data: existingTeachers } = await supabase
          .from('teachers')
          .select('id, first_name, last_name, phone')
          .eq('organization_id', organizationId)
          .not('phone', 'is', null);
        
        const matchingTeacher = existingTeachers?.find(t => {
          const tPhone = t.phone?.replace(/\D/g, '') || '';
          return tPhone.length >= 10 && tPhone.slice(-10) === last10Digits;
        });
        
        if (matchingTeacher) {
          teacherId = matchingTeacher.id;
          isExistingTeacher = true;
          console.log('[ConvertToTeacherModal] Found existing teacher:', teacherId);
        }
      }

      // Create new teacher if not found
      if (!teacherId) {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .insert({
            first_name: firstName.trim(),
            last_name: lastName.trim() || '', // NOT NULL на self-hosted
            phone: phone.trim() || null,
            email: email.trim() || null,
            organization_id: organizationId,
            is_active: true,
            // Copy messenger IDs to teacher
            telegram_user_id: clientData.telegram_user_id || null,
            telegram_chat_id: clientData.telegram_chat_id || null,
            whatsapp_id: clientData.whatsapp_id || clientData.whatsapp_chat_id || null,
            max_user_id: clientData.max_user_id || null,
            max_chat_id: clientData.max_chat_id || null,
          })
          .select('id')
          .single();

        if (teacherError) {
          console.error('Error creating teacher:', teacherError);
          throw new Error('Не удалось создать преподавателя');
        }
        
        teacherId = teacherData.id;
        console.log('[ConvertToTeacherModal] Created new teacher:', teacherId);
      } else {
        // Update existing teacher with messenger IDs if missing
        const updateData: Record<string, string | null> = {};
        if (clientData.telegram_user_id) updateData.telegram_user_id = clientData.telegram_user_id;
        if (clientData.telegram_chat_id) updateData.telegram_chat_id = clientData.telegram_chat_id;
        if (clientData.whatsapp_id || clientData.whatsapp_chat_id) {
          updateData.whatsapp_id = clientData.whatsapp_id || clientData.whatsapp_chat_id || null;
        }
        if (clientData.max_user_id) updateData.max_user_id = clientData.max_user_id;
        if (clientData.max_chat_id) updateData.max_chat_id = clientData.max_chat_id;
        
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('teachers')
            .update(updateData)
            .eq('id', teacherId);
          console.log('[ConvertToTeacherModal] Updated teacher messenger IDs');
        }
      }

      // CRITICAL: Migrate all messages from client_id to teacher_id
      // @ts-ignore - teacher_id column exists in self-hosted schema
      const { error: migrateError, count: migratedCount } = await (supabase
        .from('chat_messages') as any)
        .update({ 
          teacher_id: teacherId, 
          client_id: null 
        })
        .eq('client_id', clientId);

      if (migrateError) {
        console.error('Error migrating messages:', migrateError);
        throw new Error('Не удалось перенести историю сообщений');
      }
      
      console.log(`[ConvertToTeacherModal] Migrated ${migratedCount || 0} messages to teacher ${teacherId}`);

      // Delete the client record (no longer needed)
      const { error: deleteClientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (deleteClientError) {
        console.warn('Error deleting client (may have foreign keys):', deleteClientError);
        // Fallback: deactivate instead of delete
        await supabase
          .from('clients')
          .update({ is_active: false })
          .eq('id', clientId);
      } else {
        console.log('[ConvertToTeacherModal] Deleted client record:', clientId);
      }

      // Delete any existing teacher_client_links (legacy cleanup)
      await supabase
        .from('teacher_client_links')
        .delete()
        .eq('client_id', clientId);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-client-links'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });

      toast.success(
        isExistingTeacher 
          ? `Привязано к существующему преподавателю` 
          : `${firstName} ${lastName} теперь преподаватель`,
        {
          description: `Перенесено ${migratedCount || 0} сообщений`,
        }
      );

      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error converting to teacher:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            Перевести в преподаватели
          </DialogTitle>
          <DialogDescription>
            Клиент "{clientName}" будет преобразован в преподавателя. Вся история сообщений будет перенесена.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
            />
          </div>

          {telegramId && (
            <div className="space-y-2">
              <Label htmlFor="telegramId">Telegram ID</Label>
              <Input
                id="telegramId"
                value={telegramId}
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>
          )}
          
          {whatsappId && (
            <div className="space-y-2">
              <Label htmlFor="whatsappId">WhatsApp ID</Label>
              <Input
                id="whatsappId"
                value={whatsappId}
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>
          )}
          
          {maxUserId && (
            <div className="space-y-2">
              <Label htmlFor="maxUserId">MAX ID</Label>
              <Input
                id="maxUserId"
                value={maxUserId}
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={handleConvert} disabled={isLoading || !firstName.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Переносим...
              </>
            ) : (
              <>
                <GraduationCap className="mr-2 h-4 w-4" />
                Сделать преподавателем
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
