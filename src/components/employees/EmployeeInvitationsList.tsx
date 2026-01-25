import { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  useEmployeeInvitations, 
  POSITION_LABELS, 
  STATUS_LABELS, 
  STATUS_COLORS,
  EmployeeInvitation 
} from '@/hooks/useEmployeeInvitations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MoreVertical, 
  Copy, 
  X, 
  RefreshCw, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  MessageCircle,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EmployeeInvitationsListProps {
  onAddNew?: () => void;
}

export const EmployeeInvitationsList = ({ onAddNew }: EmployeeInvitationsListProps) => {
  const { invitations, isLoading, cancelInvitation, resendInvitation } = useEmployeeInvitations();
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; invitation: EmployeeInvitation | null }>({
    open: false,
    invitation: null,
  });

  const handleCopyLink = (invitation: EmployeeInvitation) => {
    const inviteLink = `${window.location.origin}/employee/onboarding/${invitation.invite_token}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Ссылка скопирована');
  };

  const handleSendWhatsApp = (invitation: EmployeeInvitation) => {
    const inviteLink = `${window.location.origin}/employee/onboarding/${invitation.invite_token}`;
    const message = encodeURIComponent(
      `Здравствуйте, ${invitation.first_name}! Вы приглашены в команду. Пройдите по ссылке для заполнения анкеты: ${inviteLink}`
    );
    const phone = invitation.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSendTelegram = (invitation: EmployeeInvitation) => {
    const inviteLink = `${window.location.origin}/employee/onboarding/${invitation.invite_token}`;
    const message = encodeURIComponent(
      `Здравствуйте, ${invitation.first_name}! Вы приглашены в команду. Пройдите по ссылке для заполнения анкеты: ${inviteLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${message}`, '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3.5 w-3.5" />;
      case 'accepted': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'expired': return <AlertCircle className="h-3.5 w-3.5" />;
      case 'cancelled': return <XCircle className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const isExpired = (invitation: EmployeeInvitation) => {
    return isPast(new Date(invitation.token_expires_at)) && invitation.status === 'pending';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Приглашения сотрудников
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Приглашения сотрудников
          {invitations.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {invitations.length}
            </Badge>
          )}
        </CardTitle>
        {onAddNew && (
          <Button size="sm" variant="outline" onClick={onAddNew}>
            <UserPlus className="h-4 w-4 mr-1" />
            Добавить
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Нет приглашений</p>
            {onAddNew && (
              <Button variant="link" onClick={onAddNew} className="mt-2">
                Создать первое приглашение
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {invitations.map((invitation) => {
                const expired = isExpired(invitation);
                const effectiveStatus = expired ? 'expired' : invitation.status;
                
                return (
                  <div
                    key={invitation.id}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                      effectiveStatus === 'accepted' && "bg-green-50/50 dark:bg-green-950/20",
                      expired && "bg-muted/50"
                    )}
                  >
                    {/* Аватар с инициалами */}
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                      {invitation.first_name.charAt(0).toUpperCase()}
                      {invitation.last_name?.charAt(0).toUpperCase() || ''}
                    </div>

                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {invitation.first_name} {invitation.last_name || ''}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs shrink-0", STATUS_COLORS[effectiveStatus])}
                        >
                          {getStatusIcon(effectiveStatus)}
                          <span className="ml-1">{STATUS_LABELS[effectiveStatus]}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{POSITION_LABELS[invitation.position] || invitation.position}</span>
                        {invitation.branch && (
                          <>
                            <span>•</span>
                            <span>{invitation.branch}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(invitation.created_at), { 
                            addSuffix: true, 
                            locale: ru 
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Действия */}
                    {effectiveStatus === 'pending' && !expired && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyLink(invitation)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Копировать ссылку
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWhatsApp(invitation)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Отправить в WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendTelegram(invitation)}>
                            <Send className="h-4 w-4 mr-2" />
                            Отправить в Telegram
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setCancelDialog({ open: true, invitation })}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Отменить приглашение
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {(effectiveStatus === 'expired' || effectiveStatus === 'cancelled') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resendInvitation.mutate(invitation)}
                        disabled={resendInvitation.isPending}
                        className="shrink-0"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-1", resendInvitation.isPending && "animate-spin")} />
                        Повторить
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Диалог подтверждения отмены */}
      <AlertDialog 
        open={cancelDialog.open} 
        onOpenChange={(open) => setCancelDialog({ open, invitation: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить приглашение?</AlertDialogTitle>
            <AlertDialogDescription>
              Приглашение для {cancelDialog.invitation?.first_name} будет отменено. 
              Ссылка перестанет работать.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет, оставить</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelDialog.invitation) {
                  cancelInvitation.mutate(cancelDialog.invitation.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Да, отменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
