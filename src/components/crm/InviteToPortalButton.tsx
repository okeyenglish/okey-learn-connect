import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Send, Loader2, CheckCircle, KeyRound, Clock, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface InviteToPortalButtonProps {
  clientId: string;
  clientName: string;
  phone?: string | null;
  firstName?: string | null;
}

interface InvitationStatus {
  status: 'not_invited' | 'pending' | 'registered';
  invitedAt?: string;
  registeredAt?: string;
}

export const InviteToPortalButton = ({ 
  clientId, 
  clientName,
  phone,
  firstName
}: InviteToPortalButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<InvitationStatus>({ status: 'not_invited' });
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message_sent?: boolean;
  } | null>(null);

  // Check invitation status on mount
  useEffect(() => {
    checkInvitationStatus();
  }, [clientId]);

  const checkInvitationStatus = async () => {
    setIsCheckingStatus(true);
    try {
      // First check if client has portal_enabled (registered)
      const { data: client } = await supabase
        .from('clients')
        .select('portal_enabled, user_id')
        .eq('id', clientId)
        .single();

      if (client?.portal_enabled && client?.user_id) {
        setInvitationStatus({ 
          status: 'registered',
          registeredAt: undefined // Could fetch from user creation date
        });
        setIsCheckingStatus(false);
        return;
      }

      // Check for pending invitation
      const { data: invitation } = await supabase
        .from('client_invitations')
        .select('status, created_at, completed_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invitation) {
        if (invitation.status === 'completed') {
          setInvitationStatus({ 
            status: 'registered',
            registeredAt: invitation.completed_at || undefined
          });
        } else if (invitation.status === 'pending') {
          setInvitationStatus({ 
            status: 'pending',
            invitedAt: invitation.created_at
          });
        } else {
          setInvitationStatus({ status: 'not_invited' });
        }
      } else {
        setInvitationStatus({ status: 'not_invited' });
      }
    } catch (error) {
      console.error('Error checking invitation status:', error);
      setInvitationStatus({ status: 'not_invited' });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleInvite = async () => {
    if (!phone) {
      toast({
        title: "Ошибка",
        description: "У клиента нет номера телефона",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setActionResult(null);

    try {
      const response = await supabase.functions.invoke('send-portal-invitation', {
        body: {
          client_id: clientId,
          phone: phone,
          first_name: firstName || clientName.split(' ')[0],
          messenger: 'whatsapp'
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setActionResult({
        success: true,
        message_sent: response.data.message_sent
      });

      // Refresh status
      await checkInvitationStatus();

      toast({
        title: "Приглашение отправлено",
        description: response.data.message_sent 
          ? "Сообщение успешно отправлено в WhatsApp"
          : "Приглашение создано"
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

  const handleSendLoginLink = async () => {
    if (!phone) {
      toast({
        title: "Ошибка",
        description: "У клиента нет номера телефона",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setActionResult(null);

    try {
      const response = await supabase.functions.invoke('send-portal-login', {
        body: {
          client_id: clientId,
          phone: phone,
          first_name: firstName || clientName.split(' ')[0]
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setActionResult({
        success: true,
        message_sent: response.data.message_sent
      });

      toast({
        title: response.data.message_sent ? "Ссылка отправлена" : "Ошибка отправки",
        description: response.data.message_sent 
          ? "Ссылка для входа отправлена клиенту в WhatsApp"
          : "Не удалось отправить сообщение, попробуйте позже",
        variant: response.data.message_sent ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error sending login link:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось отправить ссылку",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Проверка...
      </Button>
    );
  }

  // Registered user - show "Send login link" button
  if (invitationStatus.status === 'registered') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-green-600">
          <UserCheck className="h-3.5 w-3.5" />
          <span>Зарегистрирован в портале</span>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <KeyRound className="h-4 w-4" />
              Отправить ссылку для входа
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Отправить ссылку для входа</DialogTitle>
              <DialogDescription>
                Клиент {clientName} получит ссылку для входа в личный кабинет через WhatsApp.
                Ссылка будет действительна 24 часа.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {!actionResult ? (
                <>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">Телефон для отправки:</p>
                    <p className="text-muted-foreground">{phone || 'Не указан'}</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <p className="font-medium mb-1">🔒 Безопасность</p>
                    <p>Ссылка будет отправлена напрямую клиенту. Вы не увидите полную ссылку.</p>
                  </div>

                  <Button
                    onClick={handleSendLoginLink}
                    disabled={isLoading || !phone}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Отправить в WhatsApp
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      {actionResult.message_sent 
                        ? "Ссылка отправлена клиенту!" 
                        : "Произошла ошибка"
                      }
                    </span>
                  </div>

                  {actionResult.message_sent && (
                    <p className="text-sm text-muted-foreground">
                      Клиент получил ссылку для входа в WhatsApp. Ссылка действительна 24 часа.
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setActionResult(null);
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
      </div>
    );
  }

  // Pending invitation - show status and resend option
  if (invitationStatus.status === 'pending') {
    const timeAgo = invitationStatus.invitedAt 
      ? formatDistanceToNow(new Date(invitationStatus.invitedAt), { addSuffix: true, locale: ru })
      : '';

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <Clock className="h-3.5 w-3.5" />
          <span>Приглашён {timeAgo}</span>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <Send className="h-4 w-4" />
              Отправить повторно
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Повторное приглашение</DialogTitle>
              <DialogDescription>
                Клиент {clientName} уже был приглашён {timeAgo}. 
                Отправить приглашение повторно?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {!actionResult ? (
                <>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">Телефон для отправки:</p>
                    <p className="text-muted-foreground">{phone || 'Не указан'}</p>
                  </div>

                  <Button
                    onClick={handleInvite}
                    disabled={isLoading || !phone}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Отправить в WhatsApp
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      {actionResult.message_sent 
                        ? "Приглашение отправлено!" 
                        : "Приглашение создано"
                      }
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setActionResult(null);
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
      </div>
    );
  }

  // Not invited - show invite button
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
          {!actionResult ? (
            <>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Телефон для отправки:</p>
                <p className="text-muted-foreground">{phone || 'Не указан'}</p>
              </div>

              <Button
                onClick={handleInvite}
                disabled={isLoading || !phone}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Отправить в WhatsApp
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Клиент получит ссылку для создания учётной записи в личном кабинете
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  {actionResult.message_sent 
                    ? "Приглашение отправлено!" 
                    : "Приглашение создано"
                  }
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setActionResult(null);
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
