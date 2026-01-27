import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/typedClient";
import { Loader2, GraduationCap, Save, X, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/hooks/useOrganization';
import { getErrorMessage } from '@/lib/errorUtils';
import type { Teacher } from '@/integrations/supabase/database.types';

interface EditTeacherModalProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
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

// Нормализация телефона для сохранения
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    return '+7' + digits.slice(1);
  }
  return digits.length > 0 ? '+' + digits : '';
};

// Предустановленные предметы и категории
const SUBJECTS = ['Английский', 'Немецкий', 'Французский', 'Китайский', 'Испанский', 'Арабский', 'Турецкий', 'Корейский', 'Японский'];
const CATEGORIES = ['Дошкольники', 'Школьники 1-4 класс', 'Школьники 5-8 класс', 'Школьники 9-11 класс', 'Взрослые', 'Корпоративные'];

export const EditTeacherModal: React.FC<EditTeacherModalProps> = ({
  teacher,
  open,
  onOpenChange,
  onUpdated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { branches } = useOrganization();
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    branch: '',
    subjects: [] as string[],
    categories: [] as string[],
    isActive: true,
  });

  // Заполнение формы при открытии
  useEffect(() => {
    if (teacher && open) {
      setFormData({
        firstName: teacher.first_name || '',
        lastName: teacher.last_name || '',
        phone: teacher.phone ? formatPhoneNumber(teacher.phone) : '',
        email: teacher.email || '',
        branch: teacher.branch || '',
        subjects: teacher.subjects || [],
        categories: teacher.categories || [],
        isActive: teacher.is_active !== false,
      });
    }
  }, [teacher, open]);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  }, []);

  const handleAddSubject = (subject: string) => {
    if (subject && !formData.subjects.includes(subject)) {
      setFormData(prev => ({ ...prev, subjects: [...prev.subjects, subject] }));
    }
    setNewSubject('');
  };

  const handleRemoveSubject = (subject: string) => {
    setFormData(prev => ({ 
      ...prev, 
      subjects: prev.subjects.filter(s => s !== subject) 
    }));
  };

  const handleAddCategory = (category: string) => {
    if (category && !formData.categories.includes(category)) {
      setFormData(prev => ({ ...prev, categories: [...prev.categories, category] }));
    }
    setNewCategory('');
  };

  const handleRemoveCategory = (category: string) => {
    setFormData(prev => ({ 
      ...prev, 
      categories: prev.categories.filter(c => c !== category) 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName || null,
          phone: formData.phone ? normalizePhone(formData.phone) : null,
          email: formData.email || null,
          branch: formData.branch || null,
          subjects: formData.subjects,
          categories: formData.categories,
          is_active: formData.isActive,
        })
        .eq('id', teacher.id);

      if (error) throw error;

      toast.success('Данные преподавателя обновлены');
      onOpenChange(false);
      onUpdated?.();
    } catch (error: unknown) {
      console.error('Error updating teacher:', error);
      toast.error('Ошибка: ' + getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!teacher) return;
    
    const newActiveState = !formData.isActive;
    setFormData(prev => ({ ...prev, isActive: newActiveState }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GraduationCap className="h-5 w-5 text-primary" />
            Редактирование преподавателя
          </DialogTitle>
          <DialogDescription>
            Измените данные преподавателя и нажмите «Сохранить»
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Имя и Фамилия */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя *</Label>
              <Input
                id="firstName"
                placeholder="Имя"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                placeholder="Фамилия"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          {/* Телефон и Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={formData.phone}
                onChange={handlePhoneChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Филиал */}
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
                <SelectItem value="">Не выбран</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Предметы */}
          <div className="space-y-2">
            <Label>Предметы</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.subjects.map((subject) => (
                <Badge key={subject} variant="secondary" className="gap-1">
                  {subject}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(subject)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newSubject} onValueChange={handleAddSubject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Добавить предмет" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.filter(s => !formData.subjects.includes(s)).map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Категории */}
          <div className="space-y-2">
            <Label>Возрастные категории</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.categories.map((category) => (
                <Badge key={category} variant="outline" className="gap-1">
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newCategory} onValueChange={handleAddCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Добавить категорию" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => !formData.categories.includes(c)).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Статус активности */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div>
              <Label htmlFor="isActive" className="font-medium">Статус преподавателя</Label>
              <p className="text-sm text-muted-foreground">
                {formData.isActive 
                  ? 'Преподаватель активен и отображается в списках' 
                  : 'Преподаватель деактивирован'
                }
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={handleToggleActive}
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Сохранить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
