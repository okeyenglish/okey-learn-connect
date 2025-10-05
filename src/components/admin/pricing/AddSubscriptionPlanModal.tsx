import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSubscriptionPlan } from "@/hooks/useSubscriptionPlans";

interface AddSubscriptionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSubscriptionPlanModal({ open, onOpenChange }: AddSubscriptionPlanModalProps) {
  const createPlan = useCreateSubscriptionPlan();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subscription_type: "per_lesson" as "per_lesson" | "monthly" | "weekly",
    lessons_count: "",
    duration_days: "",
    price: "",
    price_per_lesson: "",
    branch: "",
    subject: "Английский",
    age_category: "all" as "preschool" | "school" | "adult" | "all",
    freeze_days_allowed: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createPlan.mutateAsync({
      name: formData.name,
      description: formData.description || null,
      subscription_type: formData.subscription_type,
      lessons_count: formData.lessons_count ? Number(formData.lessons_count) : null,
      duration_days: formData.duration_days ? Number(formData.duration_days) : null,
      price: Number(formData.price),
      price_per_lesson: formData.price_per_lesson ? Number(formData.price_per_lesson) : null,
      branch: formData.branch || null,
      subject: formData.subject || null,
      age_category: formData.age_category,
      freeze_days_allowed: Number(formData.freeze_days_allowed),
      is_active: true,
      auto_renewal: false,
      makeup_lessons_count: null,
      max_level: null,
      min_level: null,
      sort_order: null,
    });
    
    onOpenChange(false);
    setFormData({
      name: "",
      description: "",
      subscription_type: "per_lesson",
      lessons_count: "",
      duration_days: "",
      price: "",
      price_per_lesson: "",
      branch: "",
      subject: "Английский",
      age_category: "all",
      freeze_days_allowed: "0",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить абонемент</DialogTitle>
          <DialogDescription>
            Создайте новый тарифный план или абонемент
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Абонемент 8 занятий"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание абонемента"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Тип абонемента *</Label>
                <Select
                  value={formData.subscription_type}
                  onValueChange={(value: any) => setFormData({ ...formData, subscription_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_lesson">Поурочный</SelectItem>
                    <SelectItem value="monthly">Месячный</SelectItem>
                    <SelectItem value="weekly">Недельный</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="age_category">Возрастная категория</Label>
                <Select
                  value={formData.age_category}
                  onValueChange={(value: any) => setFormData({ ...formData, age_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="preschool">Дошкольники</SelectItem>
                    <SelectItem value="school">Школьники</SelectItem>
                    <SelectItem value="adult">Взрослые</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lessons_count">Количество занятий</Label>
                <Input
                  id="lessons_count"
                  type="number"
                  value={formData.lessons_count}
                  onChange={(e) => setFormData({ ...formData, lessons_count: e.target.value })}
                  placeholder="8"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="duration_days">Срок действия (дней)</Label>
                <Input
                  id="duration_days"
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Стоимость (₽) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="12000"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price_per_lesson">Цена за занятие (₽)</Label>
                <Input
                  id="price_per_lesson"
                  type="number"
                  value={formData.price_per_lesson}
                  onChange={(e) => setFormData({ ...formData, price_per_lesson: e.target.value })}
                  placeholder="1500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="branch">Филиал</Label>
                <Input
                  id="branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  placeholder="Все филиалы"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="freeze_days">Дней заморозки</Label>
                <Input
                  id="freeze_days"
                  type="number"
                  value={formData.freeze_days_allowed}
                  onChange={(e) => setFormData({ ...formData, freeze_days_allowed: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createPlan.isPending}>
              {createPlan.isPending ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
