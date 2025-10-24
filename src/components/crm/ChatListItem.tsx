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
        className={`w-full p-3 text-left rounded-lg transition-all duration-200 relative mb-1.5 border ${
          isPinned 
            ? `border-orange-200 bg-gradient-to-r ${
                isActive 
                  ? 'from-orange-50 to-orange-100/50 shadow-sm dark:from-orange-950 dark:to-orange-900/50' 
                  : 'from-white to-orange-50/30 hover:to-orange-50 dark:from-background dark:to-orange-950/30 hover:shadow-sm'
              }`
            : isActive 
              ? 'bg-accent/50 shadow-sm border-accent' 
              : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
        } ${bulkSelectMode && isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
        onClick={() => {
          if (bulkSelectMode && onBulkSelect) {
            onBulkSelect();
          } else {
            onChatClick();
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {bulkSelectMode && (
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={onBulkSelect}
                className="h-4 w-4 mt-1 rounded border-2"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            <Avatar className={`h-11 w-11 flex-shrink-0 ring-2 transition-all ${
              isPinned 
                ? 'ring-orange-200 shadow-sm' 
                : 'ring-border/30'
            }`}>
              {chat.avatar_url ? (
                <AvatarImage src={chat.avatar_url} alt={chat.name} />
              ) : null}
              <AvatarFallback className={isPinned ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'}>
                {chat.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-0.5">
                <p className={`text-sm ${displayUnread ? 'font-semibold' : 'font-medium'} truncate`}>
                  {chat.name}
                </p>
                {isPinned && (
                  <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                )}
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                {isPinned && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50">
                    В работе
                  </Badge>
                )}
                {isInWorkByOthers && pinnedByUserName && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50">
                    У {pinnedByUserName}
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                {chat.lastMessage || "Нет сообщений"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[11px] text-muted-foreground font-medium">{chat.time}</span>
            {displayUnread && (
              <span className={`${
                isPinned ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-primary to-primary/90'
              } text-white text-xs px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1`}>
                {showEye ? (
                  <>
                    <Avatar className="h-3.5 w-3.5">
                      <AvatarImage src={profile?.avatar_url || ''} alt={`${profile?.first_name || ''} ${profile?.last_name || ''}`} />
                      <AvatarFallback className="text-[7px]">{`${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}` || 'M'}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{Math.max(chat.unread || 0, 1)}</span>
                  </>
                ) : (
                  <span className="font-semibold">{chat.unread}</span>
                )}
              </span>
            )}
          </div>
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
