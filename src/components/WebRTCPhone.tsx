import React, { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/typedClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobilePhoneHelper } from "./MobilePhoneHelper";
import { getErrorMessage } from "@/lib/errorUtils";

interface OnlinePBXPhoneProps {
  phoneNumber?: string;
  onCallEnd?: () => void;
}

const OnlinePBXPhone: React.FC<OnlinePBXPhoneProps> = ({ phoneNumber, onCallEnd }) => {
  const [phoneInput, setPhoneInput] = useState(phoneNumber || "");
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'failed'>('idle');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (phoneNumber) {
      setPhoneInput(phoneNumber);
    }
  }, [phoneNumber]);

  const makeOnlinePBXCall = async () => {
    if (!phoneInput.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите номер телефона",
        variant: "destructive"
      });
      return;
    }

    try {
      setCallStatus('calling');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('onlinepbx-call', {
        body: { 
          to_number: phoneInput,
          from_user: user.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setCallStatus('connected');
        toast({
          title: "Звонок совершен",
          description: "Звонок инициирован через OnlinePBX. Поднимите трубку.",
        });
        
        // Auto close dialog after successful call
        setTimeout(() => {
          setIsDialogOpen(false);
          setCallStatus('idle');
          onCallEnd?.();
        }, 3000);
      } else {
        throw new Error(data?.error || 'Failed to initiate call');
      }
    } catch (error: unknown) {
      console.error('OnlinePBX call failed:', error);
      setCallStatus('failed');
      toast({
        title: "Ошибка звонка",
        description: getErrorMessage(error),
        variant: "destructive"
      });
      
      setTimeout(() => setCallStatus('idle'), 3000);
    }
  };

  const cancelCall = () => {
    setCallStatus('idle');
    setIsDialogOpen(false);
    onCallEnd?.();
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'calling': return 'bg-yellow-500';
      case 'connected': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling': return 'Звонок...';
      case 'connected': return 'Звонок совершен';
      case 'failed': return 'Ошибка';
      default: return 'Готов к звонку';
    }
  };

  // Show mobile helper for mobile devices
  if (isMobile) {
    return <MobilePhoneHelper phoneNumber={phoneInput} onCallEnd={onCallEnd} />;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <Phone className="h-4 w-4" />
          Позвонить
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Звонок через OnlinePBX
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                <span className="text-sm text-muted-foreground">
                  {getStatusText()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Phone Input */}
          <div className="space-y-2">
            <label htmlFor="phone-input" className="text-sm font-medium">
              Номер телефона
            </label>
            <Input
              id="phone-input"
              type="tel"
              placeholder="+7 (999) 999-99-99"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              disabled={callStatus === 'calling' || callStatus === 'connected'}
            />
          </div>

          {/* Call Controls */}
          <div className="flex gap-2 justify-center">
            {callStatus === 'idle' || callStatus === 'failed' ? (
              <Button 
                onClick={makeOnlinePBXCall}
                disabled={!phoneInput.trim()}
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                Позвонить
              </Button>
            ) : callStatus === 'calling' ? (
              <Button 
                onClick={cancelCall}
                variant="destructive"
                className="flex-1"
              >
                Отменить
              </Button>
            ) : (
              <Button 
                onClick={cancelCall}
                variant="secondary"
                className="flex-1"
              >
                Закрыть
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Звонок будет совершен через стационарную трубку менеджера
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnlinePBXPhone;