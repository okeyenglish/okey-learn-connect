import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LazyAvatar, getAvatarInitials } from "@/components/ui/LazyAvatar";
import { Badge } from "@/components/ui/badge";
import { Pin, MessageSquare, MessageCircle, Info, Phone } from "lucide-react";
import { ChatContextMenu } from "./ChatContextMenu";
import { ChatPresenceIndicator } from "./ChatPresenceIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PresenceInfo } from '@/hooks/useChatPresence';

// Messenger icon component for avatar badge
const MessengerIcon = ({ messenger }: { messenger: string | null | undefined }) => {
  if (!messenger) return null;
  
  const iconConfig: Record<string, { icon: React.ReactNode; bg: string; tooltip: string }> = {
    whatsapp: { 
      icon: <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
      bg: 'bg-[#25D366]', 
      tooltip: 'WhatsApp' 
    },
    telegram: { 
      icon: <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
      bg: 'bg-[#0088cc]', 
      tooltip: 'Telegram' 
    },
    max: { 
      icon: <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
      bg: 'bg-purple-500', 
      tooltip: 'MAX' 
    },
    chatos: { 
      icon: <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/></svg>,
      bg: 'bg-orange-500', 
      tooltip: 'ChatOS' 
    },
    calls: { 
      icon: <Phone className="w-2 h-2 text-white" />,
      bg: 'bg-red-500', 
      tooltip: 'Звонок' 
    },
  };
  
  const config = iconConfig[messenger.toLowerCase()];
  if (!config) return null;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${config.bg} rounded-full flex items-center justify-center ring-2 ring-background shadow-sm`}
        >
          {config.icon}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

interface TypingInfo {
  count: number;
  names: string[];
  draftText?: string | null;
}

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
    last_message_messenger?: string | null; // Messenger of the last message
    last_unread_messenger?: string | null; // Last messenger with unread message
  };
  isActive: boolean;
  isPinned: boolean;
  isArchived: boolean;
  displayUnread: boolean;
  showEye: boolean;
  isInWorkByOthers: boolean;
  pinnedByUserName?: string;
  pinnedByUserId?: string;
  isPinnedByUserOnline?: boolean;
  onMessageUser?: (userId: string, userName: string) => void;
  profile?: any;
  bulkSelectMode: boolean;
  isSelected: boolean;
  foundInMessages?: boolean;
  searchQuery?: string;
  typingInfo?: TypingInfo | null;
  presenceInfo?: PresenceInfo | null;
  isNewMessage?: boolean; // Флаг для подсветки нового сообщения
  onChatClick: () => void;
  onMarkUnread: () => void;
  onMarkRead?: () => void;
  onPinDialog: () => void;
  onArchive: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
  onLinkToClient?: () => void;
  onConvertToTeacher?: () => void;
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
  pinnedByUserId,
  isPinnedByUserOnline,
  onMessageUser,
  profile,
  bulkSelectMode,
  isSelected,
  foundInMessages,
  searchQuery,
  typingInfo,
  presenceInfo,
  isNewMessage,
  onChatClick,
  onMarkUnread,
  onMarkRead,
  onPinDialog,
  onArchive,
  onBlock,
  onDelete,
  onLinkToClient,
  onConvertToTeacher,
  onBulkSelect
}: ChatListItemProps) => {
  const isTyping = typingInfo && typingInfo.count > 0;
  const hasPresence = presenceInfo && presenceInfo.viewers.length > 0;
  const isSystemChat = chat.type === 'corporate' || chat.type === 'teachers';
  
  return (
    <ChatContextMenu
      onMarkUnread={onMarkUnread}
      onMarkRead={onMarkRead}
      onPinDialog={onPinDialog}
      onArchive={onArchive}
      onBlock={onBlock}
      onDelete={onDelete}
      onLinkToClient={onLinkToClient}
      onConvertToTeacher={onConvertToTeacher}
      isPinned={isPinned}
      isArchived={isArchived}
      isUnread={displayUnread}
    >
      <button 
        className={`w-full p-2 text-left rounded-lg transition-all duration-200 relative mb-0.5 border select-none touch-manipulation ${
          isActive 
            ? 'bg-accent/50 shadow-sm border-accent' 
            : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
        } ${bulkSelectMode && isSelected ? 'ring-2 ring-primary ring-offset-1' : ''} ${
          isNewMessage ? 'new-message-glow' : ''
        }`}
        onClick={() => {
          if (bulkSelectMode && onBulkSelect && !isSystemChat) {
            onBulkSelect();
          } else {
            onChatClick();
          }
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {bulkSelectMode && (
              isSystemChat ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-4 w-4 mt-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs max-w-[200px]">
                    Системный чат. Массовые действия не применяются.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={onBulkSelect}
                  className="h-4 w-4 mt-1 rounded border-2"
                  onClick={(e) => e.stopPropagation()}
                />
              )
            )}
            
            <div className="relative flex-shrink-0">
              <LazyAvatar
                src={chat.avatar_url}
                alt={chat.name}
                fallback={chat.name
                  ?.split(' ')
                  .map(n => n[0])
                  .filter(Boolean)
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || '?'}
                size="custom"
                className="h-9 w-9 ring-2 ring-border/30"
                fallbackClassName="bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))]"
                rootMargin="200px"
              />
              {(chat.last_message_messenger || chat.last_unread_messenger) && (
                <MessengerIcon messenger={chat.last_message_messenger || chat.last_unread_messenger || ''} />
              )}
            </div>
            
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] h-4 px-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pinnedByUserId && onMessageUser) {
                            onMessageUser(pinnedByUserId, pinnedByUserName);
                          }
                        }}
                      >
                        {isPinnedByUserOnline && (
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        )}
                        В работе: {pinnedByUserName.split(' ')[0]}
                        <MessageCircle className="h-2.5 w-2.5 ml-0.5" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {isPinnedByUserOnline ? '🟢 Онлайн — ' : ''}Написать в ChatOS
                    </TooltipContent>
                  </Tooltip>
                )}
                {foundInMessages && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 flex items-center gap-0.5">
                    <MessageSquare className="h-2.5 w-2.5" />
                    В сообщениях
                  </Badge>
                )}
              </div>
              
              {isTyping ? (
                <div className="text-xs text-orange-600 italic leading-relaxed animate-fade-in">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex gap-0.5">
                      <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </span>
                    <span className="truncate">{typingInfo?.names?.[0] || 'Сотрудник'} печатает...</span>
                  </div>
                  {typingInfo?.draftText && (
                    <p className="text-[11px] text-orange-500/80 truncate mt-0.5 font-normal not-italic animate-fade-in" style={{animationDelay: '100ms'}}>
                      «{typingInfo.draftText.length > 50 ? `${typingInfo.draftText.slice(0, 50)}…` : typingInfo.draftText}»
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed transition-opacity duration-200">
                  {chat.lastMessage || "Нет сообщений"}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <div className="flex items-center gap-1">
              {/* Presence indicator */}
              {hasPresence && (
                <ChatPresenceIndicator presence={presenceInfo} compact clientName={chat.name} />
              )}
              <span className="text-[10px] text-muted-foreground font-medium">{chat.time}</span>
            </div>
            {displayUnread && (
              <span className="bg-gradient-to-r from-primary to-primary/90 text-white text-xs px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
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
  const prevTypingCount = prevProps.typingInfo?.count ?? 0;
  const nextTypingCount = nextProps.typingInfo?.count ?? 0;
  const prevTypingName = prevProps.typingInfo?.names?.[0] ?? '';
  const nextTypingName = nextProps.typingInfo?.names?.[0] ?? '';
  const prevDraftText = prevProps.typingInfo?.draftText ?? '';
  const nextDraftText = nextProps.typingInfo?.draftText ?? '';
  const prevPresenceCount = prevProps.presenceInfo?.viewers?.length ?? 0;
  const nextPresenceCount = nextProps.presenceInfo?.viewers?.length ?? 0;
  
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.name === nextProps.chat.name &&
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
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.isNewMessage === nextProps.isNewMessage &&
    prevTypingCount === nextTypingCount &&
    prevTypingName === nextTypingName &&
    prevDraftText === nextDraftText &&
    prevPresenceCount === nextPresenceCount
  );
});

ChatListItem.displayName = 'ChatListItem';
