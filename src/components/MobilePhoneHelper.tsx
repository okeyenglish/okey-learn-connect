import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, PhoneCall, ArrowLeft, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MobilePhoneHelperProps {
  phoneNumber: string;
  onCallEnd?: () => void;
}

export const MobilePhoneHelper: React.FC<MobilePhoneHelperProps> = ({ phoneNumber, onCallEnd }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isRequestingCallback, setIsRequestingCallback] = useState(false);

  const handleDirectCall = () => {
    // Clean phone number for tel: link
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Create tel: link for native phone app
    window.location.href = `tel:${cleanNumber}`;
    
    toast({
      title: "Звонок инициирован",
      description: "Открывается приложение для звонков",
    });
    
    onCallEnd?.();
    setIsOpen(false);
  };

  const handleCallbackRequest = async () => {
    if (!user) return;
    
    setIsRequestingCallback(true);
    
    try {
      // Call edge function to initiate callback
      const { data, error } = await supabase.functions.invoke('request-callback', {
        body: {
          to_number: phoneNumber,
          from_user: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Запрос отправлен",
        description: "Система инициирует обратный звонок в течение 30 секунд",
      });
      
      onCallEnd?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Callback request failed:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить запрос на обратный звонок",
        variant: "destructive",
      });
    } finally {
      setIsRequestingCallback(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Звонок с мобильного устройства
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Номер: {phoneNumber}</div>
            <div className="text-sm text-muted-foreground mb-4">
              Выберите способ звонка:
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleDirectCall}
              className="w-full h-12 text-left justify-start"
              variant="outline"
            >
              <PhoneCall className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Прямой звонок</div>
                <div className="text-xs text-muted-foreground">
                  Открыть приложение для звонков
                </div>
              </div>
            </Button>

            <Button
              onClick={handleCallbackRequest}
              disabled={isRequestingCallback}
              className="w-full h-12 text-left justify-start"
              variant="outline"
            >
              <ArrowLeft className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">
                  {isRequestingCallback ? 'Отправка запроса...' : 'Обратный звонок'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Система перезвонит вам через SIP
                </div>
              </div>
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            💡 Для полной функциональности SIP на мобильном устройстве рекомендуется установить приложение SessionTalk Softphone
          </div>

          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="w-full"
          >
            Отменить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};