import React from 'react';
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
  compact?: boolean;
}

export const TeacherListItem: React.FC<TeacherListItemProps> = ({
  teacher,
  isSelected,
  pinCount,
  onClick
}) => {
  const initials = `${teacher.lastName?.[0] || ''}${teacher.firstName?.[0] || ''}`.toUpperCase() || '•';
  const flags = getSubjectFlags(teacher.subjects);
  const messageTime = formatMessageTime(teacher.lastMessageTime);
  
  // Truncate preview text and remove "OKEY ENGLISH [Branch]" prefix
  let previewText = teacher.lastMessageText || '';
  previewText = previewText.replace(/^OKEY ENGLISH\s+[^\s]+\s*/i, '');
  previewText = previewText.slice(0, 50) + (previewText.length > 50 ? '...' : '');
  
  return (
    <button
      onClick={onClick}
      className={`w-full min-w-0 overflow-hidden text-left p-2 rounded-lg transition-all duration-200 mb-0.5 border ${
        isSelected
          ? 'bg-accent/50 shadow-sm border-accent'
          : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
      }`}
    >
      {/* Main row: Avatar + Content + Meta */}
      <div className="flex items-start gap-2 min-w-0">
        {/* Avatar - fixed size */}
        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border/30">
          <AvatarImage src={undefined} alt={teacher.fullName} />
          <AvatarFallback className="bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))] font-medium text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Middle: Name + Preview - flexible, truncates */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Name row */}
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <span className="font-medium text-sm truncate flex-1 min-w-0">
              {teacher.fullName}
            </span>
            {flags && <span className="text-xs shrink-0">{flags}</span>}
            {pinCount > 0 && <Pin className="h-3 w-3 text-orange-500 shrink-0" />}
          </div>
          {/* Preview */}
          <p className="text-xs text-muted-foreground truncate">
            {previewText || 'Нет сообщений'}
          </p>
        </div>
        
        {/* Right: Time + Unread - fixed width */}
        <div className="flex flex-col items-end shrink-0 w-12">
          {messageTime && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {messageTime}
            </span>
          )}
          {teacher.unreadMessages > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-semibold min-w-[18px] text-center mt-0.5">
              {teacher.unreadMessages}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default TeacherListItem;
