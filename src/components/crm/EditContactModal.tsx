import { useState, useEffect } from "react";
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
  firstName?: string;
  lastName?: string;
  middleName?: string;
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

// Parse full name into components
const parseFullName = (fullName: string): { lastName: string; firstName: string; middleName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { lastName: '', firstName: parts[0], middleName: '' };
  } else if (parts.length === 2) {
    return { lastName: parts[0], firstName: parts[1], middleName: '' };
  } else {
    return { lastName: parts[0], firstName: parts[1], middleName: parts.slice(2).join(' ') };
  }
};

// Combine name components into full name
export const combineFullName = (lastName?: string, firstName?: string, middleName?: string): string => {
  return [lastName, firstName, middleName].filter(Boolean).join(' ').trim() || 'Без имени';
};

// Format display name as "Фамилия Имя" (without patronymic)
export const formatDisplayName = (lastName?: string | null, firstName?: string | null, fullName?: string | null): string => {
  if (lastName || firstName) {
    return [lastName, firstName].filter(Boolean).join(' ').trim();
  }
  // Fallback: parse from full name and return without patronymic
  if (fullName && fullName !== 'Без имени') {
    const parsed = parseFullName(fullName);
    if (parsed.lastName || parsed.firstName) {
      return [parsed.lastName, parsed.firstName].filter(Boolean).join(' ').trim();
    }
  }
  return fullName || 'Без имени';
};

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

  // Parse name fields from full name if not provided
  const [lastName, setLastName] = useState(contactData.lastName || '');
  const [firstName, setFirstName] = useState(contactData.firstName || '');
  const [middleName, setMiddleName] = useState(contactData.middleName || '');

  useEffect(() => {
    // If separate name fields not provided, parse from full name
    if (!contactData.lastName && !contactData.firstName && contactData.name) {
      const parsed = parseFullName(contactData.name);
      setLastName(parsed.lastName);
      setFirstName(parsed.firstName);
      setMiddleName(parsed.middleName);
    } else {
      setLastName(contactData.lastName || '');
      setFirstName(contactData.firstName || '');
      setMiddleName(contactData.middleName || '');
    }
  }, [contactData]);

  const handleSave = () => {
    const fullName = combineFullName(lastName, firstName, middleName);
    onSave?.({ 
      ...formData, 
      name: fullName,
      lastName,
      firstName,
      middleName,
      phoneNumbers 
    });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setFormData(contactData);
    setPhoneNumbers(contactData.phoneNumbers || []);
    if (!contactData.lastName && !contactData.firstName && contactData.name) {
      const parsed = parseFullName(contactData.name);
      setLastName(parsed.lastName);
      setFirstName(parsed.firstName);
      setMiddleName(parsed.middleName);
    } else {
      setLastName(contactData.lastName || '');
      setFirstName(contactData.firstName || '');
      setMiddleName(contactData.middleName || '');
    }
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
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            <span>Редактировать контакт</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Name fields: Last Name, First Name, Patronymic */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Фамилия
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Фамилия"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium">
                  Имя
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Имя"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="middleName" className="text-sm font-medium">
                  Отчество
                </Label>
                <Input
                  id="middleName"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Отчество"
                  className="mt-1"
                />
              </div>
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