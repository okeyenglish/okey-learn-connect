export interface PhoneNumber {
  id: string;
  phone: string;
  phoneType: 'mobile' | 'work' | 'home' | 'other';
  isPrimary: boolean;
  isWhatsappEnabled: boolean;
  isTelegramEnabled: boolean;
}