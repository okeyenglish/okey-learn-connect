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
  X,
  PhoneCall
} from "lucide-react";
import OnlinePBXPhone from "@/components/WebRTCPhone";

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
            <div className="flex items-center gap-2 flex-wrap">
              {/* OnlinePBX Call Button */}
              <OnlinePBXPhone phoneNumber={phoneNumber.phone} />
              
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
    </div>
  );
};