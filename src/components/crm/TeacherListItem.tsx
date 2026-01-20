import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pin } from 'lucide-react';
import { TeacherChatItem } from '@/hooks/useTeacherChats';

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
  compact?: boolean; // desktop = true, mobile = false
}

export const TeacherListItem: React.FC<TeacherListItemProps> = ({
  teacher,
  isSelected,
  pinCount,
  onClick,
  compact = false
}) => {
  const initials = `${teacher.lastName?.[0] || ''}${teacher.firstName?.[0] || ''}`.toUpperCase() || '•';
  const flags = getSubjectFlags(teacher.subjects);
  const messageTime = formatMessageTime(teacher.lastMessageTime);
  
  // Truncate preview text and remove "OKEY ENGLISH [Branch]" prefix
  let previewText = teacher.lastMessageText || '';
  // Remove "OKEY ENGLISH Окская" or similar patterns
  previewText = previewText.replace(/^OKEY ENGLISH\s+[^\s]+\s*/i, '');
  previewText = previewText.slice(0, 50) + (previewText.length > 50 ? '...' : '');
  
  const containerPadding = compact ? 'p-2' : 'p-3';
  const avatarSize = compact ? 'h-10 w-10' : 'h-12 w-12';
  const avatarTextSize = compact ? 'text-xs' : 'text-sm';
  
  return (
    <div
      onClick={onClick}
      className={`${containerPadding} rounded-lg cursor-pointer transition-colors mb-1 ${
        isSelected
          ? 'bg-muted border border-border'
          : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className={`${avatarSize} shrink-0`}>
          <AvatarImage src={undefined} alt={teacher.fullName} />
          <AvatarFallback className={`bg-primary/10 text-primary font-medium ${avatarTextSize}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Top row: Name + flags + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="font-medium text-sm text-foreground truncate">
                {teacher.fullName}
              </span>
              {flags && (
                <span className="text-sm shrink-0">{flags}</span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {messageTime && (
                <span className="text-[10px] text-muted-foreground">
                  {messageTime}
                </span>
              )}
              {pinCount > 0 && (
                <Pin className="h-3 w-3 text-muted-foreground" />
              )}
              {teacher.unreadMessages > 0 && (
                <Badge 
                  variant="destructive" 
                  className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs rounded-full"
                >
                  {teacher.unreadMessages}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Preview row */}
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {previewText || 'Нет сообщений'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherListItem;
