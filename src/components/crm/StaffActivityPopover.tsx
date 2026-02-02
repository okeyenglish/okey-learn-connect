import { useState } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StaffActivityFeed } from './staff-activity/StaffActivityFeed';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function StaffActivityPopover() {
  const [open, setOpen] = useState(false);
  const { user, roles } = useAuth();
  
  // Руководители видят все логи, остальные — только свои
  const isManager = roles?.some(r => ['admin', 'branch_manager'].includes(r));
  const tooltipText = isManager ? 'Активность команды' : 'Мои действия';
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 rounded-none border-l border-border/30 hover:bg-muted/80"
            >
              <Activity className={cn(
                "h-4 w-4 transition-colors",
                open && "text-primary"
              )} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[400px] p-0" align="end">
        <StaffActivityFeed
          compact
          showHeader
          showFilters={false}
          userId={isManager ? undefined : user?.id}
        />
      </PopoverContent>
    </Popover>
  );
}
