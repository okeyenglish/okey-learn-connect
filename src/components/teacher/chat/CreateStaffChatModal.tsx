import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Teacher } from '@/hooks/useTeachers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateStaffChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher;
}

export const CreateStaffChatModal = ({ open, onOpenChange, teacher }: CreateStaffChatModalProps) => {
  const [chatName, setChatName] = useState('');
  const [role, setRole] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createChatMutation = useMutation({
    mutationFn: async () => {
      if (!chatName.trim() || !role) {
        throw new Error('Заполните все поля');
      }

      const { error } = await supabase
        .from('clients')
        .insert([{
          name: `${role} - ${chatName} (преп. ${teacher.last_name})`,
          phone: '-',
          branch: teacher.branch,
          notes: `Чат с преподавателем ${teacher.last_name} ${teacher.first_name}`
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-staff-chats'] });
      toast({
        title: 'Чат создан',
        description: 'Новый чат успешно создан'
      });
      setChatName('');
      setRole('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать чат',
        variant: 'destructive'
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать новый чат</DialogTitle>
          <DialogDescription>
            Создайте чат с коллегой или учеником
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Менеджер">Менеджер</SelectItem>
                <SelectItem value="Методист">Методист</SelectItem>
                <SelectItem value="Управляющий">Управляющий</SelectItem>
                <SelectItem value="Ученик">Ученик</SelectItem>
                <SelectItem value="Коллега">Коллега</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatName">Имя собеседника</Label>
            <Input
              id="chatName"
              placeholder="Введите имя"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            onClick={() => createChatMutation.mutate()}
            disabled={createChatMutation.isPending || !chatName.trim() || !role}
          >
            {createChatMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};