import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Bold, Italic, Link, Type, Undo, Redo, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PinnableModalHeader } from "./PinnableModal";
import { useCreateTask } from "@/hooks/useTasks";
import { toast } from "sonner";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientId: string;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}

export const AddTaskModal = ({ 
  open, 
  onOpenChange, 
  clientName,
  clientId, 
  isPinned = false, 
  onPin, 
  onUnpin 
}: AddTaskModalProps) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    priority: "medium" as 'low' | 'medium' | 'high',
    responsible: "",
    client: clientName,
    direction: "",
    method: "",
    goal: "",
    template: "",
    description: "",
    forAll: false,
    executeAtTime: false
  });

  const [showCommunication, setShowCommunication] = useState(true);
  const createTask = useCreateTask();

  const handleSave = async () => {
    if (!formData.description.trim()) {
      toast.error("Описание задачи обязательно для заполнения");
      return;
    }

    try {
      await createTask.mutateAsync({
        client_id: clientId,
        title: formData.description.slice(0, 100), // Используем первые 100 символов как заголовок
        description: formData.description,
        priority: formData.priority,
        status: 'active',
        due_date: formData.date || undefined,
        responsible: formData.responsible || undefined,
        goal: formData.goal || undefined,
        method: formData.method || undefined,
        direction: formData.direction || undefined,
      });

      toast.success("Задача успешно создана");
      
      // Сбросить форму
      setFormData({
        date: new Date().toISOString().split('T')[0],
        priority: "medium",
        responsible: "",
        client: clientName,
        direction: "",
        method: "",
        goal: "",
        template: "",
        description: "",
        forAll: false,
        executeAtTime: false
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error("Ошибка при создании задачи");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <PinnableModalHeader
          title="Назначение разовой задачи"
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
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет:</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Средний" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsible Row */}
          <div className="space-y-2">
            <Label htmlFor="responsible">Ответственный:</Label>
            <div className="flex items-center gap-2">
              <Select value={formData.responsible} onValueChange={(value) => setFormData({ ...formData, responsible: value })}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Пышнов Данил Александр" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager1">Пышнов Данил Александр</SelectItem>
                  <SelectItem value="manager2">Иванов Иван Иванович</SelectItem>
                  <SelectItem value="manager3">Петров Петр Петрович</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Plus className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="forAll" 
                  checked={formData.forAll}
                  onCheckedChange={(checked) => setFormData({ ...formData, forAll: checked as boolean })}
                />
                <Label htmlFor="forAll" className="text-sm">Для всех</Label>
              </div>
            </div>
          </div>

          {/* Remove Communication Link */}
          {showCommunication && (
            <div>
              <Button 
                variant="link" 
                className="text-blue-600 p-0 h-auto font-normal"
                onClick={() => setShowCommunication(false)}
              >
                ▼ Удалить коммуникацию
              </Button>
            </div>
          )}

          {/* Communication Fields */}
          {showCommunication && (
            <>
              {/* Client */}
              <div className="space-y-2">
                <Label htmlFor="client">Клиент:</Label>
                <Input
                  id="client"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="bg-muted"
                  readOnly
                />
              </div>

              {/* Direction and Method Row */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="direction">Направление:</Label>
                  <Select value={formData.direction} onValueChange={(value) => setFormData({ ...formData, direction: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Исходящая" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outgoing">Исходящая</SelectItem>
                      <SelectItem value="incoming">Входящая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Способ:</Label>
                  <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Звонок" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Звонок</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <Label htmlFor="goal">Цель:</Label>
                <Select value={formData.goal} onValueChange={(value) => setFormData({ ...formData, goal: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Цель..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Консультация</SelectItem>
                    <SelectItem value="payment">Обсуждение оплаты</SelectItem>
                    <SelectItem value="schedule">Расписание</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Execute at Time Link */}
              <div>
                <Button 
                  variant="link" 
                  className="text-blue-600 p-0 h-auto font-normal"
                  onClick={() => setFormData({ ...formData, executeAtTime: !formData.executeAtTime })}
                >
                  ▶ Выполнить в определённое время
                </Button>
              </div>
            </>
          )}

          {/* Task Template */}
          <div className="space-y-2">
            <Label htmlFor="template">Шаблон задачи:</Label>
            <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Добавить в пользовательское поле" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_field">Добавить в пользовательское поле</SelectItem>
                <SelectItem value="call_template">Шаблон звонка</SelectItem>
                <SelectItem value="meeting_template">Шаблон встречи</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание*:</Label>
            
            {/* Toolbar */}
            <div className="flex items-center gap-1 border rounded-t-md p-2 bg-muted/30">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Redo className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Italic className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Calendar className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Type className="h-4 w-4" />
                <span className="absolute -bottom-1 right-0 text-xs">▼</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Link className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[120px] rounded-t-none border-t-0"
              placeholder="Введите описание задачи..."
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Отменить
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={createTask.isPending || !formData.description.trim()}
          >
            {createTask.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};