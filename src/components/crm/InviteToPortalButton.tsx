import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Send, Loader2, CheckCircle, KeyRound, Clock, UserCheck, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/typedClient";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { selfHostedPost } from "@/lib/selfHostedApi";

interface InviteToPortalButtonProps {
  clientId: string;
  clientName: string;
  phone?: string | null;
  firstName?: string | null;
  telegramUserId?: string | null;
}

interface InvitationStatus {
  status: 'not_invited' | 'pending' | 'registered';
  invitedAt?: string;
  registeredAt?: string;
}

type MessengerType = 'whatsapp' | 'telegram' | 'max' | 'sms';

// Module-level flag to avoid повторных 400/404 на каждом монтировании компонента,
// если портал-схема не установлена в этой БД.
let portalStatusChecksSupported: boolean | null = null;

const messengerLabels: Record<MessengerType, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  max: 'MAX',
  sms: 'SMS (скоро)'
};

const messengerColors: Record<MessengerType, string> = {
  whatsapp: 'bg-green-600 hover:bg-green-700',
  telegram: 'bg-blue-500 hover:bg-blue-600',
  max: 'bg-purple-600 hover:bg-purple-700',
  sms: 'bg-gray-400 cursor-not-allowed'
};

export const InviteToPortalButton = ({ 
  clientId, 
  clientName,
  phone,
  firstName,
  telegramUserId
}: InviteToPortalButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<InvitationStatus>({ status: 'not_invited' });
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [selectedMessenger, setSelectedMessenger] = useState<MessengerType>('whatsapp');
  // В некоторых инстансах БД нет таблиц/полей портала (client_invitations, clients.portal_enabled/user_id).
  // Чтобы не спамить ошибками и не добавлять лишнюю задержку на каждый рендер карточки,
  // пробуем один раз и дальше отключаем проверку статуса, оставляя возможность отправить приглашение.
  const statusCheckSupportedRef = useRef(portalStatusChecksSupported ?? true);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message_sent?: boolean;
    short_url?: string;
  } | null>(null);

  const isMissingColumnError = (err: any) => {
    const message = String(err?.message || '');
    return err?.code === '42703' || /column\s+.+\s+does not exist/i.test(message);
  };

  const isMissingTableError = (err: any) => {
    const message = String(err?.message || '');
    return err?.code === 'PGRST205' || /Could not find the table/i.test(message);
  };

  const disableStatusChecks = useCallback(() => {
    statusCheckSupportedRef.current = false;
    portalStatusChecksSupported = false;
  }, []);

  // Check invitation status on mount
  useEffect(() => {
    if (!clientId) return;
    if (!statusCheckSupportedRef.current) {
      // Статус недоступен — не блокируем UI проверкой
      setIsCheckingStatus(false);
      setInvitationStatus({ status: 'not_invited' });
      return;
    }
    checkInvitationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const checkInvitationStatus = async () => {
    setIsCheckingStatus(true);
    try {
      // First check if client has portal_enabled (registered)
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('portal_enabled, user_id')
        .eq('id', clientId)
        .single();

      // Если в схеме нет этих колонок — просто отключаем проверку статуса.
      // (Приглашение всё равно отправляется через backend endpoint.)
      if (clientError) {
        if (isMissingColumnError(clientError)) {
          disableStatusChecks();
          setInvitationStatus({ status: 'not_invited' });
          return;
        }
        throw clientError;
      }

      if (!client) {
        // Клиент не найден — считаем, что приглашения нет
        setInvitationStatus({ status: 'not_invited' });
        return;
      }

      if (client?.portal_enabled && client?.user_id) {
        setInvitationStatus({ 
          status: 'registered',
          registeredAt: undefined // Could fetch from user creation date
        });
        setIsCheckingStatus(false);
        return;
      }

      // Check for pending invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('client_invitations')
        .select('status, created_at, completed_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Аналогично: если таблицы нет — отключаем проверку статуса.
      if (invitationError) {
        if (isMissingTableError(invitationError)) {
          disableStatusChecks();
          setInvitationStatus({ status: 'not_invited' });
          return;
        }
        throw invitationError;
      }

      if (!invitation) {
        setInvitationStatus({ status: 'not_invited' });
        return;
      }

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
    if (selectedMessenger === 'sms') {
      toast({
        title: "SMS",
        description: "Интеграция SMS скоро будет добавлена",
      });
      return;
    }

    if (!phone && selectedMessenger !== 'telegram') {
      toast({
        title: "Ошибка",
        description: "У клиента нет номера телефона",
        variant: "destructive"
      });
      return;
    }

    if (selectedMessenger === 'telegram' && !telegramUserId && !phone) {
      toast({
        title: "Ошибка",
        description: "У клиента нет Telegram ID или телефона",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setActionResult(null);

    try {
      const response = await selfHostedPost<{
        success: boolean;
        message_sent?: boolean;
        short_url?: string;
        invite_url?: string;
      }>('send-portal-invitation', {
        client_id: clientId,
        phone: phone,
        first_name: firstName || clientName.split(' ')[0],
        messenger: selectedMessenger,
        telegram_user_id: telegramUserId
      });

      if (!response.success) {
        throw new Error(response.error || 'Ошибка отправки');
      }

      setActionResult({
        success: true,
        message_sent: response.data?.message_sent,
        short_url: response.data?.short_url
      });

      // Refresh status
      await checkInvitationStatus();

      toast({
        title: "Приглашение отправлено",
        description: response.data?.message_sent 
          ? `Сообщение успешно отправлено в ${messengerLabels[selectedMessenger]}`
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
    if (selectedMessenger === 'sms') {
      toast({
        title: "SMS",
        description: "Интеграция SMS скоро будет добавлена",
      });
      return;
    }

    if (!phone && selectedMessenger !== 'telegram') {
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
      const response = await selfHostedPost<{
        success: boolean;
        message_sent?: boolean;
        short_url?: string;
      }>('send-portal-login', {
        client_id: clientId,
        phone: phone,
        first_name: firstName || clientName.split(' ')[0],
        messenger: selectedMessenger,
        telegram_user_id: telegramUserId
      });

      if (!response.success) {
        throw new Error(response.error || 'Ошибка отправки');
      }

      setActionResult({
        success: true,
        message_sent: response.data?.message_sent,
        short_url: response.data?.short_url
      });

      toast({
        title: response.data?.message_sent ? "Ссылка отправлена" : "Ошибка отправки",
        description: response.data?.message_sent 
          ? `Ссылка для входа отправлена клиенту в ${messengerLabels[selectedMessenger]}`
          : "Не удалось отправить сообщение, попробуйте позже",
        variant: response.data?.message_sent ? "default" : "destructive"
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

  const MessengerSelector = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium">Канал отправки</label>
      <Select value={selectedMessenger} onValueChange={(v) => setSelectedMessenger(v as MessengerType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="whatsapp">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              WhatsApp
            </div>
          </SelectItem>
          <SelectItem value="telegram">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Telegram
            </div>
          </SelectItem>
          <SelectItem value="max">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              MAX
            </div>
          </SelectItem>
          <SelectItem value="sms" disabled>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              SMS (скоро)
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

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
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setActionResult(null);
        }}>
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
                Клиент {clientName} получит ссылку для входа в личный кабинет.
                Ссылка будет действительна 24 часа.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {!actionResult ? (
                <>
                  <MessengerSelector />

                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">Телефон для отправки:</p>
                    <p className="text-muted-foreground">{phone || 'Не указан'}</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <p className="font-medium mb-1">🔒 Безопасность</p>
                    <p>Ссылка будет отправлена напрямую клиенту. Вы увидите только сокращённую ссылку.</p>
                  </div>

                  <Button
                    onClick={handleSendLoginLink}
                    disabled={isLoading || (!phone && selectedMessenger !== 'telegram') || selectedMessenger === 'sms'}
                    className={`w-full ${messengerColors[selectedMessenger]}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Отправить в {messengerLabels[selectedMessenger]}
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

                  {actionResult.message_sent && actionResult.short_url && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="font-medium mb-1">Сокращённая ссылка:</p>
                      <p className="text-muted-foreground font-mono text-xs">{actionResult.short_url}</p>
                    </div>
                  )}

                  {actionResult.message_sent && (
                    <p className="text-sm text-muted-foreground">
                      Клиент получил ссылку для входа. Ссылка действительна 24 часа.
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
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setActionResult(null);
        }}>
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
                  <MessengerSelector />

                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">Телефон для отправки:</p>
                    <p className="text-muted-foreground">{phone || 'Не указан'}</p>
                  </div>

                  <Button
                    onClick={handleInvite}
                    disabled={isLoading || (!phone && selectedMessenger !== 'telegram') || selectedMessenger === 'sms'}
                    className={`w-full ${messengerColors[selectedMessenger]}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Отправить в {messengerLabels[selectedMessenger]}
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

                  {actionResult.short_url && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="font-medium mb-1">Сокращённая ссылка:</p>
                      <p className="text-muted-foreground font-mono text-xs">{actionResult.short_url}</p>
                    </div>
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

  // Not invited - show invite button
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setActionResult(null);
    }}>
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
              <MessengerSelector />

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Телефон для отправки:</p>
                <p className="text-muted-foreground">{phone || 'Не указан'}</p>
              </div>

              <Button
                onClick={handleInvite}
                disabled={isLoading || (!phone && selectedMessenger !== 'telegram') || selectedMessenger === 'sms'}
                className={`w-full ${messengerColors[selectedMessenger]}`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Отправить в {messengerLabels[selectedMessenger]}
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

              {actionResult.short_url && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">Сокращённая ссылка:</p>
                  <p className="text-muted-foreground font-mono text-xs">{actionResult.short_url}</p>
                </div>
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
  );
};