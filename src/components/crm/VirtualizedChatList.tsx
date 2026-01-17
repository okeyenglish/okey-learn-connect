import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatListItem } from './ChatListItem';
import { usePrefetchMessages } from '@/hooks/useChatMessagesOptimized';

interface VirtualizedChatListProps {
  chats: any[];
  activeChatId: string | null;
  profile: any;
  bulkSelectMode: boolean;
  selectedChatIds: Set<string>;
  getChatState: (chatId: string) => any;
  isChatReadGlobally: (chatId: string) => boolean;
  isInWorkByOthers: (chatId: string) => boolean;
  getPinnedByUserName: (chatId: string) => string;
  onChatClick: (chatId: string, type: string) => void;
  onChatAction: (chatId: string, action: string) => void;
  onBulkSelect: (chatId: string) => void;
  onDeleteChat?: (chatId: string, chatName: string) => void;
  onLinkChat?: (chatId: string, chatName: string) => void;
}

export const VirtualizedChatList = React.memo(({
  chats,
  activeChatId,
  profile,
  bulkSelectMode,
  selectedChatIds,
  getChatState,
  isChatReadGlobally,
  isInWorkByOthers,
  getPinnedByUserName,
  onChatClick,
  onChatAction,
  onBulkSelect,
  onDeleteChat,
  onLinkChat
}: VirtualizedChatListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const { prefetch } = usePrefetchMessages();

  const virtualizer = useVirtualizer({
    count: chats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 4,
  });

  // Prefetch messages on hover for instant chat opening
  const handleMouseEnter = useCallback((chatId: string) => {
    prefetch(chatId);
  }, [prefetch]);

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-auto min-h-[300px]"
      style={{ contain: 'strict', height: '100%' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const chat = chats[virtualRow.index];
          const chatState = getChatState(chat.id);
          const showEye = !!chatState?.isUnread;
          // Непрочитанность определяем по сообщениям (message-level is_read),
          // не маскируем её глобальной отметкой прочитанности.
          const unreadByMessages = Number(chat.unread) > 0;
          const displayUnread = showEye || unreadByMessages;

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onMouseEnter={() => handleMouseEnter(chat.id)}
            >
              <div className="h-full">
                <ChatListItem
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  isPinned={chatState.isPinned}
                  isArchived={chatState.isArchived}
                  displayUnread={displayUnread}
                  showEye={showEye}
                  isInWorkByOthers={isInWorkByOthers(chat.id)}
                  pinnedByUserName={getPinnedByUserName(chat.id)}
                  profile={profile}
                  bulkSelectMode={bulkSelectMode}
                  isSelected={selectedChatIds.has(chat.id)}
                  onChatClick={() => onChatClick(chat.id, chat.type)}
                  onMarkUnread={() => onChatAction(chat.id, 'unread')}
                  onPinDialog={() => onChatAction(chat.id, 'pin')}
                  onArchive={() => onChatAction(chat.id, 'archive')}
                  onBlock={chat.type === 'client' ? () => onChatAction(chat.id, 'block') : undefined}
                  onDelete={chat.type === 'client' && onDeleteChat ? () => onDeleteChat(chat.id, chat.name) : undefined}
                  onLinkToClient={chat.type === 'client' && onLinkChat ? () => onLinkChat(chat.id, chat.name) : undefined}
                  onBulkSelect={() => onBulkSelect(chat.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedChatList.displayName = 'VirtualizedChatList';
