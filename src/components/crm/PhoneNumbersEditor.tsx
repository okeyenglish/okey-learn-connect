import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Phone, Star, MessageCircle, Check, Loader2 } from "lucide-react";
import type { PhoneNumber } from "@/types/phone";

// Telegram icon component
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// MAX icon component
const MaxIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

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

  const hasMessengerConnection = (phone: PhoneNumber) => {
    return !!(phone.whatsappChatId || phone.telegramChatId || phone.maxChatId);
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

              {/* Messenger connections status */}
              <div className="flex flex-wrap gap-2">
                {/* WhatsApp status */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                  phone.whatsappChatId 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <MessageCircle className="h-3 w-3" />
                  <span>WhatsApp</span>
                  {phone.whatsappChatId && <Check className="h-3 w-3" />}
                </div>

                {/* Telegram status */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                  phone.telegramChatId 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <TelegramIcon className="h-3 w-3" />
                  <span>Telegram</span>
                  {phone.telegramChatId && <Check className="h-3 w-3" />}
                </div>

                {/* MAX status */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                  phone.maxChatId 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <MaxIcon className="h-3 w-3" />
                  <span>MAX</span>
                  {phone.maxChatId && <Check className="h-3 w-3" />}
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
