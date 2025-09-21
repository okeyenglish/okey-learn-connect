import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, BookOpen, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateLearningGroup, LearningGroup } from "@/hooks/useLearningGroups";
import { getBranchesForSelect } from "@/lib/branches";

interface EditGroupModalProps {
  group: LearningGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupUpdated?: () => void;
}

export const EditGroupModal = ({ group, open, onOpenChange, onGroupUpdated }: EditGroupModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    custom_name: "",
    branch: "",
    subject: "Английский",
    level: "",
    category: "all" as "preschool" | "school" | "adult" | "all",
    group_type: "general" as "general" | "mini",
    status: "forming" as "reserve" | "forming" | "active" | "suspended" | "finished",
    capacity: "12",
    academic_hours: "",
    schedule_days: [] as string[],
    schedule_room: "",
    lesson_start_hour: "",
    lesson_start_minute: "",
    lesson_end_hour: "",
    lesson_end_minute: "",
    description: ""
  });
  
  const { toast } = useToast();
  const updateGroup = useUpdateLearningGroup();

  // Function to automatically set category based on level
  const getCategoryFromLevel = (level: string): "preschool" | "school" | "adult" | "all" => {
    if (level.startsWith("Super Safari")) return "preschool";
    if (level.startsWith("Kids Box")) return "school";
    if (level.startsWith("Prepare")) return "school";
    if (level.startsWith("Empower")) return "adult";
    return "all";
  };

  // Load group data when modal opens
  useEffect(() => {
    if (group && open) {
      const [startHour = "", startMinute = ""] = group.schedule_time?.split('-')[0]?.split(':') || [];
      const [endHour = "", endMinute = ""] = group.schedule_time?.split('-')[1]?.split(':') || [];
      
      setFormData({
        name: group.name || "",
        custom_name: group.custom_name || "",
        branch: group.branch || "",
        subject: group.subject || "Английский",
        level: group.level || "",
        category: group.category || "all",
        group_type: group.group_type || "general",
        status: group.status || "forming",
        capacity: group.capacity?.toString() || "12",
        academic_hours: group.academic_hours?.toString() || "",
        schedule_days: group.schedule_days || [],
        schedule_room: group.schedule_room || "",
        lesson_start_hour: startHour,
        lesson_start_minute: startMinute,
        lesson_end_hour: endHour,
        lesson_end_minute: endMinute,
        description: group.description || ""
      });
    }
  }, [group, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!group) return;
    
    try {
      // Create schedule_time from start and end times
      const schedule_time = (formData.lesson_start_hour && formData.lesson_start_minute && 
                           formData.lesson_end_hour && formData.lesson_end_minute) 
        ? `${formData.lesson_start_hour.padStart(2, '0')}:${formData.lesson_start_minute.padStart(2, '0')}-${formData.lesson_end_hour.padStart(2, '0')}:${formData.lesson_end_minute.padStart(2, '0')}`
        : undefined;

      const groupData = {
        name: formData.name,
        custom_name: formData.custom_name || undefined,
        branch: formData.branch,
        subject: formData.subject,
        level: formData.level,
        category: formData.category,
        group_type: formData.group_type,
        status: formData.status,
        capacity: parseInt(formData.capacity),
        academic_hours: formData.academic_hours ? parseFloat(formData.academic_hours) : undefined,
        schedule_days: formData.schedule_days.length > 0 ? formData.schedule_days : undefined,
        schedule_time: schedule_time,
        schedule_room: formData.schedule_room || undefined,
        description: formData.description || undefined
      };

      await updateGroup.mutateAsync({ id: group.id, data: groupData });

      toast({
        title: "Успешно",
        description: "Данные группы обновлены"
      });
      
      onOpenChange(false);
      onGroupUpdated?.();

    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить группу",
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

  const days = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  
  // Generate classroom options based on branch
  const getClassroomsForBranch = (branch: string) => {
    const classroomMap: Record<string, string[]> = {
      "Окская": ["Аудитория 1", "Аудитория 2", "Аудитория 3", "Аудитория 4"],
      "Котельники": ["Кабинет 101", "Кабинет 102", "Кабинет 103"],
      "Люберцы-1": ["Класс А", "Класс Б", "Класс В", "Класс Г"],
      "Люберцы-2": ["Комната 1", "Комната 2", "Комната 3"],
      "Мытищи": ["Зал 1", "Зал 2", "Зал 3", "Зал 4"],
      "Новокосино": ["Студия 1", "Студия 2", "Студия 3"],
      "Солнцево": ["Кабинет 1", "Кабинет 2", "Кабинет 3", "Кабинет 4"],
      "Стахановская": ["Аудитория А", "Аудитория Б", "Аудитория В"],
      "Онлайн": ["Zoom-комната 1", "Zoom-комната 2", "Zoom-комната 3"]
    };
    return classroomMap[branch] || [];
  };

  // Generate time options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              Редактировать группу
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
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        level: value, 
                        category: getCategoryFromLevel(value)
                      }))}
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
                      disabled
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
                        <SelectItem value="general">Группа</SelectItem>
                        <SelectItem value="mini">Мини-группа</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      Аудитория *
                    </Label>
                    <Select
                      value={formData.schedule_room}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, schedule_room: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите аудиторию" />
                      </SelectTrigger>
                      <SelectContent>
                        {getClassroomsForBranch(formData.branch).map(room => (
                          <SelectItem key={room} value={room}>
                            {room}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Время занятий *
                  </Label>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Время начала</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={formData.lesson_start_hour}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, lesson_start_hour: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Час" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {hours.map(hour => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={formData.lesson_start_minute}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, lesson_start_minute: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Мин" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutes.map(minute => (
                              <SelectItem key={minute} value={minute}>
                                {minute}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Время окончания</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={formData.lesson_end_hour}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, lesson_end_hour: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Час" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {hours.map(hour => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={formData.lesson_end_minute}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, lesson_end_minute: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Мин" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutes.map(minute => (
                              <SelectItem key={minute} value={minute}>
                                {minute}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
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
                onClick={() => onOpenChange(false)}
              >
                Отменить
              </Button>
              <Button
                type="submit"
                disabled={updateGroup.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {updateGroup.isPending ? (
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