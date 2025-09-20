import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, X } from "lucide-react";

interface ContactData {
  name: string;
  email: string;
  dateOfBirth: string;
  branch: string;
  notes?: string;
}

interface EditContactModalProps {
  contactData: ContactData;
  onSave?: (data: ContactData) => void;
  children?: React.ReactNode;
}

export const EditContactModal = ({ contactData, onSave, children }: EditContactModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ContactData>(contactData);

  const handleSave = () => {
    onSave?.(formData);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setFormData(contactData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            title="Редактировать контакт"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать контакт</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Полное имя
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите полное имя"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Введите email"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="dateOfBirth" className="text-sm font-medium">
              День рождения
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="branch" className="text-sm font-medium">
              Филиал
            </Label>
            <Select
              value={formData.branch}
              onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Выберите филиал" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Котельники">Котельники</SelectItem>
                <SelectItem value="Новокосино">Новокосино</SelectItem>
                <SelectItem value="Окская">Окская</SelectItem>
                <SelectItem value="Стахановская">Стахановская</SelectItem>
                <SelectItem value="Солнцево">Солнцево</SelectItem>
                <SelectItem value="Мытищи">Мытищи</SelectItem>
                <SelectItem value="Люберцы">Люберцы</SelectItem>
                <SelectItem value="Красная горка">Красная горка</SelectItem>
                <SelectItem value="Онлайн школа">Онлайн школа</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Заметки
            </Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительные заметки..."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="text-sm"
            >
              <X className="h-3 w-3 mr-1" />
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              className="text-sm"
            >
              <Save className="h-3 w-3 mr-1" />
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};