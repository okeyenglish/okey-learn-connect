import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Star, Calendar as CalendarIcon, Plus, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PinnableModalHeader } from "./PinnableModal";
import { useCreateTask } from "@/hooks/useTasks";
import { useFamilyData } from "@/hooks/useFamilyData";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientId: string;
  familyGroupId?: string;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}

const taskTemplates = [
  "Связаться с родителями для обсуждения успеваемости",
  "Напомнить об оплате занятий",
  "Подготовить материалы к уроку",
  "Провести пробное занятие",
  "Обсудить расписание занятий",
  "Отправить домашнее задание",
  "Провести родительское собрание",
  "Подготовить отчет об успеваемости"
];

const employees = [
  "Пышнов Данил Александр",
  "Иванова Анна Сергеевна", 
  "Петров Максим Владимирович",
  "Смирнова Елена Игоревна"
];

export const AddTaskModal = ({ 
  open, 
  onOpenChange, 
  clientName,
  clientId,
  familyGroupId,
  isPinned = false, 
  onPin, 
  onUnpin 
}: AddTaskModalProps) => {
  const [formData, setFormData] = useState({
    date: new Date(),
    isHighPriority: false,
    responsible: "Пышнов Данил Александр",
    selectedStudent: "",
    description: "",
    additionalResponsible: [] as string[]
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const createTask = useCreateTask();
  const { familyData } = useFamilyData(familyGroupId);

  const handleSave = async () => {
    if (!formData.description.trim()) {
      return;
    }

    try {
      await createTask.mutateAsync({
        client_id: clientId,
        title: formData.description.substring(0, 100) || "Новая задача",
        description: formData.description,
        priority: formData.isHighPriority ? "high" : "medium",
        due_date: format(formData.date, 'yyyy-MM-dd'),
        responsible: [formData.responsible, ...formData.additionalResponsible].join(", "),
      });

      // Reset form
      setFormData({
        date: new Date(),
        isHighPriority: false,
        responsible: "Пышнов Данил Александр",
        selectedStudent: "",
        description: "",
        additionalResponsible: []
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleTemplateSelect = (template: string) => {
    setFormData(prev => ({ ...prev, description: template }));
  };

  const addResponsible = (employee: string) => {
    if (!formData.additionalResponsible.includes(employee)) {
      setFormData(prev => ({
        ...prev,
        additionalResponsible: [...prev.additionalResponsible, employee]
      }));
    }
  };

  const removeResponsible = (employee: string) => {
    setFormData(prev => ({
      ...prev,
      additionalResponsible: prev.additionalResponsible.filter(e => e !== employee)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <PinnableModalHeader
          title="Назначение задачи"
          isPinned={isPinned}
          onPin={onPin || (() => {})}
          onUnpin={onUnpin || (() => {})}
          onClose={() => onOpenChange(false)}
        />

        <div className="space-y-6 py-4">
          {/* Date and Priority Row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Дата:</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, date }));
                        setDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Приоритет:</Label>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start",
                  formData.isHighPriority && "bg-yellow-50 border-yellow-300"
                )}
                onClick={() => setFormData(prev => ({ ...prev, isHighPriority: !prev.isHighPriority }))}
              >
                <Star 
                  className={cn(
                    "mr-2 h-4 w-4",
                    formData.isHighPriority ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )} 
                />
                {formData.isHighPriority ? "Высокий приоритет" : "Обычный приоритет"}
              </Button>
            </div>
          </div>

          {/* Responsible Person */}
          <div className="space-y-2">
            <Label>Ответственный:</Label>
            <div className="space-y-2">
              <Select 
                value={formData.responsible} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, responsible: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee} value={employee}>{employee}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Additional responsible persons */}
              {formData.additionalResponsible.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.additionalResponsible.map((employee) => (
                    <div key={employee} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                      <Users className="h-3 w-3" />
                      {employee}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeResponsible(employee)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Select onValueChange={addResponsible}>
                <SelectTrigger>
                  <SelectValue placeholder="+ Добавить ответственного" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(emp => emp !== formData.responsible && !formData.additionalResponsible.includes(emp))
                    .map((employee) => (
                    <SelectItem key={employee} value={employee}>{employee}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Student Selection */}
          {familyData && familyData.students.length > 0 && (
            <div className="space-y-2">
              <Label>Студент:</Label>
              <Select 
                value={formData.selectedStudent} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, selectedStudent: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите студента" />
                </SelectTrigger>
                <SelectContent>
                  {familyData.students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.age} лет)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description with Templates */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание*:</Label>
            
            <div className="space-y-2">
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите шаблон или напишите свой" />
                </SelectTrigger>
                <SelectContent>
                  {taskTemplates.map((template, index) => (
                    <SelectItem key={index} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[100px]"
                placeholder="Напишите описание задачи..."
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Отменить
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!formData.description.trim() || createTask.isPending}
          >
            {createTask.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};