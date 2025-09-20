import { useState, useCallback } from 'react';

interface TypingStatus {
  user_id: string;
  client_id: string;
  is_typing: boolean;
  manager_name?: string;
}

export const useTypingStatus = (clientId: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [isCurrentUserTyping, setIsCurrentUserTyping] = useState(false);

  // Simple update typing status (will be enhanced once types are available)
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    setIsCurrentUserTyping(isTyping);
    console.log(`User typing status updated: ${isTyping} for client ${clientId}`);
    
    // TODO: Implement database update once Supabase types are available
  }, [clientId]);

  // Get typing status message
  const getTypingMessage = useCallback(() => {
    const otherTypingUsers = typingUsers.filter(t => t.is_typing);
    
    if (otherTypingUsers.length === 0) return null;
    
    if (otherTypingUsers.length === 1) {
      const typingUser = otherTypingUsers[0];
      const name = typingUser.manager_name || 'Менеджер';
      return `${name} печатает...`;
    }
    
    return `${otherTypingUsers.length} менеджера печатают...`;
  }, [typingUsers]);

  return {
    typingUsers,
    isCurrentUserTyping,
    updateTypingStatus,
    getTypingMessage,
    isOtherUserTyping: typingUsers.some(t => t.is_typing)
  };
};