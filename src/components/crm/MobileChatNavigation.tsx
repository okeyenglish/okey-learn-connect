import { Building2, GraduationCap, Plus, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileChatNavigationProps {
  onCorporateClick: () => void;
  onTeachersClick: () => void;
  onClientsClick: () => void;
  onCommunitiesClick: () => void;
  onNewChatClick: () => void;
  corporateUnreadCount?: number;
  teachersUnreadCount?: number;
  clientsUnreadCount?: number;
  communitiesUnreadCount?: number;
  activeChatType?: 'client' | 'corporate' | 'teachers' | 'communities';
}

export const MobileChatNavigation = ({
  onCorporateClick,
  onTeachersClick,
  onClientsClick,
  onCommunitiesClick,
  onNewChatClick,
  corporateUnreadCount = 0,
  teachersUnreadCount = 0,
  clientsUnreadCount = 0,
  communitiesUnreadCount = 0,
  activeChatType
}: MobileChatNavigationProps) => {
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
        "flex flex-col items-center justify-center h-16 flex-1 relative transition-colors duration-200 px-1",
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
            className="absolute -top-2 -right-3 h-5 min-w-[20px] rounded-sm p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>
      <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
    </Button>
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t border-border shadow-lg md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        <NavButton
          icon={Building2}
          label="Корпчаты"
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
            "flex flex-col items-center justify-center h-12 w-12 rounded-full",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "shadow-lg transform hover:scale-105 transition-all duration-200"
          )}
          onClick={onNewChatClick}
        >
          <Plus className="h-6 w-6" />
        </Button>
        <NavButton
          icon={Users}
          label="Клиенты"
          onClick={onClientsClick}
          unreadCount={clientsUnreadCount}
          isActive={activeChatType === 'client'}
        />
        <NavButton
          icon={MessageCircle}
          label="Сообщества"
          onClick={onCommunitiesClick}
          unreadCount={communitiesUnreadCount}
          isActive={activeChatType === 'communities'}
        />
      </div>
    </div>
  );
};
