import React, { useState, useEffect, useMemo } from "react";
import { 
  User, Settings, Key, LogOut, ChevronDown, Shield, Bell, BellOff, 
  Send, AlertTriangle, Trash2, Clock, Phone, MessageSquare, Zap 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfileModal } from "./ProfileModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { AdminModal } from "@/components/admin/AdminModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useTodayCallsCount } from '@/hooks/useTodayCallsCount';
import { useTodayMessagesCount } from '@/hooks/useTodayMessagesCount';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

const MIN_SESSION_FOR_PERCENTAGE = 5 * 60 * 1000;

/** Inline Focus/DND indicator for dropdown menu */
function FocusModeIndicator() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkFocusMode = () => {
      try {
        const detected = localStorage.getItem('push:focus_mode_detected');
        const detectedAt = localStorage.getItem('push:focus_mode_detected_at');
        
        if (detected === 'true' && detectedAt) {
          const timestamp = parseInt(detectedAt, 10);
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          setShowWarning(timestamp > oneHourAgo);
        }
      } catch {
        // ignore
      }
    };

    checkFocusMode();
  }, []);

  if (!showWarning) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-sm mx-1 mb-1">
      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
      <span>Возможно, включён режим «Не беспокоить»</span>
    </div>
  );
}

interface UnifiedManagerWidgetProps {
  managerName: string;
  avatarUrl?: string;
  onSignOut: () => void;
  onDashboardClick: () => void;
}

export const UnifiedManagerWidget = React.memo(({ 
  managerName, 
  avatarUrl, 
  onSignOut,
  onDashboardClick
}: UnifiedManagerWidgetProps) => {
  const { role, roles, user } = useAuth();
  const { isSupported, isSubscribed, isLoading: pushLoading, toggle } = usePushNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const isMobile = useIsMobile();
  
  // Activity tracking
  const { activeTime, activityPercentage, sessionDuration } = useActivityTracker();
  const { callsCount, incomingCalls, outgoingCalls, lastCallTime, isLoading: callsLoading } = useTodayCallsCount();
  const { messagesCount, lastMessageTime, isLoading: messagesLoading } = useTodayMessagesCount();
  
  const showActivityPercentage = sessionDuration >= MIN_SESSION_FOR_PERCENTAGE;
  
  // Format active time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}с`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
  };

  const getActivityColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getActivityIndicator = (percentage: number) => {
    if (percentage >= 80) return '🟢';
    if (percentage >= 60) return '🟡';
    return '🔴';
  };
  
  // Memoized role calculations
  const { isAdmin, isMethodist, canAccessAdmin } = useMemo(() => {
    const isAdmin = role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));
    const isMethodist = role === 'methodist' || (Array.isArray(roles) && roles.includes('methodist'));
    return { isAdmin, isMethodist, canAccessAdmin: isAdmin || isMethodist };
  }, [role, roles]);

  const handleTestPush = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    try {
      localStorage.setItem('push:debug_until', String(Date.now() + 2 * 60 * 1000));
    } catch {
      // ignore
    }
    
    setTestPushLoading(true);
    try {
      const response = await selfHostedPost<{ sent?: number; failed?: number; details?: unknown }>('send-push-notification', {
        userId: user.id,
        payload: {
          title: 'Тестовое уведомление 🔔',
          body: `Push работает! ${new Date().toLocaleTimeString('ru-RU')}`,
          icon: '/pwa-192x192.png',
          tag: `test-push-${Date.now()}`,
          url: '/crm',
        },
      });

      if (!response.success) {
        throw new Error(response.error || `Ошибка ${response.status}`);
      }
      
      if (response.data?.sent && response.data.sent > 0) {
        toast.success(`Push отправлен (${response.data.sent})`);
      } else if (response.data?.failed && response.data.failed > 0) {
        toast.warning(`Все подписки истекли (${response.data.failed})`);
      } else {
        toast.warning('Нет активных подписок. Переподключите уведомления.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setTestPushLoading(false);
    }
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setIsOpen(false);
  };

  const handleChangePasswordClick = () => {
    setShowPasswordModal(true);
    setIsOpen(false);
  };

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
    setIsOpen(false);
  };

  const handleAdminClick = () => {
    setShowAdminModal(true);
    setIsOpen(false);
  };

  const handleSignOutClick = () => {
    onSignOut();
    setIsOpen(false);
  };

  const displayName = managerName === 'null null' || !managerName || managerName.trim() === '' 
    ? 'Менеджер' 
    : managerName;

  const initials = displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <TooltipProvider>
        <div className="flex items-center gap-0 bg-muted/50 rounded-lg border border-border/50 h-10">
          {/* Statistics Section - clickable for dashboard */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onDashboardClick}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 h-full hover:bg-muted/80 transition-colors rounded-l-lg border-r border-border/30"
              >
                {/* Activity Indicator + Time */}
                <div className="flex items-center gap-1">
                  <span className="text-xs">{getActivityIndicator(activityPercentage)}</span>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                  <span className="font-medium text-xs sm:text-sm">{formatTime(activeTime)}</span>
                </div>

                <span className="text-muted-foreground/30 hidden sm:inline">│</span>

                {/* Calls */}
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-medium text-xs sm:text-sm">
                    {callsLoading ? '...' : callsCount}
                  </span>
                </div>

                <span className="text-muted-foreground/30 hidden sm:inline">│</span>

                {/* Messages */}
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                  <span className="font-medium text-xs sm:text-sm">
                    {messagesLoading ? '...' : messagesCount}
                  </span>
                </div>

                {/* Activity Percentage */}
                {showActivityPercentage && (
                  <>
                    <span className="text-muted-foreground/30 hidden sm:inline">│</span>
                    <div className="flex items-center gap-1">
                      <Zap className={cn('h-3.5 w-3.5', getActivityColor(activityPercentage))} />
                      <span className={cn('font-medium text-xs sm:text-sm', getActivityColor(activityPercentage))}>
                        {activityPercentage}%
                      </span>
                    </div>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2 py-1">
                <p className="font-semibold text-sm">Моя статистика за сегодня</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Активное время:</span>
                  <span className="font-medium">{formatTime(activeTime)}</span>
                  
                  <span className="text-muted-foreground">Звонки:</span>
                  <span className="font-medium">
                    {callsCount} (↓{incomingCalls} ↑{outgoingCalls})
                  </span>
                  
                  <span className="text-muted-foreground">Сообщения:</span>
                  <span className="font-medium">{messagesCount}</span>
                  
                  <span className="text-muted-foreground">Посл. звонок:</span>
                  <span className="font-medium">{lastCallTime || '—'}</span>
                  
                  <span className="text-muted-foreground">Посл. сообщение:</span>
                  <span className="font-medium">{lastMessageTime || '—'}</span>
                  
                  {showActivityPercentage && (
                    <>
                      <span className="text-muted-foreground">Активность:</span>
                      <span className={cn('font-medium', getActivityColor(activityPercentage))}>
                        {activityPercentage}%
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  Нажмите для открытия дашборда
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Manager Menu Section */}
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex items-center gap-2 px-2 sm:px-3 h-full rounded-l-none rounded-r-lg hover:bg-muted/80",
                  isMobile ? 'px-1.5' : ''
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="text-xs font-medium bg-primary/10">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && (
                  <>
                    <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-popover border shadow-lg z-[9999]"
              sideOffset={8}
            >
              <DropdownMenuItem 
                onClick={handleProfileClick}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted"
              >
                <User className="h-4 w-4" />
                <span>Профиль</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={handleChangePasswordClick}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted"
              >
                <Key className="h-4 w-4" />
                <span>Сменить пароль</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={handleSettingsClick}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted"
              >
                <Settings className="h-4 w-4" />
                <span>Настройки</span>
              </DropdownMenuItem>
              
              {canAccessAdmin && (
                <DropdownMenuItem 
                  onClick={handleAdminClick}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted"
                >
                  <Shield className="h-4 w-4" />
                  <span>Админ-панель</span>
                </DropdownMenuItem>
              )}
              
              {isSupported && (
                <>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm">
                    <div className="flex items-center gap-2">
                      {isSubscribed ? (
                        <Bell className="h-4 w-4 text-primary" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">Уведомления</span>
                    </div>
                    <Switch 
                      checked={isSubscribed} 
                      disabled={pushLoading}
                      onCheckedChange={() => toggle()}
                    />
                  </div>
                  {isSubscribed && (
                    <>
                      <DropdownMenuItem
                        onClick={handleTestPush}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted"
                      >
                        <Send className="h-4 w-4 text-muted-foreground" />
                        <span>{testPushLoading ? 'Отправка...' : 'Тест push'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const regs = await navigator.serviceWorker.getRegistrations();
                            for (const reg of regs) {
                              await reg.unregister();
                            }
                            const cacheKeys = await caches.keys();
                            await Promise.all(cacheKeys.map(k => caches.delete(k)));
                            toast.success('Кэш сброшен. Перезагрузка...');
                            setTimeout(() => window.location.reload(), 500);
                          } catch (e) {
                            toast.error('Ошибка: ' + String(e));
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted text-amber-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Сбросить кэш</span>
                      </DropdownMenuItem>
                      <FocusModeIndicator />
                    </>
                  )}
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleSignOutClick}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>

      {/* Modals */}
      <ProfileModal 
        open={showProfileModal} 
        onOpenChange={setShowProfileModal} 
      />
      <ChangePasswordModal 
        open={showPasswordModal} 
        onOpenChange={setShowPasswordModal} 
      />
      <SettingsModal 
        open={showSettingsModal} 
        onOpenChange={setShowSettingsModal} 
      />
      {canAccessAdmin && (
        <AdminModal 
          open={showAdminModal} 
          onOpenChange={setShowAdminModal} 
        />
      )}
    </>
  );
});

export default UnifiedManagerWidget;
