/**
 * Mapper utility for self-hosted DB rows to ChatMessage interface.
 *
 * Self-hosted DB columns MATCH the ChatMessage interface directly:
 *   message_text, is_outgoing, messenger_type, file_url, file_type,
 *   external_message_id, message_status, etc.
 */

import type { ChatMessage } from '@/hooks/useChatMessages';

/** Correct SELECT string for the self-hosted chat_messages table */
export const CHAT_MESSAGE_SELECT = `
  id, client_id, message_text, message_type, system_type, is_read,
  created_at, file_url, file_name, file_type, external_message_id,
  messenger_type, call_duration, message_status, metadata, sender_name, is_outgoing
`;

/** Raw row shape returned by the DB (matches ChatMessage interface) */
export interface DbChatMessageRow {
  id: string;
  client_id: string;
  message_text: string | null;
  message_type: string | null;
  system_type?: string | null;
  is_read: boolean | null;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  external_message_id?: string | null;
  messenger_type?: string | null;
  call_duration?: string | null;
  message_status?: string | null;
  metadata?: Record<string, unknown> | null;
  sender_name?: string | null;
  is_outgoing?: boolean | null;
}

/**
 * Maps a raw DB row to the ChatMessage interface.
 * Self-hosted columns match the interface directly, so this is mostly a passthrough.
 */
export function mapDbRowToChatMessage(row: DbChatMessageRow): ChatMessage {
  return {
    id: row.id,
    client_id: row.client_id,
    message_text: row.message_text ?? '',
    message_type: (row.message_type as ChatMessage['message_type']) ?? 'client',
    system_type: row.system_type ?? undefined,
    is_read: row.is_read ?? false,
    is_outgoing: row.is_outgoing ?? false,
    created_at: row.created_at,
    file_url: row.file_url ?? undefined,
    file_name: row.file_name ?? undefined,
    file_type: row.file_type ?? undefined,
    external_message_id: row.external_message_id ?? undefined,
    messenger_type: (row.messenger_type as ChatMessage['messenger_type']) ?? undefined,
    call_duration: row.call_duration ?? undefined,
    message_status: (row.message_status as ChatMessage['message_status']) ?? undefined,
    metadata: row.metadata ?? undefined,
  };
}

/**
 * Maps an array of DB rows to ChatMessage[].
 */
export function mapDbRowsToChatMessages(rows: DbChatMessageRow[]): ChatMessage[] {
  return rows.map(mapDbRowToChatMessage);
}
