import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateInternalChat } from '@/hooks/useInternalChats';
import { useEmployees } from '@/hooks/useEmployees';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  open,
  onOpenChange
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    chat_type: 'group',
    branch: '',
    participant_user_ids: [] as string[]
  });

  const { data: employees } = useEmployees();
  const createChat = useCreateInternalChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createChat.mutateAsync(formData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      chat_type: 'group',
      branch: '',
      participant_user_ids: []
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleParticipantToggle = (userId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      participant_user_ids: checked
        ? [...prev.participant_user_ids, userId]
        : prev.participant_user_ids.filter(id => id !== userId)
    }));
  };

  const branches = [
    'Окская',
    'Котельники',
    'Люберцы (Красная горка)',
    'Люберцы (Октябрьский)',
    'Мытищи',
    'Новокосино',
    'Солнцево',
    'Стахановская',
    'Онлайн'
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать внутренний чат</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название чата *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название чата"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Краткое описание чата"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="chat_type">Тип чата</Label>
            <Select
              value={formData.chat_type}
              onValueChange={(value) => setFormData({ ...formData, chat_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Групповой</SelectItem>
                <SelectItem value="department">Отдел</SelectItem>
                <SelectItem value="branch">Филиал</SelectItem>
                <SelectItem value="management">Руководство</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
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
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {employees && employees.length > 0 && (
            <div>
              <Label>Участники</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={employee.id}
                      checked={formData.participant_user_ids.includes(employee.id)}
                      onCheckedChange={(checked) => 
                        handleParticipantToggle(employee.id, !!checked)
                      }
                    />
                    <Label htmlFor={employee.id} className="text-sm cursor-pointer">
                      {employee.first_name} {employee.last_name} 
                      {employee.email && ` (${employee.email})`}
                      {employee.branch && (
                        <span className="text-muted-foreground ml-1">
                          - {employee.branch}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={createChat.isPending || !formData.name.trim()}
            >
              {createChat.isPending ? 'Создание...' : 'Создать чат'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};