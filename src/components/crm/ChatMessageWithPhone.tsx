import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone } from "lucide-react";

interface ChatMessageWithPhoneProps {
  message: string;
  timestamp: string;
  isFromClient: boolean;
  phoneNumber?: string;
  platform?: 'whatsapp' | 'telegram' | 'sms';
}

export const ChatMessageWithPhone = ({ 
  message, 
  timestamp, 
  isFromClient, 
  phoneNumber, 
  platform 
}: ChatMessageWithPhoneProps) => {
  const getPlatformColor = (platform?: string) => {
    switch (platform) {
      case 'whatsapp': return 'bg-green-100 text-green-800 border-green-200';
      case 'telegram': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sms': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPlatformLabel = (platform?: string) => {
    switch (platform) {
      case 'whatsapp': return 'WhatsApp';
      case 'telegram': return 'Telegram';
      case 'sms': return 'SMS';
      default: return 'Сообщение';
    }
  };

  return (
    <div className={`flex ${isFromClient ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isFromClient ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}>
        <div className="text-sm">{message}</div>
        
        {/* Message metadata */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="text-xs opacity-70">{timestamp}</div>
          
          {phoneNumber && platform && (
            <div className="flex items-center gap-1">
              <Badge 
                variant="outline" 
                className={`text-xs px-1 py-0 ${getPlatformColor(platform)}`}
              >
                <MessageCircle className="w-2 h-2 mr-1" />
                {getPlatformLabel(platform)}
              </Badge>
              <Badge variant="outline" className="text-xs px-1 py-0">
                <Phone className="w-2 h-2 mr-1" />
                {phoneNumber.slice(-4)}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};