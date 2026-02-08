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

// Pattern to match _success messages like "xxx_success 1500", "gnb3mwhqcq_success 11990", or "tbank_success 10"
const SUCCESS_PAYMENT_REGEX = /^[a-z0-9_]+_success\s+(\d+(?:\.\d+)?)$/i;

// Pattern for T-Bank specific success format
const TBANK_SUCCESS_REGEX = /^tbank_success\s+(\d+(?:\.\d+)?)$/i;

// Pattern to match crm_state_changed messages (internal salebot comments)
const CRM_STATE_CHANGED_REGEX = /^crm_state_changed\b/i;

// Check if a message should be hidden (internal salebot messages)
export const isHiddenSalebotMessage = (message: string | null | undefined): boolean => {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return CRM_STATE_CHANGED_REGEX.test(trimmed);
};

// Check if a message is a success payment (including T-Bank)
export const isSuccessPayment = (message: string | null | undefined): boolean => {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return SUCCESS_PAYMENT_REGEX.test(trimmed) || TBANK_SUCCESS_REGEX.test(trimmed);
};

// Get payment amount from success message
const getPaymentAmount = (message: string): number | null => {
  const match = message.trim().match(SUCCESS_PAYMENT_REGEX) || message.trim().match(TBANK_SUCCESS_REGEX);
  return match ? parseFloat(match[1]) : null;
};

// Check if this is a T-Bank payment
const isTBankPayment = (message: string): boolean => {
  return TBANK_SUCCESS_REGEX.test(message.trim());
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
    const isTBank = isTBankPayment(message);
    return (
      <div className="flex justify-center my-2">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2 max-w-[320px]">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-300 text-sm">
              {isTBank ? 'Оплата через Т-Банк' : 'Успешная оплата'}
            </span>
          </div>
          <p className="text-green-800 dark:text-green-200 text-sm">
            Оплата на сумму {paymentAmount.toLocaleString('ru-RU')}₽ прошла успешно! Большое спасибо.
          </p>
          <span className="text-green-600/60 dark:text-green-400/60 text-[10px] mt-1 block">{time}</span>
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
