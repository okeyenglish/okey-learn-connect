import { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StaffActivityFeed } from './staff-activity/StaffActivityFeed';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function StaffActivityPopover() {
  const [modalOpen, setModalOpen] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const { user, roles, profile } = useAuth();
  const lastSeenRef = useRef<string | null>(null);
  
  // Руководители видят все логи, остальные — только свои
  const isManager = roles?.some(r => ['admin', 'branch_manager'].includes(r));

  // Realtime subscription for new activity
  useEffect(() => {
    if (!profile?.organization_id) return;

    const channel = supabase
      .channel('staff-activity-indicator')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_activity_log',
          filter: `organization_id=eq.${profile.organization_id}`,
        },
        (payload) => {
          const newActivity = payload.new as { id: string; user_id: string };
          
          // Если не менеджер, показываем только свои события
          if (!isManager && newActivity.user_id !== user?.id) return;
          
          // Не показываем анимацию для своих действий
          if (newActivity.user_id === user?.id) return;
          
          // Показываем индикатор новой активности
          setHasNewActivity(true);
          lastSeenRef.current = newActivity.id;
          
          // Сбрасываем через 5 секунд
          setTimeout(() => setHasNewActivity(false), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id, isManager, user?.id]);

  // Сбрасываем индикатор при открытии модального окна
  const handleOpenModal = () => {
    setHasNewActivity(false);
    setModalOpen(true);
  };

  return (
    <>
      <HoverCard openDelay={200} closeDelay={300}>
        <HoverCardTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 rounded-none border-l border-border/30 hover:bg-muted/80 relative"
            onClick={handleOpenModal}
          >
            <Activity className={cn(
              "h-4 w-4 transition-colors",
              hasNewActivity && "text-primary animate-pulse"
            )} />
            {/* Animated indicator dot */}
            {hasNewActivity && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
          </Button>
        </HoverCardTrigger>
        <HoverCardContent 
          className="w-[400px] p-0" 
          align="end"
          side="bottom"
          sideOffset={8}
        >
          <StaffActivityFeed
            compact
            showHeader
            showFilters={false}
            userId={isManager ? undefined : user?.id}
          />
        </HoverCardContent>
      </HoverCard>

      {/* Full Modal with Filters */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {isManager ? 'Активность команды' : 'Мои действия'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <StaffActivityFeed
              showHeader={false}
              showFilters={isManager}
              userId={isManager ? undefined : user?.id}
              limit={100}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
