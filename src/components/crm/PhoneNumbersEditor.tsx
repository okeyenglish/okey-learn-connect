import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, X, Phone, Star, Check } from "lucide-react";
import type { PhoneNumber } from "@/types/phone";

// WhatsApp icon component
const WhatsAppIcon = ({ className, active }: { className?: string; active?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

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

  const showPrimaryStar = phoneNumbers.length > 1;

  return (
    <TooltipProvider>
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
                    {showPrimaryStar && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => updatePhoneNumber(phone.id, { isPrimary: true })}
                            className={`p-1 rounded transition-colors ${
                              phone.isPrimary 
                                ? 'text-amber-500' 
                                : 'text-muted-foreground/40 hover:text-amber-400'
                            }`}
                          >
                            <Star className={`h-4 w-4 ${phone.isPrimary ? 'fill-current' : ''}`} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {phone.isPrimary ? 'Основной номер' : 'Сделать основным'}
                        </TooltipContent>
                      </Tooltip>
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

                {/* Phone number input */}
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

                {/* Messenger toggles as icons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-2">Мессенджеры:</span>
                  
                  {/* WhatsApp toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => updatePhoneNumber(phone.id, { isWhatsappEnabled: !phone.isWhatsappEnabled })}
                        className={`p-2 rounded-lg transition-all ${
                          phone.isWhatsappEnabled
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-muted text-muted-foreground/40 hover:text-muted-foreground'
                        }`}
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {phone.isWhatsappEnabled ? 'WhatsApp включён' : 'WhatsApp выключен'}
                      {phone.whatsappChatId && ' (подключён)'}
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Telegram toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => updatePhoneNumber(phone.id, { isTelegramEnabled: !phone.isTelegramEnabled })}
                        className={`p-2 rounded-lg transition-all ${
                          phone.isTelegramEnabled
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground/40 hover:text-muted-foreground'
                        }`}
                      >
                        <TelegramIcon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {phone.isTelegramEnabled ? 'Telegram включён' : 'Telegram выключен'}
                      {phone.telegramChatId && ' (подключён)'}
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* MAX indicator (read-only, based on connection) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`p-2 rounded-lg ${
                          phone.maxChatId
                            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-muted text-muted-foreground/40'
                        }`}
                      >
                        <MaxIcon className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {phone.maxChatId ? 'MAX подключён' : 'MAX не подключён'}
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Connection status badges */}
                  <div className="flex items-center gap-1 ml-auto">
                    {phone.whatsappChatId && (
                      <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {phone.telegramChatId && (
                      <span className="flex items-center gap-0.5 text-[10px] text-blue-600">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {phone.maxChatId && (
                      <span className="flex items-center gap-0.5 text-[10px] text-purple-600">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
