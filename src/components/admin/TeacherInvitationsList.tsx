import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useTeacherInvitations, STATUS_LABELS, STATUS_COLORS, TeacherInvitation } from '@/hooks/useTeacherInvitations';
import { toast } from 'sonner';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Search,
  MoreVertical,
  Copy,
  RefreshCw,
  X,
  MessageCircle,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GraduationCap,
  Loader2,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  SendHorizonal,
} from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'cancelled';

export const TeacherInvitationsList: React.FC = () => {
  const { invitations, isLoading, refetch, cancelInvitation, resendInvitation } = useTeacherInvitations();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<TeacherInvitation | null>(null);
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);

  const baseUrl = window.location.origin;

  // Pending приглашения с телефоном для массовой отправки
  const pendingWithPhone = invitations.filter(
    inv => inv.status === 'pending' && inv.phone && !isPast(new Date(inv.token_expires_at))
  );

  // Фильтрация
  const filteredInvitations = invitations.filter(inv => {
    const matchesSearch = 
      inv.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (inv.phone?.includes(searchQuery) || false) ||
      (inv.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Статистика
  const stats = {
    all: invitations.length,
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    expired: invitations.filter(i => i.status === 'expired').length,
    cancelled: invitations.filter(i => i.status === 'cancelled').length,
  };

  const getInviteLink = (invitation: TeacherInvitation) => 
    `${baseUrl}/teacher/onboarding/${invitation.invite_token}`;

  const handleCopyLink = async (invitation: TeacherInvitation) => {
    const link = getInviteLink(invitation);
    await navigator.clipboard.writeText(link);
    toast.success('Ссылка скопирована');
  };

  const handleSendWhatsApp = (invitation: TeacherInvitation) => {
    const link = getInviteLink(invitation);
    const message = encodeURIComponent(
      `Здравствуйте, ${invitation.first_name}! Вы приглашены как преподаватель. Пройдите по ссылке для завершения регистрации: ${link}`
    );
    const phone = invitation.phone?.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSendTelegram = (invitation: TeacherInvitation) => {
    const link = getInviteLink(invitation);
    const message = encodeURIComponent(
      `Здравствуйте, ${invitation.first_name}! Вы приглашены как преподаватель. Пройдите по ссылке для завершения регистрации: ${link}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${message}`, '_blank');
  };

  const handleResend = async (invitation: TeacherInvitation) => {
    resendInvitation.mutate(invitation);
  };

  const handleCancelClick = (invitation: TeacherInvitation) => {
    setSelectedInvitation(invitation);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (selectedInvitation) {
      cancelInvitation.mutate(selectedInvitation.id);
    }
    setCancelDialogOpen(false);
    setSelectedInvitation(null);
  };

  // Массовая отправка через WhatsApp
  const handleBulkSendWhatsApp = async () => {
    setIsBulkSending(true);
    
    // Открываем все ссылки с небольшой задержкой
    for (let i = 0; i < pendingWithPhone.length; i++) {
      const invitation = pendingWithPhone[i];
      const link = getInviteLink(invitation);
      const message = encodeURIComponent(
        `Здравствуйте, ${invitation.first_name}! Вы приглашены как преподаватель. Пройдите по ссылке для завершения регистрации: ${link}`
      );
      const phone = invitation.phone?.replace(/\D/g, '');
      
      // Открываем с задержкой чтобы браузер не блокировал
      setTimeout(() => {
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      }, i * 500);
    }
    
    toast.success(`Открыто ${pendingWithPhone.length} окон WhatsApp для отправки`);
    setIsBulkSending(false);
    setBulkSendDialogOpen(false);
  };

  // Копирование всех ссылок
  const handleCopyAllLinks = async () => {
    const links = pendingWithPhone.map(inv => 
      `${inv.first_name} ${inv.last_name || ''}: ${getInviteLink(inv)}`
    ).join('\n');
    
    await navigator.clipboard.writeText(links);
    toast.success(`Скопировано ${pendingWithPhone.length} ссылок`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle2 className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const isExpired = (invitation: TeacherInvitation) => 
    invitation.status === 'pending' && isPast(new Date(invitation.token_expires_at));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Приглашения преподавателей
            </CardTitle>
            <CardDescription>
              Управление приглашениями и magic links
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {pendingWithPhone.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setBulkSendDialogOpen(true)}
                className="gap-2"
              >
                <SendHorizonal className="h-4 w-4" />
                Отправить все ({pendingWithPhone.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Фильтры */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, телефону, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all" className="gap-1">
                Все <Badge variant="secondary" className="ml-1">{stats.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1">
                Ожидает <Badge variant="secondary" className="ml-1">{stats.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="accepted" className="gap-1">
                Принято <Badge variant="secondary" className="ml-1">{stats.accepted}</Badge>
              </TabsTrigger>
              <TabsTrigger value="expired" className="gap-1 hidden sm:flex">
                Истекло <Badge variant="secondary" className="ml-1">{stats.expired}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Список */}
        {filteredInvitations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Приглашения не найдены</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredInvitations.map((invitation) => {
                const expired = isExpired(invitation);
                
                return (
                  <div
                    key={invitation.id}
                    className={`p-4 rounded-lg border ${
                      expired ? 'border-orange-200 bg-orange-50' : 'border-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {invitation.first_name} {invitation.last_name || ''}
                          </span>
                          <Badge className={STATUS_COLORS[invitation.status]}>
                            {getStatusIcon(invitation.status)}
                            <span className="ml-1">{STATUS_LABELS[invitation.status]}</span>
                          </Badge>
                          {expired && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                              Истёк срок
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {invitation.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {invitation.phone}
                            </span>
                          )}
                          {invitation.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {invitation.email}
                            </span>
                          )}
                          {invitation.branch && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {invitation.branch}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            Создано: {format(new Date(invitation.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                          </span>
                          {invitation.status === 'pending' && (
                            <span className={expired ? 'text-orange-600' : ''}>
                              {expired 
                                ? `Истекло ${formatDistanceToNow(new Date(invitation.token_expires_at), { locale: ru, addSuffix: true })}`
                                : `Действует ещё ${formatDistanceToNow(new Date(invitation.token_expires_at), { locale: ru })}`
                              }
                            </span>
                          )}
                          {invitation.terms_accepted_at && (
                            <span className="text-green-600">
                              Принято: {format(new Date(invitation.terms_accepted_at), 'dd.MM.yyyy', { locale: ru })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyLink(invitation)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {invitation.phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendWhatsApp(invitation)}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invitation.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleCopyLink(invitation)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Копировать ссылку
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(getInviteLink(invitation), '_blank')}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Открыть ссылку
                                </DropdownMenuItem>
                                {invitation.phone && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleSendWhatsApp(invitation)}>
                                      <MessageCircle className="h-4 w-4 mr-2" />
                                      Отправить в WhatsApp
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSendTelegram(invitation)}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Отправить в Telegram
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleCancelClick(invitation)}
                                  className="text-destructive"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Отменить приглашение
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {(invitation.status === 'expired' || invitation.status === 'cancelled') && (
                              <DropdownMenuItem onClick={() => handleResend(invitation)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Отправить повторно
                              </DropdownMenuItem>
                            )}
                            
                            {expired && invitation.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleResend(invitation)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Продлить срок
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Диалог подтверждения отмены */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить приглашение?</AlertDialogTitle>
            <AlertDialogDescription>
              Приглашение для {selectedInvitation?.first_name} будет отменено. 
              Ссылка станет недействительной.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive text-destructive-foreground">
              Да, отменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог массовой отправки */}
      <AlertDialog open={bulkSendDialogOpen} onOpenChange={setBulkSendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Массовая отправка через WhatsApp
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Будет открыто <strong>{pendingWithPhone.length}</strong> окон WhatsApp Web 
                для отправки приглашений преподавателям:
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg border p-3 bg-muted/50">
                {pendingWithPhone.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 py-1 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{inv.first_name} {inv.last_name || ''}</span>
                    <span className="text-muted-foreground">— {inv.phone}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Важно:</strong> Разрешите всплывающие окна в браузере. 
                Окна будут открываться с интервалом 0.5 сек.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCopyAllLinks}>
              <Copy className="h-4 w-4 mr-2" />
              Копировать все ссылки
            </Button>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkSendWhatsApp}
              disabled={isBulkSending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isBulkSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              Открыть WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
