import { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { 
  MessageCircle,
  MessageCircleOff, 
  Pin, 
  Archive, 
  Trash2,
  Lock,
  Link2,
  GraduationCap,
  BellOff,
  Bell
} from "lucide-react";

interface ChatContextMenuProps {
  children: ReactNode;
  onMarkUnread: () => void;
  onMarkRead?: () => void;
  onPinDialog: () => void;
  onArchive: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
  onLinkToClient?: () => void;
  onConvertToTeacher?: () => void;
  onToggleMute?: () => void;
  isPinned?: boolean;
  isArchived?: boolean;
  isUnread?: boolean;
  isMuted?: boolean;
}

export const ChatContextMenu = ({ 
  children, 
  onMarkUnread, 
  onMarkRead,
  onPinDialog, 
  onArchive,
  onBlock,
  onDelete,
  onLinkToClient,
  onConvertToTeacher,
  onToggleMute,
  isPinned = false,
  isArchived = false,
  isUnread = false,
  isMuted = false
}: ChatContextMenuProps) => {
  const clearNativeSelection = () => {
    try {
      window.getSelection?.()?.removeAllRanges();
    } catch {
      // noop
    }
  };

  const handleReadStatusToggle = () => {
    if (isUnread && onMarkRead) {
      onMarkRead();
    } else {
      onMarkUnread();
    }
  };

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) clearNativeSelection();
      }}
    >
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleReadStatusToggle} className="cursor-pointer">
          {isUnread ? (
            <>
              <MessageCircle className="mr-2 h-4 w-4" />
              Отметить прочитанным
            </>
          ) : (
            <>
              <MessageCircleOff className="mr-2 h-4 w-4" />
              Отметить непрочитанным
            </>
          )}
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onPinDialog} className="cursor-pointer">
          <Pin className="mr-2 h-4 w-4" />
          {isPinned ? 'Открепить диалог' : 'Закрепить диалог'}
        </ContextMenuItem>
        
        {onToggleMute && (
          <ContextMenuItem onClick={onToggleMute} className="cursor-pointer">
            {isMuted ? (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Включить звук
              </>
            ) : (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                Отключить звук
              </>
            )}
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {onLinkToClient && (
          <ContextMenuItem onClick={onLinkToClient} className="cursor-pointer">
            <Link2 className="mr-2 h-4 w-4" />
            Привязать к клиенту
          </ContextMenuItem>
        )}
        
        {onConvertToTeacher && (
          <ContextMenuItem onClick={onConvertToTeacher} className="cursor-pointer text-purple-600">
            <GraduationCap className="mr-2 h-4 w-4" />
            Перевести в преподаватели
          </ContextMenuItem>
        )}
        
        {onBlock && (
          <ContextMenuItem onClick={onBlock} className="cursor-pointer">
            <Lock className="mr-2 h-4 w-4" />
            Заблокировать клиента
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={onArchive} className="cursor-pointer text-orange-600">
          <Archive className="mr-2 h-4 w-4" />
          {isArchived ? 'Разархивировать' : 'Архивировать'}
        </ContextMenuItem>
        
        {onDelete && (
          <ContextMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить чат
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};