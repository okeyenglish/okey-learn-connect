import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ArrowLeft, RefreshCw, CheckCircle2, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TelegramCrmConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'phone' | 'code' | 'success';

const RESEND_COOLDOWN = 60; // seconds

// Mask phone for display: +7 955 *** ** 35
const maskPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return phone;
  const last2 = cleaned.slice(-2);
  const first4 = cleaned.slice(0, 4);
  return `+${first4[0]} ${first4.slice(1)} *** ** ${last2}`;
};

export const TelegramCrmConnectDialog: React.FC<TelegramCrmConnectDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneHash, setPhoneHash] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhone('');
      setPhoneHash('');
      setCode('');
      setName('');
      setError(null);
      setResendCooldown(0);
      setWebhookUrl(null);
      setCopied(false);
    }
  }, [open]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    setError(null);
    
    // Basic phone validation
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      setError('Введите корректный номер телефона');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('telegram-crm-send-code', {
        body: { phone: cleanedPhone },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Ошибка отправки кода');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Не удалось отправить код');
      }

      setPhoneHash(data.phone_hash || '');
      setStep('code');
      setResendCooldown(RESEND_COOLDOWN);
      
      toast({
        title: 'Код отправлен',
        description: 'Проверьте сообщения в Telegram',
      });
    } catch (err: any) {
      console.error('Send code error:', err);
      setError(err.message || 'Ошибка отправки кода');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = useCallback(async (verifyCode: string) => {
    if (verifyCode.length !== 5) return;
    
    setError(null);
    setIsLoading(true);

    const cleanedPhone = phone.replace(/\D/g, '');
    const integrationName = name.trim() || `Telegram ${cleanedPhone.slice(-4)}`;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('telegram-crm-verify-code', {
        body: {
          phone: cleanedPhone,
          code: verifyCode,
          phone_hash: phoneHash,
          name: integrationName,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Ошибка проверки кода');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Неверный код');
      }

      // Generate webhook URL from the returned integration data
      const baseUrl = 'https://api.academyos.ru/functions/v1';
      // The verify-code function returns integration_id, we need webhook_key from settings
      // Use a predictable URL based on the webhook_key that was created
      if (data.webhook_key) {
        setWebhookUrl(`${baseUrl}/telegram-crm-webhook?key=${data.webhook_key}`);
      }

      setStep('success');
      toast({
        title: 'Успешно!',
        description: 'Telegram аккаунт подключен',
      });
      
      // Don't auto-close - let user copy webhook first
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err.message || 'Неверный код');
      setCode(''); // Reset code on error
    } finally {
      setIsLoading(false);
    }
  }, [phone, phoneHash, name, onSuccess, onOpenChange, toast]);

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    await handleSendCode();
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 5) {
      handleVerifyCode(value);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            Подключение Telegram
          </DialogTitle>
          <DialogDescription>
            {step === 'phone' && 'Введите номер телефона Telegram аккаунта'}
            {step === 'code' && `Код отправлен на ${maskPhone(phone)}`}
            {step === 'success' && 'Интеграция успешно настроена'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Phone Input */}
          {step === 'phone' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Номер телефона</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 955 073 53 35"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Название интеграции (необязательно)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Основной аккаунт"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                className="w-full"
                onClick={handleSendCode}
                disabled={isLoading || !phone.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Отправить код
              </Button>
            </>
          )}

          {/* Step 2: Code Verification */}
          {step === 'code' && (
            <>
              <div className="flex flex-col items-center space-y-4">
                <InputOTP
                  maxLength={5}
                  value={code}
                  onChange={handleCodeChange}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                  </InputOTPGroup>
                </InputOTP>

                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Проверка кода...</span>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-muted-foreground"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {resendCooldown > 0
                    ? `Отправить заново (${resendCooldown} сек)`
                    : 'Отправить заново'}
                </Button>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Изменить номер
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-lg font-medium">Аккаунт подключен!</p>
              
              {webhookUrl && (
                <div className="w-full space-y-2">
                  <Label className="text-sm font-medium">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        toast({
                          title: 'Скопировано',
                          description: 'Webhook URL скопирован в буфер обмена',
                        });
                      }}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Используйте этот URL для настройки вебхука в Telegram CRM
                  </p>
                </div>
              )}
              
              <Button
                className="w-full mt-4"
                onClick={() => {
                  onSuccess?.();
                  onOpenChange(false);
                }}
              >
                Готово
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
