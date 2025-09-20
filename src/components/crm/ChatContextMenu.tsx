import { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { 
  MessageCircleOff, 
  Pin, 
  Archive, 
  Trash2,
  Lock,
  MoreHorizontal
} from "lucide-react";

interface ChatContextMenuProps {
  children: ReactNode;
  onMarkUnread: () => void;
  onPinDialog: () => void;
  onArchive: () => void;
  onBlock?: () => void;
  isPinned?: boolean;
  isArchived?: boolean;
}

export const ChatContextMenu = ({ 
  children, 
  onMarkUnread, 
  onPinDialog, 
  onArchive,
  onBlock,
  isPinned = false,
  isArchived = false 
}: ChatContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onMarkUnread} className="cursor-pointer">
          <MessageCircleOff className="mr-2 h-4 w-4" />
          Отметить непрочитанным
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onPinDialog} className="cursor-pointer">
          <Pin className="mr-2 h-4 w-4" />
          {isPinned ? 'Открепить диалог' : 'Закрепить диалог'}
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        {onBlock && (
          <>
            <ContextMenuItem onClick={onBlock} className="cursor-pointer">
              <Lock className="mr-2 h-4 w-4" />
              Заблокировать клиента
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        
        <ContextMenuItem onClick={onArchive} className="cursor-pointer text-orange-600">
          <Archive className="mr-2 h-4 w-4" />
          {isArchived ? 'Разархивировать' : 'Архивировать'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};