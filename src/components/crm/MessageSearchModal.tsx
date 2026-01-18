import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, X, MessageCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useMessageSearch } from '@/hooks/useMessageSearch';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MessageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  onSelectMessage?: (messageId: string, clientId: string) => void;
}

/**
 * Modal for searching messages across all chats or within a specific client
 * - Debounced search input
 * - Highlighted matches
 * - Click to navigate to message
 */
export const MessageSearchModal = memo(({ 
  isOpen, 
  onClose, 
  clientId,
  onSelectMessage 
}: MessageSearchModalProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    query,
    setQuery,
    results,
    isLoading,
    isFetching,
    highlightMatch,
    clearSearch,
    isSearching,
  } = useMessageSearch({ clientId });

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearSearch();
    }
  }, [isOpen, clearSearch]);

  const handleClose = useCallback(() => {
    clearSearch();
    onClose();
  }, [clearSearch, onClose]);

  const handleSelectResult = useCallback((messageId: string, msgClientId: string) => {
    onSelectMessage?.(messageId, msgClientId);
    handleClose();
  }, [onSelectMessage, handleClose]);

  const getMessengerBadge = (type: string | null) => {
    switch (type) {
      case 'whatsapp':
        return <Badge className="bg-green-500 text-white text-[10px] px-1">WA</Badge>;
      case 'telegram':
        return <Badge className="bg-blue-500 text-white text-[10px] px-1">TG</Badge>;
      case 'max':
        return <Badge className="bg-purple-500 text-white text-[10px] px-1">MAX</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Поиск сообщений
            {clientId && (
              <Badge variant="secondary" className="ml-2">
                В текущем чате
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите текст для поиска..."
              className="pl-10 pr-10"
              autoComplete="off"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isSearching && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
              {results.length > 0 
                ? `Найдено ${results.length} сообщений`
                : isFetching 
                  ? 'Поиск...' 
                  : 'Ничего не найдено'
              }
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1 px-4">
          {!isSearching && (
            <div className="py-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Начните вводить текст для поиска</p>
              <p className="text-xs mt-1">Минимум 2 символа</p>
            </div>
          )}
          
          {isSearching && results.length === 0 && !isFetching && (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Сообщения не найдены</p>
              <p className="text-xs mt-1">Попробуйте изменить запрос</p>
            </div>
          )}
          
          {results.length > 0 && (
            <div className="py-3 space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    "hover:bg-muted/50 hover:border-primary/30"
                  )}
                  onClick={() => handleSelectResult(result.id, result.client_id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {!clientId && result.client_name && (
                        <span className="font-medium text-sm truncate">
                          {result.client_name}
                        </span>
                      )}
                      {getMessengerBadge(result.messenger_type)}
                      {result.is_outgoing && (
                        <Badge variant="outline" className="text-[10px] px-1">
                          Исходящее
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(result.created_at), { 
                        addSuffix: true, 
                        locale: ru 
                      })}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {highlightMatch(result.message_text, query)}
                  </p>
                  
                  <div className="mt-2 flex items-center justify-end">
                    <span className="text-xs text-primary flex items-center gap-1">
                      Перейти к сообщению
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">ESC</kbd>
              {' '}чтобы закрыть
            </span>
            {results.length > 0 && (
              <span>Показано {results.length} результатов</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

MessageSearchModal.displayName = 'MessageSearchModal';

export default MessageSearchModal;
