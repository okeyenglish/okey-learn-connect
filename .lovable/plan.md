
# Fix: Remaining files still using wrong column names for chat_messages

## Problem
The previous fix only updated 8 files, but there are **at least 12 more files** still querying `chat_messages` with non-existent column names (`message_text`, `is_outgoing`, `messenger_type`, `file_url`, `file_type`, `external_message_id`, `message_status`). This causes PostgREST to return errors, so messages don't display.

## Correct column mapping (reference)

| Wrong (used in code) | Correct (actual DB) |
|---|---|
| `message_text` | `content` |
| `is_outgoing` | `direction` ('incoming'/'outgoing') |
| `messenger_type` | `messenger` (on chat_messages table only!) |
| `file_url` | `media_url` |
| `file_type` | `media_type` |
| `external_message_id` | `external_id` |
| `message_status` | `status` |

**NOTE**: `messenger_type` is correct on `messenger_settings`, `messenger_integrations`, and `webhook_logs` tables. Only `chat_messages` uses `messenger`.

## Files to fix (12 files)

### 1. `src/hooks/useChatThreadsInfinite.ts` (line 90)
SELECT: `message_text, is_read, messenger_type, message_type, is_outgoing`
Change to: `content, is_read, messenger, message_type, direction`
Also fix references to `message_text` at lines 133-134.

### 2. `src/hooks/useClientChatData.ts` (lines 177-181, 199, 501)
SELECT: `message_text, file_url, file_type, external_message_id, messenger_type, message_status`
Change to: `content, media_url, media_type, external_id, messenger, status`
Also fix `.select('messenger_type')` at line 199 and line 501.

### 3. `src/hooks/useSystemChatMessages.ts` (lines 43, 54)
SELECT: `message_text` -> `content`
Filter: `.eq('is_outgoing', false)` -> `.eq('direction', 'incoming')`
Fix reference at line 61.

### 4. `src/hooks/usePhoneSearchThreads.ts` (line 150)
SELECT: `message_text, messenger_type, is_outgoing` -> `content, messenger, direction`

### 5. `src/hooks/usePinnedChatThreads.ts` (line 107)
SELECT: `message_text, messenger_type` -> `content, messenger`

### 6. `src/hooks/useTeacherChatMessagesV2.ts` (lines 30-32)
MESSAGE_FIELDS constant: all wrong column names
Change to use `CHAT_MESSAGE_SELECT` from chatMessageMapper and apply mapper.

### 7. `src/hooks/useTeacherChats.ts` (lines 285, 396)
SELECT: `message_text, messenger_type, is_outgoing` -> `content, messenger, direction`

### 8. `src/hooks/useOrganizationRealtimeMessages.ts` (line 155)
SELECT: `message_text` -> `content`

### 9. `src/components/crm/TeacherListItem.tsx` (lines 194, 219)
SELECT: all old column names -> correct ones, apply mapper.

### 10. `src/components/crm/TeacherChatArea.tsx` (lines 398, 446)
Filter: `.eq('is_outgoing', false)` -> `.eq('direction', 'incoming')`

### 11. `src/components/crm/ChatArea.tsx` (lines 1094, 2302, 2346, 2359)
- Line 1094: `.eq('is_outgoing', false)` -> `.eq('direction', 'incoming')`
- Lines 2302, 2346, 2359: `.update({ message_status: ... })` -> `.update({ status: ... })`

### 12. `src/utils/sendActivityWarningMessage.ts` (lines 69, 77)
Filter: `.eq('is_outgoing', false)` -> `.eq('direction', 'incoming')`

### 13. `src/components/crm/WppTestPanel.tsx` (line 101)
SELECT: `external_message_id` -> `external_id`

### 14. `src/hooks/useMessageContentSearch.ts` (line 14)
Interface: `messenger_type` -> `messenger` (but this uses RPC, so the RPC function itself may return `messenger_type` -- needs checking. If the RPC returns `messenger`, fix the interface.)

## Implementation approach

For each file:
1. Fix SELECT strings to use correct column names
2. Fix `.eq()` / `.update()` calls to use correct column names
3. Fix any field access on returned data (e.g. `msg.message_text` -> `msg.content`)
4. Where complex mapping is needed, use the existing `mapDbRowsToChatMessages` from `chatMessageMapper.ts`
5. Keep `messenger_type` references that target OTHER tables (`messenger_settings`, `webhook_logs`, etc.) -- those are correct

## Order of changes

All files can be updated in parallel since they are independent. The mapper utility already exists from the previous fix.
