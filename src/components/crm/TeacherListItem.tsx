import React, { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Pin } from 'lucide-react';
import { TeacherChatItem } from '@/hooks/useTeacherChats';
import { TeacherChatContextMenu } from './TeacherChatContextMenu';
import { supabase } from '@/integrations/supabase/typedClient';

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
  onPrefetch
}) => {
  const queryClient = useQueryClient();
  const prefetchTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetched = useRef(false);

  const initials = `${teacher.lastName?.[0] || ''}${teacher.firstName?.[0] || ''}`.toUpperCase() || '•';
  const flags = getSubjectFlags(teacher.subjects);
  const messageTime = formatMessageTime(teacher.lastMessageTime);
  const isPinned = pinCount > 0;
  const isUnread = teacher.unreadMessages > 0;
  
  // Prefetch chat messages on hover with delay
  const handleMouseEnter = useCallback(() => {
    // Don't prefetch if already selected or no clientId
    if (isSelected || hasPrefetched.current) return;
    
    // Delay prefetch to avoid unnecessary requests on quick mouse movements
    prefetchTimeout.current = setTimeout(() => {
      if (teacher.clientId) {
        // Prefetch messages for this teacher
        queryClient.prefetchQuery({
          queryKey: ['teacher-chat-messages', teacher.clientId],
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_teacher_chat_messages', { 
              p_client_id: teacher.clientId,
              p_limit: 50 // Prefetch fewer messages for speed
            });
            if (error) {
              // Try direct select as fallback
              const { data: directData } = await supabase
                .from('chat_messages')
                .select('id, client_id, message_text, content, message_type, is_read, is_outgoing, created_at, file_url, media_url, messenger, status')
                .eq('client_id', teacher.clientId!)
                .order('created_at', { ascending: false })
                .limit(50);
              return directData || [];
            }
            return data || [];
          },
          staleTime: 30000,
        });
        hasPrefetched.current = true;
      }
      
      // Notify parent for additional prefetch if needed
      onPrefetch?.(teacher.id, teacher.clientId);
    }, 150); // 150ms delay before prefetch
  }, [teacher.id, teacher.clientId, isSelected, queryClient, onPrefetch]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeout.current) {
      clearTimeout(prefetchTimeout.current);
      prefetchTimeout.current = null;
    }
  }, []);
  
  // Truncate preview text and remove "OKEY ENGLISH [Branch]" prefix
  let previewText = teacher.lastMessageText || '';
  previewText = previewText.replace(/^OKEY ENGLISH\s+[^\s]+\s*/i, '');
  previewText = previewText.slice(0, 50) + (previewText.length > 50 ? '...' : '');

  const content = (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`w-full p-1.5 md:p-2 text-left rounded-lg transition-all duration-200 relative border select-none touch-manipulation ${
        isPinned
          ? `border-orange-200 bg-gradient-to-r ${
              isSelected 
                ? 'from-orange-50 to-orange-100/50 shadow-sm dark:from-orange-950 dark:to-orange-900/50' 
                : 'from-white to-orange-50/30 hover:to-orange-50 dark:from-background dark:to-orange-950/30 hover:shadow-sm'
            }`
          : isSelected
            ? 'bg-accent/50 shadow-sm border-accent'
            : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Avatar className={`h-8 w-8 md:h-9 md:w-9 flex-shrink-0 ring-2 transition-all ${
            isPinned 
              ? 'ring-orange-200 shadow-sm' 
              : 'ring-border/30'
          }`}>
            <AvatarFallback className={`text-xs md:text-sm font-medium ${
              isPinned 
                ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' 
                : 'bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))]'
            }`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1 mb-0">
              <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                {teacher.fullName}
              </span>
              {flags && <span className="text-[10px] flex-shrink-0">{flags}</span>}
              {isPinned && <Pin className="h-3 w-3 text-orange-500 flex-shrink-0" />}
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-1">
              {previewText || 'Нет сообщений'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground font-medium">{messageTime}</span>
          {isUnread && (
            <span className={`${
              isPinned ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-primary to-primary/90'
            } text-white text-xs px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1`}>
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
