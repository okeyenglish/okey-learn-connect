import React, { useState, useRef, useCallback } from 'react';
import { Pencil, Trash2, Forward } from 'lucide-react';

interface MessageContextMenuProps {
  children: React.ReactNode;
  isOwn: boolean;
  isStaffChat: boolean;
  isDeleted?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onForward?: () => void;
}

export const MessageContextMenu = ({
  children,
  isOwn,
  isStaffChat,
  isDeleted,
  onEdit,
  onDelete,
  onForward,
}: MessageContextMenuProps) => {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);

  const hasActions = isStaffChat && !isDeleted && (isOwn || onForward);
  
  const openMenu = useCallback((x: number, y: number) => {
    if (!hasActions) return;
    setMenuPos({ x, y });
  }, [hasActions]);

  const closeMenu = useCallback(() => setMenuPos(null), []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!hasActions) return;
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  }, [hasActions, openMenu]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasActions) return;
    touchMoved.current = false;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        openMenu(touch.clientX, touch.clientY);
      }
    }, 500);
  }, [hasActions, openMenu]);

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>

      {menuPos && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[100]" onClick={closeMenu} onContextMenu={(e) => { e.preventDefault(); closeMenu(); }} />
          
          {/* Menu */}
          <div
            className="fixed z-[101] min-w-[160px] rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
            style={{
              left: Math.min(menuPos.x, window.innerWidth - 180),
              top: Math.min(menuPos.y, window.innerHeight - 160),
            }}
          >
            {isOwn && onEdit && (
              <button
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => { onEdit(); closeMenu(); }}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
                Редактировать
              </button>
            )}
            {onForward && (
              <button
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => { onForward(); closeMenu(); }}
              >
                <Forward className="h-4 w-4 text-muted-foreground" />
                Переслать
              </button>
            )}
            {isOwn && onDelete && (
              <button
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => { onDelete(); closeMenu(); }}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
};
