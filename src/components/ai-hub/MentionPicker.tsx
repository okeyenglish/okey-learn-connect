import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MentionUser {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

interface MentionPickerProps {
  query: string;
  users: MentionUser[];
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
  visible: boolean;
}

export function MentionPicker({ query, users, onSelect, onClose, visible }: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return name.includes(query.toLowerCase());
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [visible, filtered, selectedIndex, onSelect, onClose]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div 
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-[200px] overflow-y-auto"
    >
      {filtered.map((user, idx) => {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        const initial = (user.first_name?.[0] || '?').toUpperCase();
        return (
          <button
            key={user.id}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(user);
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initial}</AvatarFallback>
            </Avatar>
            <span className="truncate">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Format: @[DisplayName](userId)
 * Renders as clickable mention links
 */
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

export function renderMentionText(
  text: string,
  onMentionClick?: (userId: string) => void,
  highlightFn?: (text: string) => React.ReactNode
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    // Text before mention
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      parts.push(highlightFn ? highlightFn(beforeText) : beforeText);
    }

    const displayName = match[1];
    const userId = match[2];
    parts.push(
      <button
        key={`mention-${match.index}`}
        className="text-blue-500 dark:text-blue-400 font-medium hover:underline cursor-pointer bg-transparent border-none p-0 inline"
        onClick={(e) => {
          e.stopPropagation();
          onMentionClick?.(userId);
        }}
      >
        @{displayName}
      </button>
    );

    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    parts.push(highlightFn ? highlightFn(remaining) : remaining);
  }

  if (parts.length === 0) {
    return highlightFn ? highlightFn(text) : text;
  }

  return <>{parts}</>;
}

/**
 * Hook to manage @mention state in a text input
 */
export function useMentionInput(message: string, setMessage: (msg: string) => void) {
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  const handleInputChange = (value: string, cursorPos: number) => {
    // Find @ before cursor
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only activate if @ is at start or after a space, and no space in query
      const charBefore = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
      if ((charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) && !afterAt.includes(' ')) {
        setMentionActive(true);
        setMentionQuery(afterAt);
        setMentionStartPos(lastAtIndex);
        return;
      }
    }

    setMentionActive(false);
    setMentionQuery('');
    setMentionStartPos(-1);
  };

  const insertMention = (user: { id: string; first_name?: string; last_name?: string }) => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const mention = `@[${name}](${user.id})`;
    const before = message.slice(0, mentionStartPos);
    const afterMentionQuery = message.slice(mentionStartPos + 1 + mentionQuery.length);
    const newMessage = `${before}${mention} ${afterMentionQuery}`;
    setMessage(newMessage);
    setMentionActive(false);
    setMentionQuery('');
    setMentionStartPos(-1);
  };

  const closeMention = () => {
    setMentionActive(false);
    setMentionQuery('');
    setMentionStartPos(-1);
  };

  return {
    mentionQuery,
    mentionActive,
    handleInputChange,
    insertMention,
    closeMention,
  };
}
