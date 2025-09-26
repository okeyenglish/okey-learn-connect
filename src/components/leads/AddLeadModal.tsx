import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateLead, useLeadSources, useLeadStatuses } from '@/hooks/useLeads';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const branches = [
  'Окская',
  'Солнцево',
  'Мытищи',
  'Люберцы',
  'Новокосино',
  'Котельники',
  'Стахановская',
  'Онлайн'
];

const subjects = [
  'Английский',
  'Немецкий',
  'Французский',
  'Испанский',
  'Итальянский',
  'Китайский',
  'Подготовка к ЕГЭ',
  'Подготовка к ОГЭ'
];

const levels = [
  'Beginner',
  'Elementary',
  'Pre-Intermediate',
  'Intermediate',
  'Upper-Intermediate',
  'Advanced',
  'Proficiency'
];

const weekDays = [
  { id: 'monday', label: 'Понедельник' },
  { id: 'tuesday', label: 'Вторник' },
  { id: 'wednesday', label: 'Среда' },
  { id: 'thursday', label: 'Четверг' },
  { id: 'friday', label: 'Пятница' },
  { id: 'saturday', label: 'Суббота' },
  { id: 'sunday', label: 'Воскресенье' },
];

export function AddLeadModal({ open, onOpenChange }: AddLeadModalProps) {
  const { toast } = useToast();
  const { leadSources } = useLeadSources();
  const { leadStatuses } = useLeadStatuses();
  const createLeadMutation = useCreateLead();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    email: '',
    age: '',
    subject: '',
    level: '',
    branch: 'Окская',
    preferred_time: '',
    preferred_days: [] as string[],
    notes: '',
    lead_source_id: '',
    status_id: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim() || !formData.phone.trim()) {
      toast({
        title: "Ошибка",
        description: "Имя и телефон обязательны для заполнения",
        variant: "destructive",
      });
      return;
    }

    try {
      // Выбираем первый статус по умолчанию, если не выбран
      const defaultStatus = leadStatuses.find(s => s.name === 'Новый') || leadStatuses[0];
      
      await createLeadMutation.mutateAsync({
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        status_id: formData.status_id || defaultStatus?.id,
      });

      toast({
        title: "Успешно",
        description: "Лид создан успешно",
      });

      onOpenChange(false);
      setFormData({
        first_name: '',
        last_name: '',
        middle_name: '',
        phone: '',
        email: '',
        age: '',
        subject: '',
        level: '',
        branch: 'Окская',
        preferred_time: '',
        preferred_days: [],
        notes: '',
        lead_source_id: '',
        status_id: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать лид",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferred_days: checked
        ? [...prev.preferred_days, day]
        : prev.preferred_days.filter(d => d !== day)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить лид</DialogTitle>
          <DialogDescription>
            Создание нового лида в системе
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Имя *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Фамилия</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middle_name">Отчество</Label>
              <Input
                id="middle_name"
                value={formData.middle_name}
                onChange={(e) => handleInputChange('middle_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Возраст</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
              />
            </div>
          </div>

          {/* Контакты */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+7 (999) 999-99-99"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>

          {/* Обучение */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Предмет</Label>
              <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Уровень</Label>
              <Select value={formData.level} onValueChange={(value) => handleInputChange('level', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите уровень" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Филиал</Label>
              <Select value={formData.branch} onValueChange={(value) => handleInputChange('branch', value)}>
                <SelectTrigger>
                  <SelectValue />
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
          </div>

          {/* Предпочитаемое время */}
          <div className="space-y-2">
            <Label htmlFor="preferred_time">Предпочитаемое время</Label>
            <Input
              id="preferred_time"
              value={formData.preferred_time}
              onChange={(e) => handleInputChange('preferred_time', e.target.value)}
              placeholder="Например: утром, вечером, 18:00-20:00"
            />
          </div>

          {/* Предпочитаемые дни */}
          <div className="space-y-2">
            <Label>Предпочитаемые дни недели</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {weekDays.map((day) => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.id}
                    checked={formData.preferred_days.includes(day.id)}
                    onCheckedChange={(checked) => handleDayToggle(day.id, !!checked)}
                  />
                  <Label htmlFor={day.id} className="text-sm">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Статус и источник */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Источник лида</Label>
              <Select value={formData.lead_source_id} onValueChange={(value) => handleInputChange('lead_source_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите источник" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={formData.status_id} onValueChange={(value) => handleInputChange('status_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {leadStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* UTM метки */}
          <div className="space-y-2">
            <Label>UTM метки (для аналитики)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="UTM Source"
                value={formData.utm_source}
                onChange={(e) => handleInputChange('utm_source', e.target.value)}
              />
              <Input
                placeholder="UTM Medium"
                value={formData.utm_medium}
                onChange={(e) => handleInputChange('utm_medium', e.target.value)}
              />
              <Input
                placeholder="UTM Campaign"
                value={formData.utm_campaign}
                onChange={(e) => handleInputChange('utm_campaign', e.target.value)}
              />
              <Input
                placeholder="UTM Term"
                value={formData.utm_term}
                onChange={(e) => handleInputChange('utm_term', e.target.value)}
              />
            </div>
          </div>

          {/* Заметки */}
          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Дополнительная информация о лиде..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createLeadMutation.isPending}>
              {createLeadMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Создать лид
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}