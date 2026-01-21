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
      className={`w-full p-2 text-left rounded-lg transition-all duration-200 relative mb-0.5 border select-none ${
        isSelected
          ? 'bg-accent/50 shadow-sm border-accent'
          : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Avatar - fixed size */}
          <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-border/30">
            <AvatarImage src={undefined} alt={teacher.fullName} />
            <AvatarFallback className="bg-[hsl(var(--avatar-blue))] text-[hsl(var(--text-primary))] font-medium text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {/* Content - flexible, truncates */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Name row */}
            <div className="flex items-center gap-1.5 mb-0">
              <p className="text-sm font-medium truncate">
                {teacher.fullName}
              </p>
              {flags && <span className="text-xs flex-shrink-0">{flags}</span>}
              {pinCount > 0 && <Pin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
            </div>
            {/* Preview */}
            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
              {previewText || 'Нет сообщений'}
            </p>
          </div>
        </div>
        
        {/* Right: Time + Unread - fixed width */}
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          {messageTime && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {messageTime}
            </span>
          )}
          {teacher.unreadMessages > 0 && (
            <span className="bg-gradient-to-r from-primary to-primary/90 text-white text-xs px-2 py-0.5 rounded-lg shadow-sm font-semibold">
              {teacher.unreadMessages}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default TeacherListItem;
