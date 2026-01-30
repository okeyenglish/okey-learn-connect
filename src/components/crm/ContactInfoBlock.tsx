import { Phone, Mail, Copy, Check, Star } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

// Messenger SVG icons
const WhatsAppIcon = ({ active }: { active: boolean }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={`h-4 w-4 transition-colors ${active ? 'text-green-500' : 'text-muted-foreground/40'}`}
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = ({ active }: { active: boolean }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={`h-4 w-4 transition-colors ${active ? 'text-blue-500' : 'text-muted-foreground/40'}`}
    fill="currentColor"
  >
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const MaxIcon = ({ active }: { active: boolean }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={`h-4 w-4 transition-colors ${active ? 'text-purple-500' : 'text-muted-foreground/40'}`}
    fill="currentColor"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
  </svg>
);

export interface PhoneNumberData {
  id: string;
  phone: string;
  isPrimary: boolean;
  isWhatsappEnabled?: boolean;
  isTelegramEnabled?: boolean;
  whatsappChatId?: string | null;
  telegramChatId?: string | null;
  telegramUserId?: number | null;
  maxChatId?: string | null;
}

interface ContactInfoBlockProps {
  phoneNumbers: PhoneNumberData[];
  email?: string;
  onMessengerClick?: (phoneId: string, messenger: 'whatsapp' | 'telegram' | 'max') => void;
  onCallClick?: (phone: string) => void;
  // Client-level messenger data (fallback when phone-level data is missing)
  clientTelegramChatId?: string | null;
  clientTelegramUserId?: number | null;
  clientWhatsappChatId?: string | null;
  clientMaxChatId?: string | null;
}

export const ContactInfoBlock = ({ 
  phoneNumbers, 
  email,
  onMessengerClick,
  onCallClick,
  clientTelegramChatId,
  clientTelegramUserId,
  clientWhatsappChatId,
  clientMaxChatId,
}: ContactInfoBlockProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Extract phone from WhatsApp chat ID (format: 79161234567@c.us)
  const extractPhoneFromWhatsappId = (whatsappId: string | null | undefined): string | null => {
    if (!whatsappId) return null;
    // Remove @c.us suffix and extract digits
    const digits = whatsappId.replace(/@c\.us$/i, '').replace(/\D/g, '');
    // Valid phone should be 10-15 digits
    if (digits.length >= 10 && digits.length <= 15) {
      return digits;
    }
    return null;
  };

  // Create virtual phone number from client-level messenger data if no phone numbers exist
  const effectivePhoneNumbers = useMemo(() => {
    if (phoneNumbers.length > 0) {
      return phoneNumbers;
    }
    
    // Try to extract phone from WhatsApp chat ID
    const extractedPhone = extractPhoneFromWhatsappId(clientWhatsappChatId);
    
    if (extractedPhone || clientTelegramChatId || clientTelegramUserId || clientMaxChatId) {
      // Create a virtual phone entry for messenger-only contacts
      return [{
        id: 'virtual-messenger-contact',
        phone: extractedPhone || '', // May be empty if only Telegram/MAX
        isPrimary: true,
        isWhatsappEnabled: !!clientWhatsappChatId,
        isTelegramEnabled: !!clientTelegramChatId || !!clientTelegramUserId,
        whatsappChatId: clientWhatsappChatId,
        telegramChatId: clientTelegramChatId,
        telegramUserId: clientTelegramUserId,
        maxChatId: clientMaxChatId,
      }] as PhoneNumberData[];
    }
    
    return [];
  }, [phoneNumbers, clientWhatsappChatId, clientTelegramChatId, clientTelegramUserId, clientMaxChatId]);

  const isSingleNumber = effectivePhoneNumbers.length === 1;

  const handleCopyPhone = async (phone: string, phoneId: string) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(phoneId);
      toast.success("Номер скопирован");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const getMessengerStatus = (phoneNumber: PhoneNumberData, messenger: 'whatsapp' | 'telegram' | 'max') => {
    // Check phone-level first, then client-level fallback
    if (messenger === 'whatsapp') {
      return phoneNumber.isWhatsappEnabled || !!phoneNumber.whatsappChatId || !!clientWhatsappChatId;
    }
    if (messenger === 'telegram') {
      return phoneNumber.isTelegramEnabled || !!phoneNumber.telegramChatId || !!phoneNumber.telegramUserId || !!clientTelegramChatId || !!clientTelegramUserId;
    }
    if (messenger === 'max') {
      return !!phoneNumber.maxChatId || !!clientMaxChatId;
    }
    
    return false;
  };

  // Get messenger ID for display (phone-level or client-level)
  const getTelegramId = (phoneNumber: PhoneNumberData): string | number | null => {
    return phoneNumber.telegramUserId || phoneNumber.telegramChatId || clientTelegramUserId || clientTelegramChatId || null;
  };
  
  const getWhatsappId = (phoneNumber: PhoneNumberData): string | null => {
    return phoneNumber.whatsappChatId || clientWhatsappChatId || null;
  };

  const handleMessengerClick = (phoneId: string, messenger: 'whatsapp' | 'telegram' | 'max', isActive: boolean) => {
    if (!isActive) return;
    onMessengerClick?.(phoneId, messenger);
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as +7 XXX XXX-XX-XX
    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
      return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
    }
    
    // Format as +X XXX XXX-XX-XX for other formats
    if (digits.length >= 10) {
      return `+${digits}`;
    }
    
    return phone;
  };

  if (effectivePhoneNumbers.length === 0 && !email) {
    return (
      <div className="text-sm text-muted-foreground">
        Нет контактных данных
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {effectivePhoneNumbers.map((phoneNumber) => {
          const waActive = getMessengerStatus(phoneNumber, 'whatsapp');
          const tgActive = getMessengerStatus(phoneNumber, 'telegram');
          const maxActive = getMessengerStatus(phoneNumber, 'max');
          const hasPhone = !!phoneNumber.phone;
          
          return (
            <div key={phoneNumber.id} className="flex items-center gap-2 group">
              {hasPhone ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`p-0.5 rounded transition-colors flex-shrink-0 ${
                          onCallClick && hasPhone
                            ? 'hover:bg-green-50 hover:text-green-600 cursor-pointer' 
                            : 'cursor-default'
                        }`}
                        onClick={() => hasPhone && onCallClick?.(phoneNumber.phone)}
                        disabled={!onCallClick || !hasPhone}
                      >
                        <Phone className={`h-3.5 w-3.5 transition-colors ${
                          onCallClick && hasPhone ? 'text-muted-foreground hover:text-green-600' : 'text-muted-foreground'
                        }`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {onCallClick ? 'Позвонить через OnlinePBX' : 'Телефон'}
                    </TooltipContent>
                  </Tooltip>
                  
                  <span 
                    className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleCopyPhone(phoneNumber.phone, phoneNumber.id)}
                  >
                    {formatPhone(phoneNumber.phone)}
                  </span>
                  
                  {copiedId === phoneNumber.id ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy 
                      className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                      onClick={() => handleCopyPhone(phoneNumber.phone, phoneNumber.id)}
                    />
                  )}
                  
                  {phoneNumber.isPrimary && effectivePhoneNumbers.length > 1 && (
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  Номер не указан
                </span>
              )}
              
              <div className="flex items-center gap-1 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`p-1 rounded transition-colors ${waActive ? 'hover:bg-green-50 cursor-pointer' : 'cursor-default'}`}
                      onClick={() => handleMessengerClick(phoneNumber.id, 'whatsapp', waActive)}
                      disabled={!waActive}
                    >
                      <WhatsAppIcon active={waActive} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    {waActive ? (
                      <div>
                        <div>Открыть WhatsApp чат</div>
                        <div className="text-muted-foreground mt-0.5">
                          {getWhatsappId(phoneNumber) 
                            ? `ID: ${String(getWhatsappId(phoneNumber)).replace('@c.us', '')}` 
                            : `Тел: ${phoneNumber.phone}`}
                        </div>
                      </div>
                    ) : 'WhatsApp не подключен'}
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`p-1 rounded transition-colors ${tgActive ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'}`}
                      onClick={() => handleMessengerClick(phoneNumber.id, 'telegram', tgActive)}
                      disabled={!tgActive}
                    >
                      <TelegramIcon active={tgActive} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    {tgActive ? (
                      <div>
                        <div>Открыть Telegram чат</div>
                        <div className="text-muted-foreground mt-0.5">
                          {(() => {
                            const tgId = getTelegramId(phoneNumber);
                            if (tgId) return `ID: ${tgId}`;
                            if (phoneNumber.phone) return `Тел: ${phoneNumber.phone}`;
                            return 'Подключен';
                          })()}
                        </div>
                      </div>
                    ) : 'Telegram не подключен'}
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`p-1 rounded transition-colors ${maxActive ? 'hover:bg-purple-50 cursor-pointer' : 'cursor-default'}`}
                      onClick={() => handleMessengerClick(phoneNumber.id, 'max', maxActive)}
                      disabled={!maxActive}
                    >
                      <MaxIcon active={maxActive} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {maxActive ? 'Открыть MAX чат' : 'MAX не подключен'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
        
        {email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{email}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
