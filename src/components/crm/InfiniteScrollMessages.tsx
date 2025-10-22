import React, { useEffect, useRef, useCallback } from 'react';
import { useInfiniteChatMessages } from '@/hooks/useInfiniteChatMessages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollMessagesProps {
  clientId: string;
  renderMessage: (message: any) => React.ReactNode;
}

export const InfiniteScrollMessages = ({ clientId, renderMessage }: InfiniteScrollMessagesProps) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteChatMessages(clientId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // Все сообщения из всех страниц
  const allMessages = data?.pages.flatMap(page => page.messages) ?? [];

  // Автоматическая подгрузка при скролле вверх (к началу истории)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Скролл вниз при первой загрузке или новых сообщениях
  useEffect(() => {
    if (scrollRef.current && isInitialLoad.current && !isLoading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isInitialLoad.current = false;
    }
  }, [allMessages.length, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      {/* Индикатор загрузки старых сообщений */}
      <div ref={observerTarget} className="h-10 flex items-center justify-center mb-4">
        {isFetchingNextPage && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
        {hasNextPage && !isFetchingNextPage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchNextPage()}
            className="text-xs text-muted-foreground"
          >
            Загрузить старые сообщения
          </Button>
        )}
      </div>

      {/* Список сообщений */}
      <div className="space-y-4">
        {allMessages.map((message) => (
          <React.Fragment key={message.id}>
            {renderMessage(message)}
          </React.Fragment>
        ))}
      </div>

      {allMessages.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          Нет сообщений
        </div>
      )}
    </ScrollArea>
  );
};
