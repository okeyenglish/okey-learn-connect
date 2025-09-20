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

  const handleProfileClick = () => {
    // TODO: Implement profile modal/page
    console.log("Open profile");
    setIsOpen(false);
  };

  const handleChangePasswordClick = () => {
    // TODO: Implement change password modal
    console.log("Change password");
    setIsOpen(false);
  };

  const handleSignOutClick = () => {
    onSignOut();
    setIsOpen(false);
  };

  const initials = managerName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 h-auto hover:bg-muted/50"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={managerName} />
            <AvatarFallback className="text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium text-foreground">
              {managerName}
            </span>
            {managerEmail && (
              <span className="text-xs text-muted-foreground">
                {managerEmail}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
  );
};