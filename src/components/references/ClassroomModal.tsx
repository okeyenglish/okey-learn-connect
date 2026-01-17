import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useCreateClassroom, useUpdateClassroom, Classroom } from '@/hooks/useReferences';
import { useOrganization } from '@/hooks/useOrganization';

interface ClassroomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroom?: Classroom | null;
}

export const ClassroomModal: React.FC<ClassroomModalProps> = ({
  open,
  onOpenChange,
  classroom
}) => {
  const { branches } = useOrganization();
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    capacity: 1,
    equipment: [] as string[],
    is_online: false,
    is_active: true,
    notes: ''
  });

  const [newEquipment, setNewEquipment] = useState('');

  const createClassroom = useCreateClassroom();
  const updateClassroom = useUpdateClassroom();

  useEffect(() => {
    if (classroom) {
      setFormData({
        name: classroom.name,
        branch: classroom.branch,
        capacity: classroom.capacity,
        equipment: classroom.equipment || [],
        is_online: classroom.is_online,
        is_active: classroom.is_active,
        notes: classroom.notes || ''
      });
    } else {
      setFormData({
        name: '',
        branch: '',
        capacity: 1,
        equipment: [],
        is_online: false,
        is_active: true,
        notes: ''
      });
    }
  }, [classroom, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (classroom) {
        await updateClassroom.mutateAsync({
          id: classroom.id,
          ...formData
        });
      } else {
        await createClassroom.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving classroom:', error);
    }
  };

  const handleAddEquipment = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newEquipment.trim()) {
      e.preventDefault();
      setFormData({
        ...formData,
        equipment: [...formData.equipment, newEquipment.trim()]
      });
      setNewEquipment('');
    }
  };

  const handleRemoveEquipment = (index: number) => {
    setFormData({
      ...formData,
      equipment: formData.equipment.filter((_, i) => i !== index)
    });
  };

  const isLoading = createClassroom.isPending || updateClassroom.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {classroom ? 'Редактировать аудиторию' : 'Добавить аудиторию'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Название аудитории"
              required
            />
          </div>

          <div>
            <Label htmlFor="branch">Филиал *</Label>
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

          <div>
            <Label htmlFor="capacity">Вместимость *</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
              min="1"
              max="50"
              required
            />
          </div>

          <div>
            <Label htmlFor="equipment">Оборудование</Label>
            <Input
              id="equipment"
              value={newEquipment}
              onChange={(e) => setNewEquipment(e.target.value)}
              onKeyDown={handleAddEquipment}
              placeholder="Введите оборудование и нажмите Enter"
            />
            {formData.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.equipment.map((item, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {item}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => handleRemoveEquipment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительная информация об аудитории"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_online"
                checked={formData.is_online}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_online: !!checked })
                }
              />
              <Label htmlFor="is_online">Онлайн</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_active: !!checked })
                }
              />
              <Label htmlFor="is_active">Активная</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
              disabled={isLoading || !formData.name.trim() || !formData.branch}
            >
              {isLoading ? 'Сохранение...' : (classroom ? 'Обновить' : 'Создать')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};