import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateSubscription } from "@/hooks/useSubscriptions";
import { useStudents } from "@/hooks/useStudents";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

interface AddSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddSubscriptionModal = ({ open, onOpenChange }: AddSubscriptionModalProps) => {
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    subscription_type: "per_lesson" as "per_lesson" | "monthly" | "weekly",
    total_lessons: 0,
    remaining_lessons: 0,
    total_price: 0,
    price_per_lesson: 0,
    start_date: "",
    valid_until: "",
    branch: "",
    subject: "Английский язык",
    level: "",
    freeze_enabled: false,
    auto_charge: false,
    notes: "",
  });

  const createSubscription = useCreateSubscription();
  const { students, isLoading } = useStudents();
  const { data: subscriptionPlans = [] } = useSubscriptionPlans();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createSubscription.mutateAsync({
        ...formData,
        remaining_lessons: formData.subscription_type === 'per_lesson' ? formData.total_lessons : null,
        status: 'active' as const,
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      name: "",
      subscription_type: "per_lesson" as "per_lesson" | "monthly" | "weekly",
      total_lessons: 0,
      remaining_lessons: 0,
      total_price: 0,
      price_per_lesson: 0,
      start_date: "",
      valid_until: "",
      branch: "",
      subject: "Английский язык",
      level: "",
      freeze_enabled: false,
      auto_charge: false,
      notes: "",
    });
  };

  const handlePlanSelect = (planId: string) => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    if (plan) {
      setFormData(prev => ({
        ...prev,
        name: plan.name,
        subscription_type: plan.subscription_type,
        total_lessons: plan.lessons_count || 0,
        remaining_lessons: plan.lessons_count || 0,
        total_price: plan.price,
        price_per_lesson: plan.price_per_lesson || 0,
        branch: plan.branch || prev.branch,
        subject: plan.subject || prev.subject,
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать абонемент</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_id">Студент *</Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, student_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите студента" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan_id">Тарифный план (опционально)</Label>
              <Select onValueChange={handlePlanSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите план" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price}₽
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Название абонемента *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Название абонемента"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subscription_type">Тип абонемента *</Label>
              <Select
                value={formData.subscription_type}
                onValueChange={(value: "per_lesson" | "monthly" | "weekly") => 
                  setFormData(prev => ({ ...prev, subscription_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_lesson">Поурочный</SelectItem>
                  <SelectItem value="monthly">Помесячный</SelectItem>
                  <SelectItem value="weekly">Понедельный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Филиал *</Label>
              <Select
                value={formData.branch}
                onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите филиал" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Мытищи">Мытищи</SelectItem>
                  <SelectItem value="Люберцы-1">Люберцы-1</SelectItem>
                  <SelectItem value="Люберцы-2">Люберцы-2</SelectItem>
                  <SelectItem value="Котельники">Котельники</SelectItem>
                  <SelectItem value="Новокосино">Новокосино</SelectItem>
                  <SelectItem value="Солнцево">Солнцево</SelectItem>
                  <SelectItem value="Стахановская">Стахановская</SelectItem>
                  <SelectItem value="Окская">Окская</SelectItem>
                  <SelectItem value="Онлайн">Онлайн</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.subscription_type === 'per_lesson' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_lessons">Количество уроков *</Label>
                <Input
                  id="total_lessons"
                  type="number"
                  value={formData.total_lessons}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    total_lessons: parseInt(e.target.value) || 0,
                    remaining_lessons: parseInt(e.target.value) || 0
                  }))}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_per_lesson">Цена за урок</Label>
                <Input
                  id="price_per_lesson"
                  type="number"
                  value={formData.price_per_lesson}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_per_lesson: parseFloat(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_price">Общая стоимость *</Label>
              <Input
                id="total_price"
                type="number"
                value={formData.total_price}
                onChange={(e) => setFormData(prev => ({ ...prev, total_price: parseFloat(e.target.value) || 0 }))}
                min="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Дата начала *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Предмет</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Предмет"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Уровень</Label>
              <Input
                id="level"
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                placeholder="Уровень"
              />
            </div>
          </div>

          {(formData.subscription_type === 'monthly' || formData.subscription_type === 'weekly') && (
            <div className="space-y-2">
              <Label htmlFor="valid_until">Действителен до</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="freeze_enabled"
                checked={formData.freeze_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, freeze_enabled: !!checked }))}
              />
              <Label htmlFor="freeze_enabled">Разрешить заморозку</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_charge"
                checked={formData.auto_charge}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_charge: !!checked }))}
              />
              <Label htmlFor="auto_charge">Автоматическое списание</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительные примечания"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createSubscription.isPending}>
              {createSubscription.isPending ? 'Создание...' : 'Создать абонемент'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};