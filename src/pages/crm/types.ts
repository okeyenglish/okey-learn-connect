/**
 * CRM Chat Types
 * Defines the shape of chat items displayed in the CRM chat list
 */

// Types for system chats (corporate, teachers, communities)
export type SystemChatType = 'corporate' | 'teachers' | 'communities';

// Types for client chats
export type ClientChatType = 'client';

// All possible chat types
export type CRMChatType = SystemChatType | ClientChatType;

// Base chat interface shared by all chat types
export interface BaseCRMChat {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: number;
  timestamp: number;
  avatar_url: string | null;
}

// System chat (corporate, teachers, communities)
export interface SystemCRMChat extends BaseCRMChat {
  type: SystemChatType;
}

// Client chat with additional fields
export interface ClientCRMChat extends BaseCRMChat {
  type: ClientChatType;
  branch?: string | null;
  last_unread_messenger?: string | null;
  foundInMessages?: boolean;
}

// Union type for all CRM chats
export type CRMChat = SystemCRMChat | ClientCRMChat;

// Type guard to check if a chat is a client chat
export const isClientChat = (chat: CRMChat): chat is ClientCRMChat => {
  return chat.type === 'client';
};

// Type guard to check if a chat is a system chat
export const isSystemChat = (chat: CRMChat): chat is SystemCRMChat => {
  return chat.type === 'corporate' || chat.type === 'teachers' || chat.type === 'communities';
};

// Corporate/Teacher chat from hooks (e.g., useCorporateChats, useTeacherChats)
export interface CorporateChat {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  type?: string;
}

// Pinned modal types
export type PinnedModalType = 'task' | 'invoice' | 'client' | 'student' | 'family' | 
  'Расписание' | 'Группы' | 'Индив' | 'Дашборды' | 'Скрипты' | 'Аналитика' | 
  'Документы' | 'Настройки' | 'AI Hub' | 'База' | 'Финансы' | 'Лиды' | 
  'Студенты' | 'WhatsApp' | 'Коммуникации';

// Payload type for realtime events
export interface RealtimePayload {
  new?: {
    client_id?: string;
    message_type?: string;
    [key: string]: unknown;
  };
  old?: {
    client_id?: string;
    [key: string]: unknown;
  };
}

// Group student row from query
export interface GroupStudentRow {
  student_id: string;
}
