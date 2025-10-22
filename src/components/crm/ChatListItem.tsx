import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { ChatContextMenu } from "./ChatContextMenu";

interface ChatListItemProps {
  chat: {
    id: string;
    name: string;
    phone: string;
    lastMessage: string;
    time: string;
    unread: number;
    type: 'client' | 'corporate' | 'teachers';
    timestamp: number;
    avatar_url: string | null;
  };
  isActive: boolean;
  isPinned: boolean;
  isArchived: boolean;
  displayUnread: boolean;
  showEye: boolean;
  isInWorkByOthers: boolean;
  pinnedByUserName?: string;
  profile?: any;
  bulkSelectMode: boolean;
  isSelected: boolean;
  onChatClick: () => void;
  onMarkUnread: () => void;
  onPinDialog: () => void;
  onArchive: () => void;
  onBlock?: () => void;
  onBulkSelect?: () => void;
}

export const ChatListItem = React.memo(({ 
  chat, 
  isActive, 
  isPinned, 
  isArchived,
  displayUnread, 
  showEye,
  isInWorkByOthers,
  pinnedByUserName,
  profile,
  bulkSelectMode,
  isSelected,
  onChatClick,
  onMarkUnread,
  onPinDialog,
  onArchive,
  onBlock,
  onBulkSelect
}: ChatListItemProps) => {
  return (
    <ChatContextMenu
      onMarkUnread={onMarkUnread}
      onPinDialog={onPinDialog}
      onArchive={onArchive}
      onBlock={onBlock}
      isPinned={isPinned}
      isArchived={isArchived}
    >
      <button 
        className={`w-full py-1.5 px-2 text-left rounded-lg transition-colors relative ${
          isPinned 
            ? `border-l-2 border-orange-400 ${
                isActive 
                  ? 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900' 
                  : 'bg-orange-25 hover:bg-orange-50 dark:bg-orange-975 dark:hover:bg-orange-950'
              }`
            : isActive 
              ? 'bg-muted hover:bg-muted' 
              : 'hover:bg-muted/50'
        } ${bulkSelectMode && isSelected ? 'ring-2 ring-primary' : ''}`}
        onClick={() => {
          if (bulkSelectMode && onBulkSelect) {
            onBulkSelect();
          } else {
            onChatClick();
          }
        }}
      >
        <div className="flex items-center gap-3">
          {bulkSelectMode && (
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={onBulkSelect}
              className="h-4 w-4"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          <Avatar className="h-10 w-10 flex-shrink-0">
            {chat.avatar_url ? (
              <AvatarImage src={chat.avatar_url} alt={chat.name} />
            ) : null}
            <AvatarFallback>
              {chat.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <p className={`font-medium text-sm ${displayUnread ? 'font-bold' : ''} truncate`}>
                {chat.name}
              </p>
              {isPinned && (
                <Badge variant="outline" className="text-xs h-4 bg-orange-100 text-orange-700 border-orange-300">
                  В работе
                </Badge>
              )}
              {isInWorkByOthers && pinnedByUserName && (
                <Badge variant="outline" className="text-xs h-4 bg-blue-100 text-blue-700 border-blue-300">
                  У {pinnedByUserName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug break-words overflow-hidden">
              {chat.lastMessage || "Нет сообщений"}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          {isPinned && <Pin className="h-3 w-3 text-orange-600 mb-1" />}
          <span className="text-xs text-muted-foreground">{chat.time}</span>
          {displayUnread && (
            <span className={`${isPinned ? 'bg-orange-500' : 'bg-primary'} text-white text-xs px-1.5 py-0.5 rounded-sm mt-1 flex items-center gap-1`}>
              {showEye ? (
                <>
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={profile?.avatar_url || ''} alt={`${profile?.first_name || ''} ${profile?.last_name || ''}`} />
                    <AvatarFallback className="text-[8px]">{`${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}` || 'M'}</AvatarFallback>
                  </Avatar>
                  <span>{Math.max(chat.unread || 0, 1)}</span>
                </>
              ) : (
                chat.unread
              )}
            </span>
          )}
        </div>
      </button>
    </ChatContextMenu>
  );
}, (prevProps, nextProps) => {
  // Оптимизация: ре-рендерить только если изменились критичные пропсы
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.unread === nextProps.chat.unread &&
    prevProps.chat.lastMessage === nextProps.chat.lastMessage &&
    prevProps.chat.time === nextProps.chat.time &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.displayUnread === nextProps.displayUnread &&
    prevProps.showEye === nextProps.showEye &&
    prevProps.bulkSelectMode === nextProps.bulkSelectMode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isInWorkByOthers === nextProps.isInWorkByOthers
  );
});

ChatListItem.displayName = 'ChatListItem';
