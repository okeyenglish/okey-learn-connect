import { Building2, GraduationCap, Plus, Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileBottomNavigationProps {
  onCorporateClick: () => void;
  onTeachersClick: () => void;
  onNewChatClick: () => void;
  onScheduleClick: () => void;
  onAssistantClick: () => void;
  corporateUnreadCount?: number;
  teachersUnreadCount?: number;
  activeChatType?: 'client' | 'corporate' | 'teachers';
}

export const MobileBottomNavigation = ({
  onCorporateClick,
  onTeachersClick,
  onNewChatClick,
  onScheduleClick,
  onAssistantClick,
  corporateUnreadCount = 0,
  teachersUnreadCount = 0,
  activeChatType
}: MobileBottomNavigationProps) => {
  const NavButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    unreadCount = 0,
    isActive = false
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    unreadCount?: number;
    isActive?: boolean;
  }) => (
    <Button
      variant="ghost"
      className={cn(
        "flex flex-col items-center justify-center h-16 flex-1 relative transition-colors duration-200",
        "text-muted-foreground hover:text-primary hover:bg-accent/50",
        isActive && "text-primary bg-accent/30"
      )}
      onClick={onClick}
    >
      <div className="relative">
        <Icon className="h-5 w-5 mb-1" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-sm p-0 flex items-center justify-center text-xs min-w-[20px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <NavButton
          icon={Building2}
          label="Корпчат"
          onClick={onCorporateClick}
          unreadCount={corporateUnreadCount}
          isActive={activeChatType === 'corporate'}
        />
        <NavButton
          icon={GraduationCap}
          label="Преподы"
          onClick={onTeachersClick}
          unreadCount={teachersUnreadCount}
          isActive={activeChatType === 'teachers'}
        />
        <Button
          className={cn(
            "flex flex-col items-center justify-center h-16 w-12 rounded-full",
            "bg-primary text-primary-foreground hover:bg-primary-hover",
            "shadow-lg transform hover:scale-105 transition-all duration-200"
          )}
          onClick={onNewChatClick}
        >
          <Plus className="h-6 w-6" />
        </Button>
        <NavButton
          icon={Calendar}
          label="Расписание"
          onClick={onScheduleClick}
        />
        <NavButton
          icon={MessageCircle}
          label="Ассистент"
          onClick={onAssistantClick}
        />
      </div>
    </div>
  );
};