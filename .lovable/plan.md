

# Revert: Restore original column names in all files

## Problem

The self-hosted database CSV confirms the **original** column names were correct all along:

| Column in DB (CORRECT) | What I wrongly changed to |
|---|---|
| `message_text` | `content` |
| `is_outgoing` (boolean) | `direction` (string) |
| `messenger_type` | `messenger` |
| `file_url` | `media_url` |
| `file_type` | `media_type` |
| `external_message_id` | `external_id` |
| `message_status` | `status` |
| `integration_id` | `metadata->integration_id` |
| `teacher_id` | `metadata->teacher_id` |

## Solution

Revert all 14+ files back to using the original correct column names. Delete or rewrite the mapper utility since it maps to wrong names.

## Files to revert

### 1. `src/lib/chatMessageMapper.ts`
Rewrite entirely: `CHAT_MESSAGE_SELECT` must use `message_text, is_outgoing, messenger_type, file_url, file_type, external_message_id, message_status, integration_id, teacher_id` etc. The mapper should be a passthrough or removed, since DB columns already match the `ChatMessage` interface.

### 2. `src/hooks/useChatMessagesOptimized.ts`
- Restore SELECT to use `message_text, messenger_type, is_outgoing, file_url, file_type, external_message_id, message_status`
- Remove mapper call, data already matches interface

### 3. `src/hooks/useChatMessages.ts`
- Restore SELECT columns: `message_text`, `messenger_type`, `is_outgoing`
- Restore INSERT payload: `message_text`, `is_outgoing`, `messenger_type`
- Restore `.eq('is_outgoing', false)` filters
- Restore `.select('messenger_type')` calls

### 4. `src/hooks/useInfiniteChatMessages.ts`
- Restore SELECT to original columns
- Remove mapper import/usage

### 5. `src/hooks/useInfiniteChatMessagesTyped.ts`
- Restore MESSAGE_SELECT to original columns
- Remove mapper import/usage

### 6. `src/hooks/useChatThreadsInfinite.ts`
- Restore: `message_text, is_read, messenger_type, message_type, is_outgoing`
- Restore field access: `msg.message_text`

### 7. `src/hooks/useClientChatData.ts`
- Restore: `message_text, file_url, file_type, external_message_id, messenger_type, message_status`
- Restore `.select('messenger_type')` calls

### 8. `src/hooks/useSystemChatMessages.ts`
- Restore: `message_text` in SELECT
- Restore: `.eq('is_outgoing', false)`

### 9. `src/hooks/usePhoneSearchThreads.ts`
- Restore: `message_text, messenger_type, is_outgoing`

### 10. `src/hooks/usePinnedChatThreads.ts`
- Restore: `message_text, messenger_type`

### 11. `src/hooks/useTeacherChatMessagesV2.ts`
- Restore MESSAGE_FIELDS to original columns: `message_text, is_outgoing, messenger_type, file_url, file_type, external_message_id, message_status, teacher_id, integration_id`
- Remove mapper usage, remove normalization code

### 12. `src/hooks/useTeacherChats.ts`
- Restore: `message_text, messenger_type, is_outgoing`

### 13. `src/hooks/useOrganizationRealtimeMessages.ts`
- Restore: `message_text`

### 14. `src/hooks/useTeacherConversations.ts`
- Restore SELECT columns to original names

### 15. `src/hooks/useCommunityChats.ts`
- Restore: `message_text`, `file_type`

### 16. `src/components/crm/ChatArea.tsx`
- Restore: `.eq('is_outgoing', false)` filters
- Restore: `.update({ message_status: ... })` calls

### 17. `src/components/crm/TeacherChatArea.tsx`
- Restore: `.eq('is_outgoing', false)` filters

### 18. `src/components/crm/TeacherListItem.tsx`
- Restore SELECT to original columns

### 19. `src/components/crm/WppTestPanel.tsx`
- Restore: `external_message_id`

### 20. `src/utils/sendActivityWarningMessage.ts`
- Restore: `.eq('is_outgoing', false)`

## Approach

Since the DB columns match the ChatMessage interface directly, the mapper utility is unnecessary. I will either delete it or make it a simple passthrough. All hooks and components will be reverted to use the original column names that match the actual database schema.

## Technical note

The Lovable Cloud database schema shown in the system context has different column names (`content`, `direction`, `messenger`, etc.) -- but the app connects to `api.academyos.ru` (self-hosted), which uses `message_text`, `is_outgoing`, `messenger_type`, etc. The self-hosted schema is what matters.

