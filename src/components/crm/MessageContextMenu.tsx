import React, { ReactNode, useState, useRef, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit2, Trash2, Forward, CheckSquare } from "lucide-react";

interface MessageContextMenuProps {
  children: ReactNode;
  messageId?: string;
  messageType: 'client' | 'manager' | 'system' | 'comment';
  messageText: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onForward?: () => void;
  onSelectMultiple?: () => void;
  isDeleted?: boolean;
}

export const MessageContextMenu = ({
  children,
  messageId,
  messageType,
  messageText,
  onEdit,
  onDelete,
  onForward,
  onSelectMultiple,
  isDeleted = false,
}: MessageContextMenuProps) => {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  // Обработчик для долгого нажатия (мобильные устройства)
  const handleTouchStart = (e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      e.preventDefault();
      const touch = e.touches[0];
      setMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowContextMenu(true);
    }, 500); // 500ms для долгого нажатия
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // Если сообщение удалено, не показываем контекстное меню
  if (isDeleted || messageText === '[Сообщение удалено]') {
    return <>{children}</>;
  }

  // Системные сообщения не имеют контекстного меню
  if (messageType === 'system') {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={triggerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          className="touch-none select-none"
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Редактирование (только для сообщений менеджера) */}
        {messageType === 'manager' && onEdit && (
          <ContextMenuItem onClick={onEdit} className="flex items-center gap-2 cursor-pointer">
            <Edit2 className="h-4 w-4" />
            <span>Редактировать</span>
          </ContextMenuItem>
        )}

        {/* Переслать */}
        {onForward && (
          <ContextMenuItem onClick={onForward} className="flex items-center gap-2 cursor-pointer">
            <Forward className="h-4 w-4" />
            <span>Переслать</span>
          </ContextMenuItem>
        )}

        {/* Выбрать несколько */}
        {onSelectMultiple && (
          <ContextMenuItem onClick={onSelectMultiple} className="flex items-center gap-2 cursor-pointer">
            <CheckSquare className="h-4 w-4" />
            <span>Выбрать несколько</span>
          </ContextMenuItem>
        )}

        {/* Удалить */}
        {onDelete && (
          <ContextMenuItem 
            onClick={onDelete} 
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>Удалить</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
