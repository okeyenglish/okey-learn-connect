import React, { ReactNode, useState, useRef, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Edit2, Trash2, Forward, CheckSquare, Copy, Quote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageContextMenuProps {
  children: ReactNode;
  messageId?: string;
  messageType: 'client' | 'manager' | 'system' | 'comment';
  messageText: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onForward?: () => void;
  onSelectMultiple?: () => void;
  onQuote?: (text: string) => void;
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
  onQuote,
  isDeleted = false,
}: MessageContextMenuProps) => {
  const { toast } = useToast();
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  // Обработчик для долгого нажатия (мобильные устройства)
  const handleTouchStart = (e: React.TouchEvent) => {
    // Save touch position for long press detection
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    const timer = setTimeout(() => {
      // Only prevent default and show menu after long press confirmed
      setMenuPosition({ x: startX, y: startY });
      setShowContextMenu(true);
      // Clear text selection when menu opens
      window.getSelection()?.removeAllRanges();
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

  // Копирование текста
  const handleCopy = async () => {
    // Сначала проверяем, есть ли выделенный текст
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    const textToCopy = selectedText || messageText;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Скопировано",
        description: selectedText ? "Выделенный текст скопирован" : "Сообщение скопировано",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать текст",
        variant: "destructive",
      });
    }
  };

  // Цитирование текста
  const handleQuote = () => {
    // Проверяем, есть ли выделенный текст
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    const textToQuote = selectedText || messageText;
    
    if (onQuote) {
      onQuote(textToQuote);
    } else {
      // Если нет обработчика, просто копируем с форматированием цитаты
      const quotedText = `> ${textToQuote.split('\n').join('\n> ')}\n\n`;
      navigator.clipboard.writeText(quotedText);
      toast({
        title: "Цитата скопирована",
        description: "Вставьте цитату в поле ввода",
      });
    }
  };

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
          className="select-none"
          style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Копировать */}
        <ContextMenuItem onClick={handleCopy} className="flex items-center gap-2 cursor-pointer">
          <Copy className="h-4 w-4" />
          <span>Копировать</span>
        </ContextMenuItem>

        {/* Цитировать */}
        <ContextMenuItem onClick={handleQuote} className="flex items-center gap-2 cursor-pointer">
          <Quote className="h-4 w-4" />
          <span>Цитировать</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

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
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={onDelete} 
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>Удалить</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
