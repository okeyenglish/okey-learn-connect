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

  const handleReadStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isUnread && onMarkRead) {
      onMarkRead();
    } else {
      onMarkUnread();
    }
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onPinDialog();
  };

  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onBlock?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
        
        <ContextMenuItem onClick={handlePinClick} className="cursor-pointer">
          <Pin className="mr-2 h-4 w-4" />
          {isPinned ? 'Открепить диалог' : 'Закрепить диалог'}
        </ContextMenuItem>
        
        {onBlock && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleBlockClick} className="cursor-pointer">
              <Lock className="mr-2 h-4 w-4" />
              Заблокировать
            </ContextMenuItem>
          </>
        )}
        
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleDeleteClick} className="cursor-pointer text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить чат
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
