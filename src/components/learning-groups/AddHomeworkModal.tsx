import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AddHomeworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddHomework: (homework: any) => void;
}

export const AddHomeworkModal = ({ open, onOpenChange, onAddHomework }: AddHomeworkModalProps) => {
  const [formData, setFormData] = useState({
    student: "",
    dueDate: undefined as Date | undefined,
    showInLK: true,
    comments: ""
  });

  // Mock students data - in real app this would come from API
  const students = [
    "Tchuente Dany",
    "Иванов Иван", 
    "Петров Петр"
  ];

  const handleSubmit = () => {
    const homework = {
      student: formData.student,
      assignment: formData.dueDate ? format(formData.dueDate, "d MMMM yyyy 'г.'", { locale: ru }) : "",
      showInLK: formData.showInLK,
      comments: formData.comments
    };
    
    onAddHomework(homework);
    setFormData({
      student: "",
      dueDate: undefined,
      showInLK: true,
      comments: ""
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить домашнее задание</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="student">Ученик</Label>
            <Select value={formData.student} onValueChange={(value) => setFormData(prev => ({ ...prev, student: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите ученика" />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student} value={student}>{student}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Дата выполнения</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate ? format(formData.dueDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="comments">Комментарии / описание задания</Label>
            <Textarea
              id="comments"
              placeholder="Audio HW, Workbook page 16..."
              value={formData.comments}
              onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showInLK"
              checked={formData.showInLK}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showInLK: checked as boolean }))}
            />
            <Label htmlFor="showInLK">Показывать в личном кабинете</Label>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.student || !formData.dueDate}>
            Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};