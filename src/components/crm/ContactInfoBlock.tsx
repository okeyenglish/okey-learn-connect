import { Phone, Mail, Copy, Check, Star, Edit2, Save, X, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import maxIconSrc from "@/assets/max-icon.webp";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MaskedPhoneInput, extractPhoneDigits, isValidPhone, formatPhoneInput } from "@/components/ui/masked-phone-input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isLikelyPhoneNumber } from "@/utils/phoneNormalization";

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
  <img 
    src={maxIconSrc} 
    alt="MAX" 
    className={`h-4 w-4 rounded-full object-cover transition-opacity ${active ? 'opacity-100' : 'opacity-40'}`}
  />
);

export interface PhoneNumberData {
  id: string;
  phone: string;
  isPrimary: boolean;
  isWhatsappEnabled?: boolean;
  isTelegramEnabled?: boolean;
  isMaxEnabled?: boolean;
  whatsappChatId?: string | null;
  telegramChatId?: string | null;
  telegramUserId?: number | null;
  maxChatId?: string | null;
  isVirtual?: boolean; // Flag to identify virtual (extracted) contacts
}

interface PhoneSaveData {
  phone: string;
  whatsappChatId?: string | null;
  telegramChatId?: string | null;
  telegramUserId?: number | null;
}

interface ContactInfoBlockProps {
  phoneNumbers: PhoneNumberData[];
  email?: string;
  onMessengerClick?: (phoneId: string, messenger: 'whatsapp' | 'telegram' | 'max') => void;
  onCallClick?: (phone: string) => void;
  onPhoneSave?: (data: PhoneSaveData) => void; // Callback to save new/edited phone with messenger data
  onUnlinkMessenger?: (messenger: 'whatsapp' | 'telegram' | 'max') => void;
  onUnlinkEmail?: () => void;
  onEmailClick?: () => void;
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
  onPhoneSave,
  onUnlinkMessenger,
  onUnlinkEmail,
  onEmailClick,
  clientTelegramChatId,
  clientTelegramUserId,
  clientWhatsappChatId,
  clientMaxChatId,
}: ContactInfoBlockProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPhone, setEditedPhone] = useState("");
  const [showMessengers, setShowMessengers] = useState(false);
  
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

  // Create virtual phone number from client-level messenger data if no real phone numbers exist
  const effectivePhoneNumbers = useMemo(() => {
    const result: PhoneNumberData[] = [];
    
    // Check if we have any real phone numbers (non-empty phone strings that are VALID phones)
    // Filter out Telegram IDs that were incorrectly saved as phone numbers
    const hasRealPhones = phoneNumbers.some(p => p.phone && p.phone.trim() !== '' && isLikelyPhoneNumber(p.phone));
    
    if (hasRealPhones) {
      // Filter out empty phone entries and invalid phone numbers (like Telegram IDs)
      // Keep entries with messenger data even if phone is invalid
      const validPhones = phoneNumbers.filter(p => {
        const hasValidPhone = p.phone && isLikelyPhoneNumber(p.phone);
        const hasMessengerData = p.whatsappChatId || p.telegramChatId || p.telegramUserId || p.maxChatId;
        return hasValidPhone || hasMessengerData;
      }).map(p => {
        // If phone is not valid (e.g., Telegram ID stored as phone), clear it for display
        if (p.phone && !isLikelyPhoneNumber(p.phone)) {
          return { ...p, phone: '' };
        }
        // Strip telegram/max data from phone rows - they'll get their own rows
        return { ...p, telegramChatId: null, telegramUserId: null, isTelegramEnabled: false, maxChatId: null, isMaxEnabled: false };
      });
      // Only keep rows that have a valid phone (messenger-only rows without phone are handled below)
      result.push(...validPhones.filter(p => p.phone && p.phone.trim() !== ''));
    } else {
      // No real phone numbers - check for messenger-only data
      
      // Try to extract phone from WhatsApp chat ID
      const extractedPhone = extractPhoneFromWhatsappId(clientWhatsappChatId);
      
      // Also try from phone numbers with whatsappChatId but empty phone
      const phoneWithWhatsapp = phoneNumbers.find(p => p.whatsappChatId && !p.phone);
      const extractedFromPhoneRecord = phoneWithWhatsapp 
        ? extractPhoneFromWhatsappId(phoneWithWhatsapp.whatsappChatId)
        : null;
      
      const finalPhone = extractedPhone || extractedFromPhoneRecord || '';
      
      // Create entry for WhatsApp if it has phone
      if (finalPhone && clientWhatsappChatId) {
        result.push({
          id: 'virtual-whatsapp-contact',
          phone: finalPhone,
          isPrimary: true,
          isWhatsappEnabled: true,
          isTelegramEnabled: false,
          whatsappChatId: clientWhatsappChatId,
          telegramChatId: null,
          telegramUserId: null,
          maxChatId: null,
          isVirtual: true,
        });
      }
      
      // Fallback: if no phone and no specific messenger entries created, create combined
      if (result.length === 0 && !clientTelegramChatId && !clientTelegramUserId && !clientMaxChatId && (finalPhone || clientWhatsappChatId)) {
        result.push({
          id: 'virtual-messenger-contact',
          phone: finalPhone,
          isPrimary: true,
          isWhatsappEnabled: !!clientWhatsappChatId,
          isTelegramEnabled: false,
          whatsappChatId: clientWhatsappChatId,
          telegramChatId: null,
          telegramUserId: null,
          maxChatId: null,
          isVirtual: true,
        });
      }
    }
    
    // Always add Telegram ID as separate row if exists (client-level or phone-level)
    const tgUserId = clientTelegramUserId || phoneNumbers.find(p => p.telegramUserId)?.telegramUserId;
    const tgChatId = clientTelegramChatId || phoneNumbers.find(p => p.telegramChatId)?.telegramChatId;
    if (tgUserId || tgChatId) {
      result.push({
        id: 'virtual-telegram-only',
        phone: '',
        isPrimary: false,
        isWhatsappEnabled: false,
        isTelegramEnabled: true,
        whatsappChatId: null,
        telegramChatId: tgChatId || null,
        telegramUserId: tgUserId || null,
        maxChatId: null,
        isVirtual: true,
      });
    }
    
    // Always add MAX ID as separate row if exists
    const maxId = clientMaxChatId || phoneNumbers.find(p => p.maxChatId)?.maxChatId;
    if (maxId) {
      result.push({
        id: 'virtual-max-only',
        phone: '',
        isPrimary: false,
        isWhatsappEnabled: false,
        isTelegramEnabled: false,
        isMaxEnabled: true,
        whatsappChatId: null,
        telegramChatId: null,
        telegramUserId: null,
        maxChatId: maxId,
        isVirtual: true,
      });
    }
    
    return result;
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
      return phoneNumber.isMaxEnabled || !!phoneNumber.maxChatId || !!clientMaxChatId;
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

  const handleStartEdit = (phone: string) => {
    // Format existing phone for edit
    const formatted = phone ? formatPhoneInput(phone) : '';
    setEditedPhone(formatted);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPhone("");
  };

  const handleSavePhone = () => {
    if (isValidPhone(editedPhone)) {
      const cleanPhone = extractPhoneDigits(editedPhone);
      // Pass phone with messenger data from client-level
      onPhoneSave?.({
        phone: cleanPhone,
        whatsappChatId: clientWhatsappChatId,
        telegramChatId: clientTelegramChatId,
        telegramUserId: clientTelegramUserId,
      });
      setIsEditing(false);
      setEditedPhone("");
      toast.success("Номер сохранён");
    } else {
      toast.error("Введите корректный номер телефона (минимум 10 цифр)");
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    // Remove all non-digits
    let digits = phone.replace(/\D/g, '');

    // Normalize RU phones for display:
    //  - 10 digits starting with 9 => add leading 7
    //  - 11 digits starting with 8 => replace with 7
    if (digits.length === 10 && digits.startsWith('9')) {
      digits = `7${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('8')) {
      digits = `7${digits.slice(1)}`;
    }

    if (digits.length >= 10) return `+${digits}`;

    return phone;
  };

  if (effectivePhoneNumbers.length === 0 && !email) {
    return (
      <div className="text-sm text-muted-foreground">
        Нет контактных данных
      </div>
    );
  }

  // Split effective phone numbers into phone rows and messenger-only rows
  const phoneRows = effectivePhoneNumbers.filter(p => !!p.phone);
  const messengerRows = effectivePhoneNumbers.filter(p => !p.phone);
  
  // Check if there are any messengers to show
  const hasMaxId = !!clientMaxChatId || messengerRows.some(p => p.maxChatId);
  const hasMaxFallbackPhone = !hasMaxId && phoneRows.length > 0; // Show MAX with phone fallback
  const hasMessengers = messengerRows.length > 0 || hasMaxFallbackPhone ||
    phoneRows.some(p => getMessengerStatus(p, 'whatsapp') || getMessengerStatus(p, 'telegram') || getMessengerStatus(p, 'max'));

  // Count active messengers for badge
  const messengerCount = (() => {
    let count = 0;
    if (clientWhatsappChatId || phoneRows.some(p => p.whatsappChatId)) count++;
    if (clientTelegramChatId || clientTelegramUserId || messengerRows.some(p => p.telegramChatId || p.telegramUserId)) count++;
    if (clientMaxChatId || messengerRows.some(p => p.maxChatId)) count++;
    return count;
  })();

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Phone rows - always visible */}
        {phoneRows.map((phoneNumber) => (
          <div key={phoneNumber.id} className="flex items-center gap-2 group">
            {isEditing && phoneNumber.isVirtual ? (
              <div className="flex items-center gap-2 flex-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <MaskedPhoneInput
                  value={editedPhone}
                  onChange={setEditedPhone}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePhone();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={handleSavePhone}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={handleCancelEdit}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`p-0.5 rounded transition-colors flex-shrink-0 ${
                        onCallClick ? 'hover:bg-green-50 hover:text-green-600 cursor-pointer' : 'cursor-default'
                      }`}
                      onClick={() => onCallClick?.(phoneNumber.phone)}
                      disabled={!onCallClick}
                    >
                      <Phone className={`h-3.5 w-3.5 transition-colors ${
                        onCallClick ? 'text-muted-foreground hover:text-green-600' : 'text-muted-foreground'
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
                
                {phoneNumber.isVirtual && onPhoneSave && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 hover:bg-muted"
                        onClick={() => handleStartEdit(phoneNumber.phone)}
                      >
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Редактировать номер
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {phoneNumber.isPrimary && phoneRows.length > 1 && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
              </>
            )}
          </div>
        ))}

        {/* No phone - show edit */}
        {phoneRows.length === 0 && !messengerRows.some(r => r.phone) && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <MaskedPhoneInput
                  value={editedPhone}
                  onChange={setEditedPhone}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePhone();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={handleSavePhone}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={handleCancelEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <span className="text-sm text-muted-foreground italic">Номер не указан</span>
                {onPhoneSave && (
                  <button className="p-0.5 rounded hover:bg-muted" onClick={() => handleStartEdit("")}>
                    <Edit2 className="h-3 w-3 text-primary" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Messengers toggle button */}
        {hasMessengers && (
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
            onClick={() => setShowMessengers(!showMessengers)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Мессенджеры</span>
            {messengerCount > 0 && (
              <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0 text-[10px] font-medium">
                {messengerCount}
              </span>
            )}
            {showMessengers ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Collapsible messenger section */}
        {showMessengers && (
          <div className="space-y-1.5 pl-1 border-l-2 border-muted ml-1">
            {/* WhatsApp row */}
            {phoneRows.map((phoneNumber) => {
              const waActive = getMessengerStatus(phoneNumber, 'whatsapp');
              if (!waActive) return null;
              return (
                <div key={`wa-${phoneNumber.id}`} className="flex items-center gap-2 group">
                  <button
                    className="flex items-center gap-2 hover:bg-green-50 rounded px-1 -ml-1 transition-colors"
                    onClick={() => handleMessengerClick(phoneNumber.id, 'whatsapp', true)}
                  >
                    <WhatsAppIcon active={true} />
                    <span className="text-sm font-medium text-green-700">
                      {getWhatsappId(phoneNumber) 
                        ? String(getWhatsappId(phoneNumber)).replace('@c.us', '')
                        : formatPhone(phoneNumber.phone)}
                    </span>
                  </button>
                  {onUnlinkMessenger && (
                    <button
                      className="p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive ml-auto"
                      onClick={(e) => { e.stopPropagation(); onUnlinkMessenger('whatsapp'); }}
                      title="Отвязать WhatsApp"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Telegram ID row */}
            {messengerRows.filter(p => (p.telegramUserId || p.telegramChatId)).map((phoneNumber) => (
              <div key={phoneNumber.id} className="flex items-center gap-2 group">
                <button
                  className="flex items-center gap-2 hover:bg-blue-50 rounded px-1 -ml-1 transition-colors"
                  onClick={() => handleMessengerClick(phoneNumber.id, 'telegram', true)}
                >
                  <TelegramIcon active={true} />
                  <span className="text-sm font-medium text-blue-600">
                    ID: {getTelegramId(phoneNumber)}
                  </span>
                </button>
                {onUnlinkMessenger && (
                  <button
                    className="p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive ml-auto"
                    onClick={(e) => { e.stopPropagation(); onUnlinkMessenger('telegram'); }}
                    title="Отвязать Telegram"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {/* MAX row - show ID if available, otherwise show phone as fallback */}
            {hasMaxId ? (
              messengerRows.filter(p => p.maxChatId).map((phoneNumber) => (
                <div key={phoneNumber.id} className="flex items-center gap-2 group">
                  <button
                    className="flex items-center gap-2 hover:bg-purple-50 rounded px-1 -ml-1 transition-colors"
                    onClick={() => handleMessengerClick(phoneNumber.id, 'max', true)}
                  >
                    <MaxIcon active={true} />
                    <span className="text-sm font-medium text-purple-600">
                      ID: {phoneNumber.maxChatId}
                    </span>
                  </button>
                  {onUnlinkMessenger && (
                    <button
                      className="p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive ml-auto"
                      onClick={(e) => { e.stopPropagation(); onUnlinkMessenger('max'); }}
                      title="Отвязать MAX"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            ) : phoneRows.length > 0 ? (
              <div className="flex items-center gap-2 group">
                <button
                  className="flex items-center gap-2 hover:bg-purple-50 rounded px-1 -ml-1 transition-colors"
                  onClick={() => handleMessengerClick(phoneRows[0].id, 'max', true)}
                >
                  <MaxIcon active={false} />
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatPhone(phoneRows[0].phone)}
                  </span>
                </button>
              </div>
            ) : null}

            {/* Email inside messengers */}
            {email && (
              <div className="flex items-center gap-2 group">
                <button
                  className="flex items-center gap-2 hover:bg-blue-50 rounded px-1 -ml-1 transition-colors"
                  onClick={() => onEmailClick?.()}
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">{email}</span>
                </button>
                {onUnlinkEmail && (
                  <button
                    className="p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive ml-auto"
                    onClick={(e) => { e.stopPropagation(); onUnlinkEmail(); }}
                    title="Удалить email"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Email outside messengers section if no messengers exist */}
        {!hasMessengers && email && (
          <div className="flex items-center gap-2 group">
            <button
              className="flex items-center gap-2 hover:bg-blue-50 rounded px-1 -ml-1 transition-colors"
              onClick={() => onEmailClick?.()}
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">{email}</span>
            </button>
            {onUnlinkEmail && (
              <button
                className="p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive ml-auto"
                onClick={(e) => { e.stopPropagation(); onUnlinkEmail(); }}
                title="Удалить email"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
