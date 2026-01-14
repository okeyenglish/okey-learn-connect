export interface PhoneNumber {
  id: string;
  phone: string;
  phoneType: 'mobile' | 'work' | 'home' | 'other';
  isPrimary: boolean;
  isWhatsappEnabled: boolean;
  isTelegramEnabled: boolean;
  // Messenger chat IDs
  whatsappChatId?: string | null;
  telegramChatId?: string | null;
  telegramUserId?: number | null;
  maxChatId?: string | null;
  maxUserId?: number | null;
  // Messenger avatars
  whatsappAvatarUrl?: string | null;
  telegramAvatarUrl?: string | null;
  maxAvatarUrl?: string | null;
}
