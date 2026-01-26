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
  Trash2,
  Lock,
} from "lucide-react";

interface TeacherChatContextMenuProps {
  children: ReactNode;
  onMarkUnread: () => void;
  onMarkRead?: () => void;
  onPinDialog: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
  isPinned?: boolean;
  isUnread?: boolean;
}

export const TeacherChatContextMenu = ({ 
  children, 
  onMarkUnread, 
  onMarkRead,
  onPinDialog, 
  onBlock,
  onDelete,
  isPinned = false,
  isUnread = false
}: TeacherChatContextMenuProps) => {
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

  const handlePinClick = () => {
    onPinDialog();
  };

  const handleBlockClick = () => {
    onBlock?.();
  };

  const handleDeleteClick = () => {
    onDelete?.();
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
        <ContextMenuItem onSelect={handleReadStatusToggle} className="cursor-pointer">
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
        
        <ContextMenuItem onSelect={handlePinClick} className="cursor-pointer">
          <Pin className="mr-2 h-4 w-4" />
          {isPinned ? 'Открепить диалог' : 'Закрепить диалог'}
        </ContextMenuItem>
        
        {onBlock && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={handleBlockClick} className="cursor-pointer">
              <Lock className="mr-2 h-4 w-4" />
              Заблокировать
            </ContextMenuItem>
          </>
        )}
        
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={handleDeleteClick} className="cursor-pointer text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить чат
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
