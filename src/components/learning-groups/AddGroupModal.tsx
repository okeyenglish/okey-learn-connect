import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Users, BookOpen, MapPin, User, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateLearningGroup, LearningGroup } from "@/hooks/useLearningGroups";
import { getBranchesForSelect } from "@/lib/branches";

interface AddGroupModalProps {
  onGroupAdded?: () => void;
}

export const AddGroupModal = ({ onGroupAdded }: AddGroupModalProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    custom_name: "",
    branch: "",
    subject: "Английский",
    level: "",
    category: "all" as const,
    group_type: "general" as const,
    status: "forming" as const,
    payment_method: "per_lesson" as const,
    default_price: "",
    textbook: "",
    responsible_teacher: "",
    capacity: "12",
    academic_hours: "",
    schedule_days: [] as string[],
    schedule_time: "",
    schedule_room: "",
    description: ""
  });
  
  const { toast } = useToast();
  const createGroup = useCreateLearningGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const groupData: Omit<LearningGroup, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name,
        custom_name: formData.custom_name || undefined,
        branch: formData.branch,
        subject: formData.subject,
        level: formData.level,
        category: formData.category,
        group_type: formData.group_type,
        status: formData.status,
        payment_method: formData.payment_method,
        default_price: formData.default_price ? parseFloat(formData.default_price) : undefined,
        textbook: formData.textbook || undefined,
        responsible_teacher: formData.responsible_teacher || undefined,
        capacity: parseInt(formData.capacity),
        current_students: 0,
        academic_hours: formData.academic_hours ? parseFloat(formData.academic_hours) : undefined,
        schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : undefined,
        schedule_time: formData.schedule_time || undefined,
        schedule_room: formData.schedule_room || undefined,
        description: formData.description || undefined,
        debt_count: 0,
        is_active: true
      };

      await createGroup.mutateAsync(groupData);

      toast({
        title: "Успешно",
        description: "Новая группа добавлена"
      });

      // Reset form
      setFormData({
        name: "",
        custom_name: "",
        branch: "",
        subject: "Английский",
        level: "",
        category: "all",
        group_type: "general",
        status: "forming",
        payment_method: "per_lesson",
        default_price: "",
        textbook: "",
        responsible_teacher: "",
        capacity: "12",
        academic_hours: "",
        schedule_days: [],
        schedule_time: "",
        schedule_room: "",
        description: ""
      });
      
      setOpen(false);
      onGroupAdded?.();

    } catch (error) {
      console.error('Error adding group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить группу",
        variant: "destructive"
      });
    }
  };

  const branches = getBranchesForSelect();
  const levels = [
    "Super Safari 1", "Super Safari 2", "Super Safari 3",
    "Kids Box Starter", "Kids Box 1", "Kids Box 2", "Kids Box 3", "Kids Box 4", "Kids Box 5", "Kids Box 6",
    "Kids Box 3+4", "Kids Box Starter + 1",
    "Prepare 1", "Prepare 2", "Prepare 3", "Prepare 4", "Prepare 5", "Prepare 6",
    "Empower 1", "Empower 2", "Empower 3", "Empower 4", "Empower 5"
  ];

  const textbooks = ["Disney", "Cambridge", "New York", "Oxford"];
  const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
          <Plus className="h-4 w-4" />
          Добавить группу
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              Добавить группу
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Филиал *
                    </Label>
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите филиал" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(branch => (
                          <SelectItem key={branch.value} value={branch.label}>
                            {branch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <Badge className="h-4 w-4 text-yellow-600" />
                      Статус группы
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forming">
                          <span className="text-yellow-600">Формирующаяся</span>
                        </SelectItem>
                        <SelectItem value="active">
                          <span className="text-green-600">В работе</span>
                        </SelectItem>
                        <SelectItem value="reserve">
                          <span className="text-gray-600">Резервная</span>
                        </SelectItem>
                        <SelectItem value="suspended">
                          <span className="text-red-600">Приостановленная</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Дисциплина</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Английский">Английский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      Уровень *
                    </Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите уровень" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {levels.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">[Все]</SelectItem>
                        <SelectItem value="preschool">Дошкольники</SelectItem>
                        <SelectItem value="school">Школьники</SelectItem>
                        <SelectItem value="adult">Взрослые</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Тип</Label>
                    <Select
                      value={formData.group_type}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, group_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Общий</SelectItem>
                        <SelectItem value="individual">Индивидуальный</SelectItem>
                        <SelectItem value="mini">Мини-группа</SelectItem>
                        <SelectItem value="corporate">Корпоративный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Способ оплаты</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_lesson">По занятиям</SelectItem>
                        <SelectItem value="monthly">Помесячно</SelectItem>
                        <SelectItem value="course">За курс</SelectItem>
                        <SelectItem value="package">Пакет</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Цена по умолчанию
                    </Label>
                    <Input
                      type="number"
                      value={formData.default_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, default_price: e.target.value }))}
                      placeholder="11490"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Учебник</Label>
                    <Select
                      value={formData.textbook}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, textbook: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите учебник" />
                      </SelectTrigger>
                      <SelectContent>
                        {textbooks.map(book => (
                          <SelectItem key={book} value={book}>
                            {book}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-600" />
                      Ответственный
                    </Label>
                    <Input
                      value={formData.responsible_teacher}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsible_teacher: e.target.value }))}
                      placeholder="Имя преподавателя"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Вместимость *
                    </Label>
                    <Input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      min="1"
                      max="20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ак. часов</Label>
                    <Input
                      type="number"
                      value={formData.academic_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, academic_hours: e.target.value }))}
                      placeholder="117"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Аудитория</Label>
                    <Input
                      value={formData.schedule_room}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_room: e.target.value }))}
                      placeholder="Аудитория 1"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    Дни занятий
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {days.map(day => (
                      <Button
                        key={day}
                        type="button"
                        variant={formData.schedule_days.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day)}
                        className={formData.schedule_days.includes(day) ? "bg-blue-600 text-white" : ""}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Время занятий</Label>
                    <Input
                      value={formData.schedule_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                      placeholder="18:00-19:20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Название группы *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ГР1_SS2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Произвольное имя</Label>
                  <Input
                    value={formData.custom_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, custom_name: e.target.value }))}
                    placeholder="Дополнительное название группы"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Дополнительная информация о группе"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Отменить
              </Button>
              <Button
                type="submit"
                disabled={createGroup.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {createGroup.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};