import React, { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatListItem } from './ChatListItem';
import { usePrefetchMessages } from '@/hooks/useChatMessagesOptimized';
import { Loader2 } from 'lucide-react';

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
  // Infinite scroll props
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
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
  onLinkChat,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore
}: VirtualizedChatListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { prefetch } = usePrefetchMessages();

  const virtualizer = useVirtualizer({
    count: chats.length + (hasNextPage ? 1 : 0), // +1 for loading indicator
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => index === chats.length ? 48 : 60, // Loading row is smaller
    overscan: 5,
  });

  // Infinite scroll: load more only when user actually scrolls near the bottom
  // Uses scroll position instead of virtual items to prevent runaway loading
  useEffect(() => {
    const parentElement = parentRef.current;
    if (!parentElement || !hasNextPage || !onLoadMore) return;

    let isLoadingMore = false;

    const handleScroll = () => {
      if (isLoadingMore || isFetchingNextPage) return;
      
      const { scrollTop, scrollHeight, clientHeight } = parentElement;
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 300;
      
      if (scrolledToBottom) {
        isLoadingMore = true;
        console.log('[VirtualizedChatList] Loading more - scrolled near bottom');
        onLoadMore();
        // Reset after a delay to allow new data to load
        setTimeout(() => { isLoadingMore = false; }, 1000);
      }
    };

    parentElement.addEventListener('scroll', handleScroll);
    return () => parentElement.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, onLoadMore, isFetchingNextPage]);

  // Debounced prefetch on hover - only prefetch if hovering for 150ms
  // Prioritizes unread chats for instant prefetch
  const handleMouseEnter = useCallback((chatId: string, hasUnread: boolean) => {
    // Clear any existing timer for this chat
    const existingTimer = hoverTimerRef.current.get(chatId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Instant prefetch for unread chats, debounced for others
    const delay = hasUnread ? 0 : 150;
    
    const timer = setTimeout(() => {
      prefetch(chatId);
      hoverTimerRef.current.delete(chatId);
    }, delay);
    
    hoverTimerRef.current.set(chatId, timer);
  }, [prefetch]);

  const handleMouseLeave = useCallback((chatId: string) => {
    // Cancel prefetch if user leaves before delay
    const timer = hoverTimerRef.current.get(chatId);
    if (timer) {
      clearTimeout(timer);
      hoverTimerRef.current.delete(chatId);
    }
  }, []);

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
          // Loading indicator row
          if (virtualRow.index === chats.length) {
            return (
              <div
                key="loading"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center justify-center py-2"
              >
                {isFetchingNextPage && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
            );
          }

          const chat = chats[virtualRow.index];
          if (!chat) return null;
          
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
              onMouseEnter={() => handleMouseEnter(chat.id, displayUnread)}
              onMouseLeave={() => handleMouseLeave(chat.id)}
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
