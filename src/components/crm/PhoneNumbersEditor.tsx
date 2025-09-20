import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Phone, Star } from "lucide-react";
import type { PhoneNumber } from "@/types/phone";

interface PhoneNumbersEditorProps {
  phoneNumbers: PhoneNumber[];
  onPhoneNumbersChange: (phoneNumbers: PhoneNumber[]) => void;
}

export const PhoneNumbersEditor = ({ phoneNumbers, onPhoneNumbersChange }: PhoneNumbersEditorProps) => {
  const [editingPhone, setEditingPhone] = useState<string | null>(null);

  const addPhoneNumber = () => {
    const newPhone: PhoneNumber = {
      id: Date.now().toString(),
      phone: '',
      phoneType: 'mobile',
      isPrimary: phoneNumbers.length === 0,
      isWhatsappEnabled: true,
      isTelegramEnabled: false,
    };
    onPhoneNumbersChange([...phoneNumbers, newPhone]);
    setEditingPhone(newPhone.id);
  };

  const updatePhoneNumber = (id: string, updates: Partial<PhoneNumber>) => {
    const updated = phoneNumbers.map(phone => 
      phone.id === id ? { ...phone, ...updates } : phone
    );
    
    // If setting as primary, remove primary from others
    if (updates.isPrimary) {
      updated.forEach(phone => {
        if (phone.id !== id) phone.isPrimary = false;
      });
    }
    
    onPhoneNumbersChange(updated);
  };

  const removePhoneNumber = (id: string) => {
    const filtered = phoneNumbers.filter(phone => phone.id !== id);
    
    // If removed phone was primary and there are others, make first one primary
    if (phoneNumbers.find(p => p.id === id)?.isPrimary && filtered.length > 0) {
      filtered[0].isPrimary = true;
    }
    
    onPhoneNumbersChange(filtered);
    setEditingPhone(null);
  };

  const getPhoneTypeLabel = (type: string) => {
    const labels = {
      mobile: 'Мобильный',
      work: 'Рабочий',
      home: 'Домашний',
      other: 'Другой'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Телефонные номера</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addPhoneNumber}
          className="h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Добавить
        </Button>
      </div>

      {phoneNumbers.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Нет телефонов
        </div>
      ) : (
        <div className="space-y-3">
          {phoneNumbers.map((phone, index) => (
            <div key={phone.id} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Телефон {index + 1}
                  </span>
                  {phone.isPrimary && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Основной
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removePhoneNumber(phone.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`phone-${phone.id}`} className="text-xs">
                    Номер телефона
                  </Label>
                  <Input
                    id={`phone-${phone.id}`}
                    type="tel"
                    value={phone.phone}
                    onChange={(e) => updatePhoneNumber(phone.id, { phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor={`type-${phone.id}`} className="text-xs">
                    Тип телефона
                  </Label>
                  <Select
                    value={phone.phoneType}
                    onValueChange={(value: any) => updatePhoneNumber(phone.id, { phoneType: value })}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">Мобильный</SelectItem>
                      <SelectItem value="work">Рабочий</SelectItem>
                      <SelectItem value="home">Домашний</SelectItem>
                      <SelectItem value="other">Другой</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-2" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`primary-${phone.id}`} className="text-xs">
                    Основной номер
                  </Label>
                  <Switch
                    id={`primary-${phone.id}`}
                    checked={phone.isPrimary}
                    onCheckedChange={(checked) => updatePhoneNumber(phone.id, { isPrimary: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor={`whatsapp-${phone.id}`} className="text-xs">
                    WhatsApp
                  </Label>
                  <Switch
                    id={`whatsapp-${phone.id}`}
                    checked={phone.isWhatsappEnabled}
                    onCheckedChange={(checked) => updatePhoneNumber(phone.id, { isWhatsappEnabled: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor={`telegram-${phone.id}`} className="text-xs">
                    Telegram
                  </Label>
                  <Switch
                    id={`telegram-${phone.id}`}
                    checked={phone.isTelegramEnabled}
                    onCheckedChange={(checked) => updatePhoneNumber(phone.id, { isTelegramEnabled: checked })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};