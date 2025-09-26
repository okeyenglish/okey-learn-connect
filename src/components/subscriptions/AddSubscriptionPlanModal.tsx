import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  useCreateSubscriptionPlan, 
  useUpdateSubscriptionPlan,
  SubscriptionPlan 
} from "@/hooks/useSubscriptionPlans";

interface AddSubscriptionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: SubscriptionPlan | null;
  isEdit?: boolean;
}

export const AddSubscriptionPlanModal = ({ 
  open, 
  onOpenChange, 
  plan,
  isEdit = false 
}: AddSubscriptionPlanModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subscription_type: "per_lesson" as const,
    lessons_count: 0,
    duration_days: 0,
    price: 0,
    price_per_lesson: 0,
    is_active: true,
    freeze_days_allowed: 0,
    branch: "",
    subject: "",
    age_category: "",
  });

  const createPlan = useCreateSubscriptionPlan();
  const updatePlan = useUpdateSubscriptionPlan();

  useEffect(() => {
    if (plan && isEdit) {
      setFormData({
        name: plan.name || "",
        description: plan.description || "",
        subscription_type: plan.subscription_type || "per_lesson",
        lessons_count: plan.lessons_count || 0,
        duration_days: plan.duration_days || 0,
        price: plan.price || 0,
        price_per_lesson: plan.price_per_lesson || 0,
        is_active: plan.is_active ?? true,
        freeze_days_allowed: plan.freeze_days_allowed || 0,
        branch: plan.branch || "",
        subject: plan.subject || "",
        age_category: plan.age_category || "",
      });
    }
  }, [plan, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit && plan) {
        await updatePlan.mutateAsync({
          id: plan.id,
          ...formData,
        });
      } else {
        await createPlan.mutateAsync(formData);
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving subscription plan:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      subscription_type: "per_lesson" as const,
      lessons_count: 0,
      duration_days: 0,
      price: 0,
      price_per_lesson: 0,
      is_active: true,
      freeze_days_allowed: 0,
      branch: "",
      subject: "",
      age_category: "",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    if (!isEdit) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Редактировать тарифный план' : 'Создать тарифный план'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Название плана *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Название тарифного плана"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание тарифного плана"
              rows={3}
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
              <Label htmlFor="price">Цена *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                min="0"
                required
              />
            </div>
          </div>

          {formData.subscription_type === 'per_lesson' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lessons_count">Количество уроков</Label>
                <Input
                  id="lessons_count"
                  type="number"
                  value={formData.lessons_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, lessons_count: parseInt(e.target.value) || 0 }))}
                  min="1"
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

          {(formData.subscription_type === 'monthly' || formData.subscription_type === 'weekly') && (
            <div className="space-y-2">
              <Label htmlFor="duration_days">Длительность (дней)</Label>
              <Input
                id="duration_days"
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 0 }))}
                min="1"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Филиал</Label>
              <Select
                value={formData.branch}
                onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все филиалы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все филиалы</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="subject">Предмет</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Предмет"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age_category">Возрастная категория</Label>
              <Select
                value={formData.age_category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, age_category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Любая</SelectItem>
                  <SelectItem value="preschool">Дошкольники</SelectItem>
                  <SelectItem value="school">Школьники</SelectItem>
                  <SelectItem value="adult">Взрослые</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeze_days_allowed">Дней заморозки разрешено</Label>
              <Input
                id="freeze_days_allowed"
                type="number"
                value={formData.freeze_days_allowed}
                onChange={(e) => setFormData(prev => ({ ...prev, freeze_days_allowed: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: !!checked }))}
            />
            <Label htmlFor="is_active">Активный план</Label>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={createPlan.isPending || updatePlan.isPending}
            >
              {createPlan.isPending || updatePlan.isPending 
                ? (isEdit ? 'Сохранение...' : 'Создание...') 
                : (isEdit ? 'Сохранить' : 'Создать план')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};