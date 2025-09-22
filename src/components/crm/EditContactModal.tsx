import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit2, Save, X } from "lucide-react";
import { PhoneNumbersEditor } from "./PhoneNumbersEditor";
import type { PhoneNumber } from "@/types/phone";

interface ContactData {
  name: string;
  email: string;
  dateOfBirth: string;
  branch: string;
  notes?: string;
  phoneNumbers?: PhoneNumber[];
}

interface EditContactModalProps {
  contactData: ContactData;
  onSave?: (data: ContactData & { phoneNumbers: PhoneNumber[] }) => void;
  children?: React.ReactNode;
}

export const EditContactModal = ({ contactData, onSave, children }: EditContactModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ContactData>(contactData);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>(
    contactData.phoneNumbers || [
      {
        id: '1',
        phone: '',
        phoneType: 'mobile',
        isPrimary: true,
        isWhatsappEnabled: true,
        isTelegramEnabled: false,
      }
    ]
  );

  const handleSave = () => {
    onSave?.({ ...formData, phoneNumbers });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setFormData(contactData);
    setPhoneNumbers(contactData.phoneNumbers || []);
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
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Редактировать контакт</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
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

            <PhoneNumbersEditor 
              phoneNumbers={phoneNumbers}
              onPhoneNumbersChange={setPhoneNumbers}
            />

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
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
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
      </DialogContent>
    </Dialog>
  );
};