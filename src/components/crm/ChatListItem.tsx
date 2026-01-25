import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pin, MessageSquare } from "lucide-react";
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
  foundInMessages?: boolean;
  searchQuery?: string;
  onChatClick: () => void;
  onMarkUnread: () => void;
  onMarkRead?: () => void;
  onPinDialog: () => void;
  onArchive: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
  onLinkToClient?: () => void;
  onBulkSelect?: () => void;
}

// Highlight matching text with yellow background
const HighlightText = ({ text, query }: { text: string; query?: string }) => {
  if (!query || query.length < 2) {
    return <>{text}</>;
  }
  
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

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
  foundInMessages,
  searchQuery,
  onChatClick,
  onMarkUnread,
  onMarkRead,
  onPinDialog,
  onArchive,
  onBlock,
  onDelete,
  onLinkToClient,
  onBulkSelect
}: ChatListItemProps) => {
  return (
    <ChatContextMenu
      onMarkUnread={onMarkUnread}
      onMarkRead={onMarkRead}
      onPinDialog={onPinDialog}
      onArchive={onArchive}
      onBlock={onBlock}
      onDelete={onDelete}
      onLinkToClient={onLinkToClient}
      isPinned={isPinned}
      isArchived={isArchived}
      isUnread={displayUnread}
    >
      <button 
        className={`w-full p-2 text-left rounded-lg transition-all duration-200 relative mb-0.5 border select-none touch-manipulation ${
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {bulkSelectMode && (
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={onBulkSelect}
                className="h-4 w-4 mt-1 rounded border-2"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            <Avatar className={`h-9 w-9 flex-shrink-0 ring-2 transition-all ${
              isPinned 
                ? 'ring-orange-200 shadow-sm' 
                : 'ring-border/30'
            }`}>
              {chat.avatar_url ? (
                <AvatarImage src={chat.avatar_url} alt={chat.name} />
              ) : null}
              <AvatarFallback className={`text-sm font-medium ${
                isPinned 
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' 
                  : 'bg-primary/15 text-primary'
              }`}>
                {chat.name
                  ?.split(' ')
                  .map(n => n[0])
                  .filter(Boolean)
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            
              <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 mb-0">
                <p className={`text-sm ${displayUnread ? 'font-semibold' : 'font-medium'} truncate`}>
                  <HighlightText text={chat.name} query={searchQuery} />
                </p>
                {isPinned && (
                  <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                )}
              </div>
              
              <div className="flex items-center gap-1 flex-wrap mb-0.5">
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
                {foundInMessages && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 flex items-center gap-0.5">
                    <MessageSquare className="h-2.5 w-2.5" />
                    В сообщениях
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                {chat.lastMessage || "Нет сообщений"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground font-medium">{chat.time}</span>
            {displayUnread && (
              <span className={`${
                isPinned ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-primary to-primary/90'
              } text-white text-xs px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1`}>
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
    prevProps.chat.name === nextProps.chat.name && // ВАЖНО: обновлять при изменении имени
    prevProps.chat.unread === nextProps.chat.unread &&
    prevProps.chat.lastMessage === nextProps.chat.lastMessage &&
    prevProps.chat.time === nextProps.chat.time &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.displayUnread === nextProps.displayUnread &&
    prevProps.showEye === nextProps.showEye &&
    prevProps.bulkSelectMode === nextProps.bulkSelectMode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isInWorkByOthers === nextProps.isInWorkByOthers &&
    prevProps.foundInMessages === nextProps.foundInMessages &&
    prevProps.searchQuery === nextProps.searchQuery
  );
});

ChatListItem.displayName = 'ChatListItem';
