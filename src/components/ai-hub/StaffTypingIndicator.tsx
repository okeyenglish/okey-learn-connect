import React from 'react';
import { cn } from '@/lib/utils';

interface TypingUser {
  id: string;
  firstName: string;
  lastName: string;
  isTyping: boolean;
  text?: string;
}

interface StaffTypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export const StaffTypingIndicator: React.FC<StaffTypingIndicatorProps> = ({
  typingUsers,
  className,
}) => {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      const user = typingUsers[0];
      const name = user.firstName || 'Кто-то';
      return (
        <span>
          <span className="font-medium">{name}</span> печатает
          {user.text && (
            <span className="text-muted-foreground">
              : "{user.text.length > 30 ? user.text.substring(0, 30) + '...' : user.text}"
            </span>
          )}
        </span>
      );
    }
    
    if (typingUsers.length === 2) {
      return (
        <span>
          <span className="font-medium">{typingUsers[0].firstName}</span> и{' '}
          <span className="font-medium">{typingUsers[1].firstName}</span> печатают
        </span>
      );
    }
    
    return (
      <span>
        <span className="font-medium">{typingUsers.length} человек</span> печатают
      </span>
    );
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-200',
        className
      )}
    >
      {/* Animated typing dots */}
      <div className="flex items-center gap-0.5">
        <span 
          className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" 
          style={{ animationDelay: '0ms', animationDuration: '600ms' }}
        />
        <span 
          className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" 
          style={{ animationDelay: '150ms', animationDuration: '600ms' }}
        />
        <span 
          className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" 
          style={{ animationDelay: '300ms', animationDuration: '600ms' }}
        />
      </div>
      
      {getTypingText()}
    </div>
  );
};
