import { useState } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StaffActivityFeed } from './staff-activity/StaffActivityFeed';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function StaffActivityPopover() {
  const [open, setOpen] = useState(false);
  const { user, roles } = useAuth();
  
  // Руководители видят все логи, остальные — только свои
  const isManager = roles?.some(r => ['admin', 'branch_manager'].includes(r));
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
        >
          <Activity className={cn(
            "h-4 w-4 transition-colors",
            open && "text-primary"
          )} />
        </Button>
      </PopoverTrigger>
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
