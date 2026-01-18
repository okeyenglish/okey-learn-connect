import { Phone, CreditCard, UserCheck, Settings, Bell, RefreshCw, AlertCircle, Banknote } from "lucide-react";

interface SalebotCallbackMessageProps {
  message: string;
  time: string;
}

// Map of Salebot callback types to their labels and icons
const CALLBACK_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  call_ended: { label: 'Звонок завершён', icon: Phone, color: 'text-muted-foreground' },
  call_started: { label: 'Звонок начат', icon: Phone, color: 'text-green-600' },
  new_pay: { label: 'Новый платёж', icon: CreditCard, color: 'text-green-600' },
  set_status: { label: 'Статус изменён', icon: UserCheck, color: 'text-blue-600' },
  status_changed: { label: 'Статус изменён', icon: UserCheck, color: 'text-blue-600' },
  settings_updated: { label: 'Настройки обновлены', icon: Settings, color: 'text-muted-foreground' },
  reminder: { label: 'Напоминание', icon: Bell, color: 'text-amber-600' },
  sync: { label: 'Синхронизация', icon: RefreshCw, color: 'text-muted-foreground' },
};

// Pattern to match _success messages like "xxx_success 1500" or "gnb3mwhqcq_success 11990"
const SUCCESS_PAYMENT_REGEX = /^[a-z0-9]+_success\s+(\d+)$/i;

// Pattern to match crm_state_changed messages (internal salebot comments)
const CRM_STATE_CHANGED_REGEX = /^crm_state_changed\b/i;

// Check if a message should be hidden (internal salebot messages)
export const isHiddenSalebotMessage = (message: string | null | undefined): boolean => {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return CRM_STATE_CHANGED_REGEX.test(trimmed);
};

// Check if a message is a success payment
export const isSuccessPayment = (message: string | null | undefined): boolean => {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return SUCCESS_PAYMENT_REGEX.test(trimmed);
};

// Get payment amount from success message
const getPaymentAmount = (message: string): number | null => {
  const match = message.trim().match(SUCCESS_PAYMENT_REGEX);
  return match ? parseInt(match[1], 10) : null;
};

// Check if a message is a Salebot callback
export const isSalebotCallback = (message: string | null | undefined): boolean => {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim().toLowerCase();
  if (!trimmed) return false;
  return Object.keys(CALLBACK_CONFIG).some(key => trimmed === key || trimmed.startsWith(key + ':'));
};

// Get callback type from message
const getCallbackType = (message: string): string | null => {
  if (!message) return null;
  const trimmed = message.trim().toLowerCase();
  for (const key of Object.keys(CALLBACK_CONFIG)) {
    if (trimmed === key || trimmed.startsWith(key + ':')) {
      return key;
    }
  }
  return null;
};

export const SalebotCallbackMessage = ({ message, time }: SalebotCallbackMessageProps) => {
  // Check if it's a success payment message
  const paymentAmount = getPaymentAmount(message);
  if (paymentAmount !== null) {
    return (
      <div className="flex justify-center my-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Banknote className="h-3 w-3 text-green-600" />
          <span className="text-green-600/80">Успешная оплата на {paymentAmount.toLocaleString('ru-RU')}₽</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-muted-foreground/40">{time}</span>
        </div>
      </div>
    );
  }

  const callbackType = getCallbackType(message);
  
  if (!callbackType) {
    // Fallback for unknown callback types - still show as subtle system message
    return (
      <div className="flex justify-center my-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <AlertCircle className="h-3 w-3" />
          <span className="italic">{message}</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-muted-foreground/40">{time}</span>
        </div>
      </div>
    );
  }

  const config = CALLBACK_CONFIG[callbackType];
  const Icon = config.icon;

  return (
    <div className="flex justify-center my-1">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span className="text-muted-foreground/70">{config.label}</span>
        <span className="text-muted-foreground/40">•</span>
        <span className="text-muted-foreground/40">{time}</span>
      </div>
    </div>
  );
};
