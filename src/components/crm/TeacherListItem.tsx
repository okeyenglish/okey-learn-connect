import React, { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Pin } from 'lucide-react';
import { TeacherChatItem } from '@/hooks/useTeacherChats';
import { TeacherChatContextMenu } from './TeacherChatContextMenu';
import { supabase } from '@/integrations/supabase/typedClient';

// Messenger icon configuration
const MESSENGER_CONFIG: Record<string, { color: string; label: string }> = {
  whatsapp: { color: '#25D366', label: 'WhatsApp' },
  telegram: { color: '#0088cc', label: 'Telegram' },
  max: { color: '#7c3aed', label: 'MAX' },
  chatos: { color: '#f97316', label: 'ChatOS' },
  call: { color: '#ef4444', label: 'Звонок' },
};

// Messenger icon component
const MessengerIcon: React.FC<{ messenger: string }> = ({ messenger }) => {
  const config = MESSENGER_CONFIG[messenger.toLowerCase()];
  if (!config) return null;

  const renderIcon = () => {
    switch (messenger.toLowerCase()) {
      case 'whatsapp':
        return (
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.79 23.39l4.59-1.203A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.239 0-4.308-.724-5.992-1.952l-.429-.281-3.09.81.826-3.016-.308-.489A9.948 9.948 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
          </svg>
        );
      case 'telegram':
        return (
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="white">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        );
      case 'max':
        return (
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
      case 'chatos':
        return (
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.08L2 22l4.92-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm2.07-7.75l-.9.92C11.45 10.9 11 11.5 11 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H6c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
          </svg>
        );
      case 'call':
        return (
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="white">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-background shadow-sm z-10"
            style={{ backgroundColor: config.color }}
          >
            {renderIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {config.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Map subject names to country flag emojis
const getSubjectFlag = (subject: string): string => {
  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes('английск') || subjectLower.includes('english')) return '🇬🇧';
  if (subjectLower.includes('китайск') || subjectLower.includes('chinese')) return '🇨🇳';
  if (subjectLower.includes('немецк') || subjectLower.includes('german')) return '🇩🇪';
  if (subjectLower.includes('французск') || subjectLower.includes('french')) return '🇫🇷';
  if (subjectLower.includes('испанск') || subjectLower.includes('spanish')) return '🇪🇸';
  if (subjectLower.includes('итальянск') || subjectLower.includes('italian')) return '🇮🇹';
  if (subjectLower.includes('японск') || subjectLower.includes('japanese')) return '🇯🇵';
  if (subjectLower.includes('корейск') || subjectLower.includes('korean')) return '🇰🇷';
  if (subjectLower.includes('русск') || subjectLower.includes('russian')) return '🇷🇺';
  if (subjectLower.includes('арабск') || subjectLower.includes('arabic')) return '🇸🇦';
  if (subjectLower.includes('португальск') || subjectLower.includes('portuguese')) return '🇵🇹';
  return '';
};

// Get all flags for a teacher's subjects
export const getSubjectFlags = (subjects: string[] | null): string => {
  if (!subjects || subjects.length === 0) return '';
  const flags = subjects.map(getSubjectFlag).filter(Boolean);
  // Remove duplicates
  return [...new Set(flags)].join(' ');
};

// Format time for display
const formatMessageTime = (timestamp: string | null): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  }
  
  // Show date for older messages
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

interface TeacherListItemProps {
  teacher: TeacherChatItem;
  isSelected: boolean;
  pinCount: number;
  onClick: () => void;
  compact?: boolean;
  onMarkUnread?: () => void;
  onMarkRead?: () => void;
  onPinDialog?: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
  onPrefetch?: (teacherId: string, clientId: string | null) => void;
  isInWorkByOthers?: boolean;
  pinnedByUserName?: string;
}

export const TeacherListItem: React.FC<TeacherListItemProps> = ({
  teacher,
  isSelected,
  pinCount,
  onClick,
  onMarkUnread,
  onMarkRead,
  onPinDialog,
  onBlock,
  onDelete,
  onPrefetch,
  isInWorkByOthers = false,
  pinnedByUserName
}) => {
  const queryClient = useQueryClient();
  const prefetchTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetched = useRef(false);

  const initials = `${teacher.lastName?.[0] || ''}${teacher.firstName?.[0] || ''}`.toUpperCase() || '•';
  const flags = getSubjectFlags(teacher.subjects);
  const messageTime = formatMessageTime(teacher.lastMessageTime);
  const isPinned = pinCount > 0;
  const isUnread = teacher.unreadMessages > 0;
  
  // UUID validation for clientId (skip prefetch for teacher:uuid markers)
  const isValidUUID = (id: string | null): boolean => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };
  
  // Prefetch chat messages on hover with delay
  const handleMouseEnter = useCallback(() => {
    // Don't prefetch if already selected or no valid UUID clientId
    if (isSelected || hasPrefetched.current) return;
    
    const clientId = teacher.clientId;
    
    // Skip prefetch for non-UUID clientIds (like "teacher:uuid" markers)
    if (!isValidUUID(clientId)) {
      // For teacher:uuid, we could prefetch teacher-chat-messages-v2 instead
      if (clientId?.startsWith('teacher:')) {
        const teacherId = clientId.replace('teacher:', '');
        queryClient.prefetchQuery({
          queryKey: ['teacher-chat-messages-v2', teacherId],
          queryFn: async () => {
            // Self-hosted schema: message_text, is_outgoing, messenger_type (no content, direction, external_id)
            const { data } = await (supabase.from('chat_messages') as any)
              .select('id, teacher_id, message_text, message_type, is_read, is_outgoing, created_at, file_url, file_name, file_type, external_message_id, messenger_type, call_duration, message_status, metadata')
              .eq('teacher_id', teacherId)
              .order('created_at', { ascending: false })
              .limit(50);
            return { items: (data || []).reverse(), nextCursor: 50, hasMore: (data?.length || 0) >= 50, total: 0 };
          },
          staleTime: 30000,
        });
        hasPrefetched.current = true;
      }
      onPrefetch?.(teacher.id, clientId);
      return;
    }
    
    // Delay prefetch to avoid unnecessary requests on quick mouse movements
    prefetchTimeout.current = setTimeout(() => {
      // Prefetch messages for this teacher (self-hosted columns only)
      queryClient.prefetchQuery({
        queryKey: ['teacher-chat-messages', clientId],
        queryFn: async () => {
          // Self-hosted schema: NO content, media_url, messenger, status, external_id
          const { data } = await supabase
            .from('chat_messages')
            .select('id, client_id, message_text, message_type, is_read, is_outgoing, created_at, file_url, file_name, file_type, external_message_id, messenger_type, call_duration, message_status, metadata')
            .eq('client_id', clientId!)
            .order('created_at', { ascending: false })
            .limit(50);
          return data || [];
        },
        staleTime: 30000,
      });
      hasPrefetched.current = true;
      
      // Notify parent for additional prefetch if needed
      onPrefetch?.(teacher.id, clientId);
    }, 150); // 150ms delay before prefetch
  }, [teacher.id, teacher.clientId, isSelected, queryClient, onPrefetch]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeout.current) {
      clearTimeout(prefetchTimeout.current);
      prefetchTimeout.current = null;
    }
  }, []);
  
  // Clean preview text - remove "OKEY ENGLISH [Branch]" prefix (truncation handled by CSS)
  let previewText = teacher.lastMessageText || '';
  previewText = previewText.replace(/^OKEY ENGLISH\s+[^\s]+\s*/i, '');

  const content = (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`w-full p-2.5 text-left rounded-lg transition-all duration-200 relative mb-1 border select-none touch-manipulation ${
        isSelected
          ? 'bg-accent/50 shadow-sm border-accent'
          : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar className="h-9 w-9 ring-2 ring-border/30">
              <AvatarFallback className="text-sm font-medium bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))]">
                {initials}
              </AvatarFallback>
            </Avatar>
            {teacher.lastMessengerType && (
              <MessengerIcon messenger={teacher.lastMessengerType} />
            )}
          </div>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-0">
              <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} truncate`}>
                {teacher.fullName}
              </p>
              {flags && <span className="text-[10px] flex-shrink-0">{flags}</span>}
              {isPinned && <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
            </div>
            
            {isInWorkByOthers && pinnedByUserName && (
              <div className="flex items-center gap-1 flex-wrap mb-0.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50">
                  У {pinnedByUserName}
                </Badge>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
              {previewText || 'Нет сообщений'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground font-medium">{messageTime}</span>
          {isUnread && (
            <span className="bg-gradient-to-r from-primary to-primary/90 text-white text-xs px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
              <span className="font-semibold">{teacher.unreadMessages}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );

  // If context menu handlers are provided, wrap with context menu
  if (onMarkUnread && onPinDialog) {
    return (
      <TeacherChatContextMenu
        onMarkUnread={onMarkUnread}
        onMarkRead={onMarkRead}
        onPinDialog={onPinDialog}
        onBlock={onBlock}
        onDelete={onDelete}
        isPinned={isPinned}
        isUnread={isUnread}
      >
        {content}
      </TeacherChatContextMenu>
    );
  }

  return content;
};

export default TeacherListItem;
