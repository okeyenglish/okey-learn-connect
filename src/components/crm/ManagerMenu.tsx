import { useState } from "react";
import { User, Settings, Key, LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileModal } from "./ProfileModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isMobile = useIsMobile();

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setIsOpen(false);
  };

  const handleChangePasswordClick = () => {
    setShowPasswordModal(true);
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
            className={`flex items-center gap-2 px-3 py-2 h-auto hover:bg-muted/50 ${isMobile ? 'px-1' : ''}`}
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
    </>
  );
};