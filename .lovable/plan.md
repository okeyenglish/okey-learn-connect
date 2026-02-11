
# Fix: Frontend queries use wrong column names — messages not displaying

## Root Cause

All frontend hooks that fetch `chat_messages` are querying columns that **do not exist** in the self-hosted database. PostgREST returns errors or empty results, so no messages display.

| Frontend queries (WRONG) | Actual DB column |
|---|---|
| `message_text` | `content` |
| `messenger_type` | `messenger` |
| `is_outgoing` | `direction` (string) |
| `external_message_id` | `external_id` |
| `file_url` | `media_url` |
| `file_type` | `media_type` |
| `message_status` | `status` |

## Solution

Create a single mapper utility that converts raw DB rows into the `ChatMessage` interface format. Update all SELECT queries to request the correct column names, then apply the mapper.

### Step 1: Create mapper utility (`src/lib/chatMessageMapper.ts`)

A function `mapDbRowToChatMessage(row)` that:
- Maps `content` to `message_text`
- Maps `messenger` to `messenger_type`
- Maps `direction` to `is_outgoing` (boolean) and keeps `message_type` logic
- Maps `media_url` to `file_url`, `media_type` to `file_type`
- Maps `external_id` to `external_message_id`
- Maps `status` to `message_status`

And a constant `CHAT_MESSAGE_SELECT` with the correct column names:
```
id, client_id, content, message_type, system_type, is_read,
created_at, media_url, file_name, media_type, external_id,
messenger, call_duration, status, metadata, sender_name, direction
```

### Step 2: Update hooks (6 files)

**`src/hooks/useChatMessagesOptimized.ts`**
- Replace the SELECT string (line 50-53) with correct column names
- Apply mapper to returned data (line 68)
- Fix `useUnreadCountOptimized` (line 236): `messenger_type` -> `messenger`
- Fix `usePrefetchMessages` (lines 316-317): use correct SELECT and mapper

**`src/hooks/useChatMessages.ts`**
- Fix `useChatThreads` SELECT (lines 159-171, 187): `message_text` -> `content`, `messenger_type` -> `messenger`, `is_outgoing` -> `direction`
- Fix `useClientUnreadByMessenger` (lines 437-444): `messenger_type` -> `messenger`, `is_outgoing` -> `direction`
- Fix `useSendMessage` (lines 589-611): `message_text` -> `content`, `is_outgoing` -> `direction`, `messenger_type` -> `messenger`

**`src/hooks/useInfiniteChatMessages.ts`**
- Replace SELECT string (lines 14-17) with correct columns
- Apply mapper

**`src/hooks/useInfiniteChatMessagesTyped.ts`**
- Replace `MESSAGE_SELECT` constant (lines 29-33) with correct columns
- Apply mapper

**`src/hooks/useTeacherConversations.ts`**
- Fix SELECT (line 75): `message_text` -> `content`, `messenger_type` -> `messenger`, `is_outgoing` -> `direction`

**`src/hooks/useChatMessages.ts` — `useSendMessage`**
- Change INSERT payload: `message_text` -> `content`, `is_outgoing` -> `direction`, `messenger_type` -> `messenger`

### Step 3: Fix ChatArea auto-retry updates

In `src/components/crm/ChatArea.tsx`, the auto-retry logic (lines 414-477) uses:
- `.update({ message_status: 'queued' })` -> `.update({ status: 'queued' })`
- `.update({ message_status: 'sent' })` -> `.update({ status: 'sent' })`
- `.update({ message_status: 'failed' })` -> `.update({ status: 'failed' })`

ChatArea already handles dual-column names at lines 203-224 and 839-850 (fallback chains like `msg.message_text ?? msg.content`), so once data arrives with correct column names, the UI will render correctly.

### Step 4: Fix `useCommunityChats.ts` SELECT

Line 116: `message_text` -> `content`, `file_type` -> `media_type`

### Step 5: Fix `useMessageContentSearch.ts`

The search hook queries `message_text` — needs to query `content` instead.

### Step 6: Fix build error

The build error is caused by these same wrong column names. Fixing the queries will resolve the build.

## Files to change

| File | Changes |
|---|---|
| `src/lib/chatMessageMapper.ts` | **NEW** — mapper + correct SELECT constant |
| `src/hooks/useChatMessagesOptimized.ts` | Fix SELECT, apply mapper, fix unread count query |
| `src/hooks/useChatMessages.ts` | Fix threads SELECT, unread query, useSendMessage INSERT |
| `src/hooks/useInfiniteChatMessages.ts` | Fix SELECT, apply mapper |
| `src/hooks/useInfiniteChatMessagesTyped.ts` | Fix MESSAGE_SELECT, apply mapper |
| `src/hooks/useTeacherConversations.ts` | Fix SELECT columns |
| `src/hooks/useCommunityChats.ts` | Fix SELECT columns |
| `src/hooks/useMessageContentSearch.ts` | Fix search column |
| `src/components/crm/ChatArea.tsx` | Fix `.update()` calls for status |
