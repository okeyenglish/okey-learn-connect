
# Fix: Wrong column names in remaining files + auto-retry status updates

## Problem

After reverting most files, 3 files still use wrong column names for the `chat_messages` table, and the auto-retry logic in `ChatArea.tsx` uses wrong column name for status updates. These cause silent query failures.

## Confirmed correct column names (from self-hosted DB CSV)

| Correct DB column | Wrong value in code |
|---|---|
| `message_status` | `status` |
| `messenger_type` | `messenger` |
| `message_text` | `content` |
| `is_outgoing` (boolean) | `direction` (string) |
| `file_url` | `media_url` |
| `file_type` | `media_type` |

## Changes

### 1. `src/components/crm/ChatArea.tsx` (lines 414-477)

The auto-retry function uses `.update({ status: ... })` three times. The correct column is `message_status`.

- Line 416: `.update({ status: 'queued' })` -> `.update({ message_status: 'queued' })`
- Line 458: `.update({ status: 'sent' })` -> `.update({ message_status: 'sent' })`
- Line 476: `.update({ status: 'failed' })` -> `.update({ message_status: 'failed' })`

### 2. `src/hooks/useChatThreadsInfinite.ts` (lines 169, 172)

Field access uses `.messenger` but the SELECT on line 90 fetches `messenger_type`. Fix:
- Line 169: `lastMessage?.messenger` -> `lastMessage?.messenger_type`
- Line 172: `unreadMessages[0]?.messenger` -> `unreadMessages[0]?.messenger_type`

### 3. `src/hooks/useChatOSMessages.ts` (entire file)

This file uses ALL wrong column names. Fix:
- Line 35: `.eq('messenger', 'chatos')` -> `.eq('messenger_type', 'chatos')`
- Line 48: `msg.direction === 'outgoing'` -> `msg.is_outgoing === true`
- Line 49: `msg.content` -> `msg.message_text`
- Line 51: `msg.media_url` -> `msg.file_url`
- Line 53: `msg.media_type` -> `msg.file_type`
- Line 104: `content:` -> `message_text:`
- Line 105: `messenger: 'chatos'` -> `messenger_type: 'chatos'`
- Line 107: `direction: 'outgoing'` -> `is_outgoing: true`
- Line 110: `media_url:` -> `file_url:`
- Line 112: `media_type:` -> `file_type:`
- Line 114: `status: 'sent'` -> `message_status: 'sent'`
- Line 150: `.eq('messenger', 'chatos')` -> `.eq('messenger_type', 'chatos')`
- Line 151: `.eq('direction', 'incoming')` -> `.eq('is_outgoing', false)`

### 4. `src/hooks/useChatMessagesOptimized.ts` (line 152)

The realtime status handler types the payload as `{ status?: string }` but should be `{ message_status?: string }`. Fix the type and field access at lines 152-157.

## Expected result

After these fixes, all `chat_messages` queries will use the correct self-hosted column names, ensuring messages display properly and status updates work.
