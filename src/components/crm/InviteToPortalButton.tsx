import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Send, Loader2, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";
import { toast } from "@/hooks/use-toast";

interface InviteToPortalButtonProps {
  clientId: string;
  clientName: string;
  phone?: string | null;
  firstName?: string | null;
}

export const InviteToPortalButton = ({ 
  clientId, 
  clientName,
  phone,
  firstName
}: InviteToPortalButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    invite_url?: string;
    message_sent?: boolean;
  } | null>(null);

  const handleInvite = async (messenger: 'whatsapp' | 'sms' = 'whatsapp') => {
    if (!phone) {
      toast({
        title: "Ошибка",
        description: "У клиента нет номера телефона",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("Не авторизован");
      }

      const response = await supabase.functions.invoke('send-portal-invitation', {
        body: {
          client_id: clientId,
          phone: phone,
          first_name: firstName || clientName.split(' ')[0],
          messenger
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setResult({
        success: true,
        invite_url: response.data.invite_url,
        message_sent: response.data.message_sent
      });

      toast({
        title: "Приглашение отправлено",
        description: response.data.message_sent 
          ? "Сообщение успешно отправлено через WhatsApp"
          : "Ссылка создана. Скопируйте и отправьте вручную."
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось отправить приглашение",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (result?.invite_url) {
      await navigator.clipboard.writeText(result.invite_url);
      toast({
        title: "Скопировано",
        description: "Ссылка скопирована в буфер обмена"
      });
    }
  };

  const openWhatsApp = () => {
    if (result?.invite_url && phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Здравствуйте${firstName ? `, ${firstName}` : ''}!\n\nПриглашаем вас в личный кабинет нашей школы.\n\nПерейдите по ссылке для регистрации:\n${result.invite_url}`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/10"
        >
          <UserPlus className="h-4 w-4" />
          Пригласить в портал
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Приглашение в личный кабинет</DialogTitle>
          <DialogDescription>
            Отправьте приглашение клиенту {clientName} для регистрации в личном кабинете.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!result ? (
            <>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Телефон для отправки:</p>
                <p className="text-muted-foreground">{phone || 'Не указан'}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleInvite('whatsapp')}
                  disabled={isLoading || !phone}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Отправить в WhatsApp
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Клиент получит ссылку для создания учётной записи в личном кабинете
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  {result.message_sent 
                    ? "Приглашение отправлено!" 
                    : "Ссылка создана"
                  }
                </span>
              </div>

              {result.invite_url && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ссылка для регистрации:</p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
                      {result.invite_url}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {!result.message_sent && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={openWhatsApp}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Открыть WhatsApp вручную
                    </Button>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setResult(null);
                  setIsOpen(false);
                }}
              >
                Закрыть
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
