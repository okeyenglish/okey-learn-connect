import { useState } from "react";
import { User, Settings, Key, LogOut, ChevronDown, Shield, Bell, BellOff } from "lucide-react";
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
import { ProfileModal } from "./ProfileModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { AdminModal } from "@/components/admin/AdminModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface ManagerMenuProps {
  managerName: string;
  managerEmail?: string;
  avatarUrl?: string;
  onSignOut: () => void;
}

export const ManagerMenu = ({ 
  managerName, 
  managerEmail, 
  avatarUrl, 
  onSignOut 
}: ManagerMenuProps) => {
  const { role, roles } = useAuth();
  const { isSupported, isSubscribed, isLoading: pushLoading, toggle } = usePushNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const isMobile = useIsMobile();
  
  // Check if user is admin or methodist
  // roles is an array, check if it includes admin
  const isAdmin = role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));
  const isMethodist = role === 'methodist' || (Array.isArray(roles) && roles.includes('methodist'));
  const canAccessAdmin = isAdmin || isMethodist;
  
  // Debug logging
  console.log('🔐 ManagerMenu roles check:', { role, roles, isAdmin, isMethodist, canAccessAdmin });

  const handleNotificationToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggle();
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

  // Fix for "null null" display
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
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 h-10 hover:bg-muted/50 ${isMobile ? 'px-1' : ''}`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Hide text on mobile */}
            {!isMobile && (
              <>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  {managerEmail && (
                    <span className="text-xs text-muted-foreground">
                      {managerEmail}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
            <div 
              className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-muted rounded-sm"
              onClick={handleNotificationToggle}
            >
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
                onClick={(e) => e.stopPropagation()}
              />
            </div>
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

      {/* Profile Modal */}
      <ProfileModal 
        open={showProfileModal} 
        onOpenChange={setShowProfileModal} 
      />

      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={showPasswordModal} 
        onOpenChange={setShowPasswordModal} 
      />

      {/* Settings Modal */}
      <SettingsModal 
        open={showSettingsModal} 
        onOpenChange={setShowSettingsModal} 
      />

      {/* Admin Modal */}
      {canAccessAdmin && (
        <AdminModal 
          open={showAdminModal} 
          onOpenChange={setShowAdminModal} 
        />
      )}
    </>
  );
};