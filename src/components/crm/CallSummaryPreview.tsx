import { FileText, Handshake, Target, Flag, Clock, ChevronRight } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActionItem {
  task: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}

interface CallSummaryPreviewProps {
  summary?: string | null;
  agreements?: string | null;
  manualActionItems?: ActionItem[] | null;
  className?: string;
}

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'high':
      return { 
        badge: 'bg-red-100 text-red-700 border-red-200',
        icon: <Flag className="h-2.5 w-2.5" />,
        label: '!'
      };
    case 'medium':
      return { 
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <Clock className="h-2.5 w-2.5" />,
        label: '◦'
      };
    default:
      return { 
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: null,
        label: '·'
      };
  }
};

export const CallSummaryPreview: React.FC<CallSummaryPreviewProps> = ({
  summary,
  agreements,
  manualActionItems,
  className
}) => {
  const hasContent = summary || agreements || (manualActionItems && manualActionItems.length > 0);

  if (!hasContent) return null;

  // Calculate task counts by priority
  const taskCounts = {
    high: manualActionItems?.filter(t => t.priority === 'high').length || 0,
    medium: manualActionItems?.filter(t => t.priority === 'medium').length || 0,
    low: manualActionItems?.filter(t => t.priority === 'low').length || 0,
  };
  const totalTasks = (manualActionItems?.length || 0);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div 
          className={cn(
            "flex items-center gap-1.5 p-1.5 bg-muted/60 rounded-md cursor-pointer hover:bg-muted/80 transition-colors",
            className
          )}
        >
          {/* Summary indicator */}
          {summary && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3 text-primary" />
            </div>
          )}
          
          {/* Agreements indicator */}
          {agreements && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Handshake className="h-3 w-3 text-green-600" />
            </div>
          )}
          
          {/* Tasks indicator */}
          {totalTasks > 0 && (
            <div className="flex items-center gap-0.5">
              <Target className="h-3 w-3 text-orange-600" />
              <span className="text-[10px] font-medium text-orange-700">{totalTasks}</span>
              {taskCounts.high > 0 && (
                <span className="text-[10px] text-red-600">🔴{taskCounts.high}</span>
              )}
            </div>
          )}
          
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
        </div>
      </HoverCardTrigger>
      
      <HoverCardContent 
        align="start" 
        side="bottom"
        className="w-80 p-3 space-y-3"
      >
        {/* Summary section */}
        {summary && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <FileText className="h-3 w-3" />
              Резюме
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
              {summary}
            </p>
          </div>
        )}
        
        {/* Agreements section */}
        {agreements && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
              <Handshake className="h-3 w-3" />
              Договорённости
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 bg-green-50/50 p-2 rounded">
              {agreements}
            </p>
          </div>
        )}
        
        {/* Tasks section */}
        {totalTasks > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700">
              <Target className="h-3 w-3" />
              Задачи ({totalTasks})
            </div>
            <div className="space-y-1">
              {manualActionItems?.slice(0, 5).map((item, index) => {
                const config = getPriorityConfig(item.priority);
                return (
                  <div 
                    key={index}
                    className="flex items-start gap-1.5 text-xs"
                  >
                    <Badge 
                      variant="outline" 
                      className={cn("h-4 px-1 py-0 text-[10px] shrink-0", config.badge)}
                    >
                      {config.icon || config.label}
                    </Badge>
                    <span className="text-muted-foreground line-clamp-1">
                      {item.task}
                    </span>
                  </div>
                );
              })}
              {manualActionItems && manualActionItems.length > 5 && (
                <p className="text-[10px] text-muted-foreground/70 italic">
                  +{manualActionItems.length - 5} ещё...
                </p>
              )}
            </div>
          </div>
        )}
        
        <p className="text-[10px] text-muted-foreground/60 italic pt-1 border-t">
          Нажмите 👁 для подробностей
        </p>
      </HoverCardContent>
    </HoverCard>
  );
};
