import { useState } from "react";
import { Building2, GraduationCap, Plus, Users, MessageCircle, CreditCard, ListTodo, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileChatNavigationProps {
  onCorporateClick: () => void;
  onTeachersClick: () => void;
  onClientsClick: () => void;
  onCommunitiesClick: () => void;
  onNewChatClick: () => void;
  onPaymentClick?: () => void;
  onTaskClick?: () => void;
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
  onPaymentClick,
  onTaskClick,
  corporateUnreadCount = 0,
  teachersUnreadCount = 0,
  clientsUnreadCount = 0,
  communitiesUnreadCount = 0,
  activeChatType
}: MobileChatNavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleActionClick = (action: () => void | undefined) => {
    setIsMenuOpen(false);
    action?.();
  };

  const actionButtons = [
    { icon: CreditCard, label: 'Оплата', onClick: onPaymentClick },
    { icon: ListTodo, label: 'Задача', onClick: onTaskClick },
    { icon: UserPlus, label: 'Контакт', onClick: onNewChatClick },
  ];

  return (
    <>
      {/* Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[55] md:hidden animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t border-border shadow-lg md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Floating action buttons */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 flex flex-col items-center gap-3 pointer-events-none">
          {actionButtons.map((action, index) => (
            <div
              key={action.label}
              className={cn(
                "pointer-events-auto transition-all duration-300 ease-out",
                isMenuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8 pointer-events-none"
              )}
              style={{
                transitionDelay: isMenuOpen ? `${(actionButtons.length - 1 - index) * 50}ms` : '0ms'
              }}
            >
              <button
                className="flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg bg-card border border-border text-foreground font-medium transition-transform active:scale-95 min-w-[140px]"
                onClick={() => handleActionClick(action.onClick!)}
              >
                <action.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{action.label}</span>
              </button>
            </div>
          ))}
        </div>

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
              "flex flex-col items-center justify-center h-14 w-14 rounded-full",
              "shadow-lg transform transition-all duration-300 ease-out",
              isMenuOpen 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 rotate-45" 
                : "bg-primary text-primary-foreground hover:bg-primary/90 rotate-0"
            )}
            onClick={handleMenuToggle}
          >
            <Plus className="h-7 w-7" />
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
    </>
  );
};
