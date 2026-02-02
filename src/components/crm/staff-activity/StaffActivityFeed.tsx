import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Activity, RefreshCw, ExternalLink } from 'lucide-react';
import { useStaffActivityLog } from '@/hooks/useStaffActivityLog';
import { StaffActivityFilters } from './StaffActivityFilters';
import { StaffActivityItem } from './StaffActivityItem';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';

interface StaffActivityFeedProps {
  compact?: boolean;
  limit?: number;
  showFilters?: boolean;
  showHeader?: boolean;
  className?: string;
  userId?: string;
}

export function StaffActivityFeed({
  compact = false,
  limit = 50,
  showFilters = true,
  showHeader = true,
  className,
  userId,
}: StaffActivityFeedProps) {
  const navigate = useNavigate();
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['all']);
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>(['all']);
  
  const { getBranchNames } = useOrganization();
  const availableBranches = getBranchNames();
  
  const { activities, isLoading, refetch } = useStaffActivityLog({
    branches: selectedBranches,
    actionTypes: selectedActionTypes,
    userId,
    limit: compact ? 5 : limit,
  });

  const handleActivityClick = (activity: typeof activities[0]) => {
    // Навигация к связанной сущности
    if (activity.target_type === 'client' && activity.target_id) {
      navigate(`/crm/chats?client=${activity.target_id}`);
    } else if (activity.target_type === 'task' && activity.target_id) {
      navigate(`/crm/tasks?task=${activity.target_id}`);
    }
  };

  const content = (
    <>
      {showFilters && !compact && (
        <div className="mb-4">
          <StaffActivityFilters
            branches={availableBranches}
            availableBranches={availableBranches}
            selectedBranches={selectedBranches}
            onBranchChange={setSelectedBranches}
            selectedActionTypes={selectedActionTypes}
            onActionTypeChange={setSelectedActionTypes}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Нет активности за выбранный период
          </p>
        </div>
      ) : (
        <ScrollArea className={compact ? 'h-[300px]' : 'h-[calc(100vh-280px)]'}>
          <div className="space-y-1">
            {activities.map((activity) => (
              <StaffActivityItem
                key={activity.id}
                activity={activity}
                onClick={() => handleActivityClick(activity)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {compact && activities.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/crm/activity')}
          >
            Смотреть всю активность
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </>
  );

  if (!showHeader) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Активность команды
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
