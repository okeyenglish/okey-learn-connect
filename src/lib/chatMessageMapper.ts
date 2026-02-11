/**
 * Mapper utility for converting self-hosted DB rows (actual column names)
 * into the ChatMessage interface used by the frontend.
 *
 * DB columns -> Frontend interface:
 *   content          -> message_text
 *   messenger        -> messenger_type
 *   direction        -> is_outgoing (boolean) + message_type fallback
 *   media_url        -> file_url
 *   media_type       -> file_type
 *   external_id      -> external_message_id
 *   status           -> message_status
 */

import type { ChatMessage } from '@/hooks/useChatMessages';

/** Correct SELECT string for the self-hosted chat_messages table */
export const CHAT_MESSAGE_SELECT = `
  id, client_id, content, message_type, system_type, is_read,
  created_at, media_url, file_name, media_type, external_id,
  messenger, call_duration, status, metadata, sender_name, direction
`;

/** Raw row shape returned by the DB with actual column names */
export interface DbChatMessageRow {
  id: string;
  client_id: string;
  content: string | null;
  message_type: string | null;
  system_type?: string | null;
  is_read: boolean | null;
  created_at: string;
  media_url?: string | null;
  file_name?: string | null;
  media_type?: string | null;
  external_id?: string | null;
  messenger?: string | null;
  call_duration?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  sender_name?: string | null;
  direction?: string | null;
}

/**
 * Maps a raw DB row to the ChatMessage interface expected by the UI.
 */
export function mapDbRowToChatMessage(row: DbChatMessageRow): ChatMessage {
  const isOutgoing = row.direction === 'outgoing';

  // Derive message_type: keep DB value if valid, otherwise infer from direction
  let messageType: ChatMessage['message_type'] = 'client';
  if (row.message_type === 'client' || row.message_type === 'manager' || row.message_type === 'system') {
    messageType = row.message_type;
  } else if (isOutgoing) {
    messageType = 'manager';
  }

  return {
    id: row.id,
    client_id: row.client_id,
    message_text: row.content ?? '',
    message_type: messageType,
    system_type: row.system_type ?? undefined,
    is_read: row.is_read ?? false,
    is_outgoing: isOutgoing,
    created_at: row.created_at,
    file_url: row.media_url ?? undefined,
    file_name: row.file_name ?? undefined,
    file_type: row.media_type ?? undefined,
    external_message_id: row.external_id ?? undefined,
    messenger_type: (row.messenger as ChatMessage['messenger_type']) ?? undefined,
    call_duration: row.call_duration ?? undefined,
    message_status: (row.status as ChatMessage['message_status']) ?? undefined,
    metadata: row.metadata ?? undefined,
  };
}

/**
 * Maps an array of DB rows to ChatMessage[].
 */
export function mapDbRowsToChatMessages(rows: DbChatMessageRow[]): ChatMessage[] {
  return rows.map(mapDbRowToChatMessage);
}
