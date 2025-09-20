import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Phone, 
  MessageCircle, 
  Edit, 
  Plus, 
  Trash2, 
  Check, 
  X 
} from "lucide-react";

interface PhoneNumber {
  id: string;
  phone: string;
  phoneType: 'mobile' | 'work' | 'home';
  isPrimary: boolean;
  isWhatsappEnabled: boolean;
  isTelegramEnabled: boolean;
}

interface PhoneNumberManagerProps {
  clientId: string;
  phoneNumbers: PhoneNumber[];
  onUpdate?: (phoneNumbers: PhoneNumber[]) => void;
  onMessageClick?: (phoneNumber: PhoneNumber, platform: 'whatsapp' | 'telegram') => void;
}

export const PhoneNumberManager = ({ 
  clientId, 
  phoneNumbers, 
  onUpdate, 
  onMessageClick 
}: PhoneNumberManagerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedPhone, setEditedPhone] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPhone, setNewPhone] = useState({
    phone: "",
    phoneType: "mobile" as const,
    isWhatsappEnabled: true,
    isTelegramEnabled: false
  });

  const handleEdit = (phoneNumber: PhoneNumber) => {
    setEditingId(phoneNumber.id);
    setEditedPhone(phoneNumber.phone);
  };

  const handleSaveEdit = (id: string) => {
    const updatedPhones = phoneNumbers.map(p => 
      p.id === id ? { ...p, phone: editedPhone } : p
    );
    onUpdate?.(updatedPhones);
    setEditingId(null);
    setEditedPhone("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedPhone("");
  };

  const handleAddNew = () => {
    if (!newPhone.phone.trim()) return;
    
    const newPhoneNumber: PhoneNumber = {
      id: Date.now().toString(),
      phone: newPhone.phone,
      phoneType: newPhone.phoneType,
      isPrimary: phoneNumbers.length === 0, // First phone is primary
      isWhatsappEnabled: newPhone.isWhatsappEnabled,
      isTelegramEnabled: newPhone.isTelegramEnabled
    };
    
    onUpdate?.([...phoneNumbers, newPhoneNumber]);
    setNewPhone({
      phone: "",
      phoneType: "mobile",
      isWhatsappEnabled: true,
      isTelegramEnabled: false
    });
    setIsAddingNew(false);
  };

  const handleDelete = (id: string) => {
    const filtered = phoneNumbers.filter(p => p.id !== id);
    // If we deleted the primary number, make the first remaining number primary
    if (filtered.length > 0 && !filtered.some(p => p.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    onUpdate?.(filtered);
  };

  const handleSetPrimary = (id: string) => {
    const updated = phoneNumbers.map(p => ({
      ...p,
      isPrimary: p.id === id
    }));
    onUpdate?.(updated);
  };

  const getPhoneTypeLabel = (type: string) => {
    const labels = {
      mobile: "Мобильный",
      work: "Рабочий", 
      home: "Домашний"
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-3">
      {phoneNumbers.map((phoneNumber) => (
        <div key={phoneNumber.id} className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              {editingId === phoneNumber.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    className="w-40"
                    placeholder="+7 (___) ___-__-__"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleSaveEdit(phoneNumber.id)}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleCancelEdit}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-sm">{phoneNumber.phone}</span>
                  <Badge variant="outline" className="text-xs">
                    {getPhoneTypeLabel(phoneNumber.phoneType)}
                  </Badge>
                  {phoneNumber.isPrimary && (
                    <Badge variant="default" className="text-xs">
                      Основной
                    </Badge>
                  )}
                </>
              )}
            </div>
            
            {editingId !== phoneNumber.id && (
              <div className="flex items-center gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleEdit(phoneNumber)}
                  className="h-6 w-6 p-0"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                {!phoneNumber.isPrimary && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDelete(phoneNumber.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {editingId !== phoneNumber.id && (
            <div className="flex items-center gap-2">
              {phoneNumber.isWhatsappEnabled && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-6 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  onClick={() => onMessageClick?.(phoneNumber, 'whatsapp')}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  WhatsApp
                </Button>
              )}
              {phoneNumber.isTelegramEnabled && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-6 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  onClick={() => onMessageClick?.(phoneNumber, 'telegram')}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Telegram
                </Button>
              )}
              {!phoneNumber.isPrimary && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-xs h-6"
                  onClick={() => handleSetPrimary(phoneNumber.id)}
                >
                  Сделать основным
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add New Phone Number */}
      {isAddingNew ? (
        <div className="border rounded-lg p-3 bg-muted/20">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <Input
                value={newPhone.phone}
                onChange={(e) => setNewPhone(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+7 (___) ___-__-__"
                className="flex-1"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Тип:</Label>
                <Select
                  value={newPhone.phoneType}
                  onValueChange={(value: any) => setNewPhone(prev => ({ ...prev, phoneType: value }))}
                >
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Мобильный</SelectItem>
                    <SelectItem value="work">Рабочий</SelectItem>
                    <SelectItem value="home">Домашний</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={newPhone.isWhatsappEnabled}
                  onCheckedChange={(checked) => setNewPhone(prev => ({ ...prev, isWhatsappEnabled: checked }))}
                />
                <Label className="text-xs">WhatsApp</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={newPhone.isTelegramEnabled}
                  onCheckedChange={(checked) => setNewPhone(prev => ({ ...prev, isTelegramEnabled: checked }))}
                />
                <Label className="text-xs">Telegram</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsAddingNew(false)}
                className="text-xs"
              >
                Отмена
              </Button>
              <Button 
                size="sm" 
                onClick={handleAddNew}
                className="text-xs"
                disabled={!newPhone.phone.trim()}
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setIsAddingNew(true)}
          className="text-xs w-full"
        >
          <Plus className="w-3 h-3 mr-1" />
          Добавить номер
        </Button>
      )}
    </div>
  );
};