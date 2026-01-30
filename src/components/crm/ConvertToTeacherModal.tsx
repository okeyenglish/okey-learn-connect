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

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const parts = clientName.trim().split(/\s+/);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setPhone(clientPhone || '');
      setEmail(clientEmail || '');
    }
  }, [open, clientName, clientPhone, clientEmail]);

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
          // Link to existing teacher instead of creating duplicate
          const { error: linkError } = await supabase
            .from('teacher_client_links')
            .upsert({
              teacher_id: matchingTeacher.id,
              client_id: clientId,
              organization_id: organizationId,
              link_type: 'merged',
            }, {
              onConflict: 'teacher_id,client_id',
            });

          if (linkError) {
            console.error('Error linking to existing teacher:', linkError);
          }

          queryClient.invalidateQueries({ queryKey: ['teachers'] });
          queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
          queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
          queryClient.invalidateQueries({ queryKey: ['teacher-client-links'] });

          toast.success(`Привязано к существующему преподавателю: ${matchingTeacher.first_name} ${matchingTeacher.last_name || ''}`.trim(), {
            description: 'Найден преподаватель с таким же номером телефона',
          });

          onSuccess?.();
          onClose();
          setIsLoading(false);
          return;
        }
      }

      // 1. Create teacher record (no duplicate found)
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim() || '', // NOT NULL на self-hosted
          phone: phone.trim() || null,
          email: email.trim() || null,
          organization_id: organizationId,
          is_active: true,
        })
        .select('id')
        .single();

      if (teacherError) {
        console.error('Error creating teacher:', teacherError);
        throw new Error('Не удалось создать преподавателя');
      }

      // 2. Create teacher_client_links entry for proper chat association
      const { error: linkError } = await supabase
        .from('teacher_client_links')
        .upsert({
          teacher_id: teacherData.id,
          client_id: clientId,
          organization_id: organizationId,
          link_type: 'converted',
        }, {
          onConflict: 'teacher_id,client_id',
        });

      if (linkError) {
        console.error('Error creating teacher-client link:', linkError);
        // Non-critical, continue
      }

      // 3. Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-client-links'] });

      toast.success(`${firstName} ${lastName} теперь преподаватель`, {
        description: 'Чат перемещён в раздел "Преподаватели"',
      });

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
            Клиент "{clientName}" будет преобразован в преподавателя. Вся история сообщений сохранится.
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={handleConvert} disabled={isLoading || !firstName.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создаём...
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
