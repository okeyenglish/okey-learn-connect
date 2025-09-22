import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AddScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSchedule: (schedule: any) => void;
}

export const AddScheduleModal = ({ open, onOpenChange, onAddSchedule }: AddScheduleModalProps) => {
  const [formData, setFormData] = useState({
    day: "",
    startTime: "19:00",
    endTime: "20:00", 
    room: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined
  });

  const days = [
    { value: "monday", label: "Понедельник" },
    { value: "tuesday", label: "Вторник" },
    { value: "wednesday", label: "Среда" },
    { value: "thursday", label: "Четверг" },
    { value: "friday", label: "Пятница" },
    { value: "saturday", label: "Суббота" },
    { value: "sunday", label: "Воскресенье" }
  ];

  const handleSubmit = () => {
    const schedule = {
      day: formData.day,
      time: `с ${formData.startTime} до ${formData.endTime}`,
      period: formData.startDate && formData.endDate 
        ? `с ${format(formData.startDate, "dd.MM", { locale: ru })} по ${format(formData.endDate, "dd.MM.yy", { locale: ru })}`
        : format(formData.startDate || new Date(), "dd.MM", { locale: ru }),
      room: `Ауд. ${formData.room}`
    };
    
    onAddSchedule(schedule);
    setFormData({
      day: "",
      startTime: "19:00",
      endTime: "20:00", 
      room: "",
      startDate: undefined,
      endDate: undefined
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить элемент расписания</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="day">День недели</Label>
            <Select value={formData.day} onValueChange={(value) => setFormData(prev => ({ ...prev, day: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите день" />
              </SelectTrigger>
              <SelectContent>
                {days.map(day => (
                  <SelectItem key={day.value} value={day.label}>{day.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Время начала</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">Время окончания</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="room">Аудитория</Label>
            <Input
              id="room"
              placeholder="London, New York..."
              value={formData.room}
              onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Дата начала</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid gap-2">
              <Label>Дата окончания</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.day || !formData.room}>
            Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};