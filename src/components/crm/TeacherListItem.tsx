import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Pin } from 'lucide-react';
import { TeacherChatItem } from '@/hooks/useTeacherChats';
import { TeacherChatContextMenu } from './TeacherChatContextMenu';

// Get category badge styling
const getCategoryBadge = (category: string): { label: string; className: string } => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('дет') || categoryLower.includes('child') || categoryLower.includes('kid')) {
    return { label: 'Дети', className: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300' };
  }
  if (categoryLower.includes('взросл') || categoryLower.includes('adult')) {
    return { label: 'Взрослые', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300' };
  }
  if (categoryLower.includes('подрост') || categoryLower.includes('teen')) {
    return { label: 'Подростки', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300' };
  }
  if (categoryLower.includes('индив') || categoryLower.includes('individual')) {
    return { label: 'Индив', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300' };
  }
  if (categoryLower.includes('групп') || categoryLower.includes('group')) {
    return { label: 'Группы', className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300' };
  }
  return { label: category, className: 'bg-muted text-muted-foreground border-border' };
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
  onDelete
}) => {
  const initials = `${teacher.lastName?.[0] || ''}${teacher.firstName?.[0] || ''}`.toUpperCase() || '•';
  const flags = getSubjectFlags(teacher.subjects);
  const messageTime = formatMessageTime(teacher.lastMessageTime);
  const isPinned = pinCount > 0;
  const isUnread = teacher.unreadMessages > 0;
  
  // Get unique category badges (max 2 for space)
  const categoryBadges = (teacher.categories || [])
    .slice(0, 2)
    .map(cat => getCategoryBadge(cat));
  
  // Truncate preview text and remove "OKEY ENGLISH [Branch]" prefix
  let previewText = teacher.lastMessageText || '';
  previewText = previewText.replace(/^OKEY ENGLISH\s+[^\s]+\s*/i, '');
  previewText = previewText.slice(0, 50) + (previewText.length > 50 ? '...' : '');

  const content = (
    <button
      onClick={onClick}
      className={`w-full p-2 text-left rounded-lg transition-all duration-200 relative mb-0.5 border select-none touch-manipulation ${
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
          <Avatar className={`h-9 w-9 flex-shrink-0 ring-2 transition-all ${
            isPinned 
              ? 'ring-orange-200 shadow-sm' 
              : 'ring-border/30'
          }`}>
            <AvatarFallback className={`text-sm font-medium ${
              isPinned 
                ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' 
                : 'bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))]'
            }`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-0">
              <span className={`text-sm truncate max-w-[60%] ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                {teacher.fullName}
              </span>
              {flags && <span className="text-xs flex-shrink-0">{flags}</span>}
              {isPinned && <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
            </div>
            
            <div className="flex items-center gap-1 flex-wrap mb-0.5">
              {isPinned && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50">
                  В работе
                </Badge>
              )}
              {categoryBadges.map((badge, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className={`text-[9px] h-3.5 px-1 py-0 ${badge.className}`}
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
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
