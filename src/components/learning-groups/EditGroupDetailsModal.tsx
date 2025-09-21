import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LearningGroup } from "@/hooks/useLearningGroups";

interface EditGroupDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: LearningGroup | null;
  onSaveDetails: (details: any) => void;
}

export const EditGroupDetailsModal = ({ open, onOpenChange, group, onSaveDetails }: EditGroupDetailsModalProps) => {
  const [formData, setFormData] = useState({
    branch: group?.branch || "",
    responsible_teacher: group?.responsible_teacher || "",
    subject: group?.subject || "",
    category: group?.category || "",
    level: group?.level || "",
    group_type: group?.group_type || "",
    capacity: group?.capacity || 0,
    zoom_link: group?.zoom_link || ""
  });

  React.useEffect(() => {
    if (group) {
      setFormData({
        branch: group.branch,
        responsible_teacher: group.responsible_teacher || "",
        subject: group.subject,
        category: group.category,
        level: group.level,
        group_type: group.group_type,
        capacity: group.capacity,
        zoom_link: group.zoom_link || ""
      });
    }
  }, [group]);

  const branches = [
    "Котельники", "Люберцы 1", "Люберцы 2", "Мытищи", 
    "Новокосино", "Окская", "Солнцево", "Стахановская", "Онлайн"
  ];

  const subjects = [
    "Английский язык", "Немецкий язык", "Французский язык", 
    "Испанский язык", "Китайский язык"
  ];

  const categories = [
    { value: "preschool", label: "Дошкольники" },
    { value: "school", label: "Школьники" },
    { value: "adult", label: "Взрослые" },
    { value: "all", label: "Все" }
  ];

  const groupTypes = [
    { value: "group", label: "Группа" },
    { value: "mini", label: "Мини-группа" }
  ];

  const handleSubmit = () => {
    onSaveDetails(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать детали группы</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="branch">Филиал</Label>
              <Select value={formData.branch} onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="responsible_teacher">Ответственный преподаватель</Label>
              <Input
                id="responsible_teacher"
                value={formData.responsible_teacher}
                onChange={(e) => setFormData(prev => ({ ...prev, responsible_teacher: e.target.value }))}
                placeholder="Введите имя преподавателя"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Дисциплина</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="level">Уровень</Label>
              <Input
                id="level"
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                placeholder="A1, A2, B1..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Категория</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="group_type">Тип группы</Label>
              <Select value={formData.group_type} onValueChange={(value) => setFormData(prev => ({ ...prev, group_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="capacity">Вместимость</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="20"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="zoom_link">ZOOM ссылка</Label>
            <Input
              id="zoom_link"
              value={formData.zoom_link}
              onChange={(e) => setFormData(prev => ({ ...prev, zoom_link: e.target.value }))}
              placeholder="https://zoom.us/j/..."
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};