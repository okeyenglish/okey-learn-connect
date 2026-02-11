
# Fix: Column name mismatch in ALL webhook functions + outgoing phone messages

## Root Cause

The `chat_messages` table has a completely different schema than what all 5 webhook Edge Functions expect. Every `INSERT` and `SELECT` on `chat_messages` fails because the column names don't match. This is why:
- New client messages are not being saved
- Outgoing phone messages are not being recorded
- Delivery statuses are not being updated

## Column Mapping (Old -> Correct)

| Used in code (WRONG) | Actual DB column | Notes |
|---|---|---|
| `message_text` | `content` | text content |
| `messenger_type` | `messenger` | 'whatsapp', 'telegram', 'max' |
| `is_outgoing: true/false` | `direction: 'outgoing'/'incoming'` | string instead of boolean |
| `external_message_id` | `external_id` | external provider message ID |
| `file_url` | `media_url` | media file URL |
| `file_type` | `media_type` | MIME type |
| `teacher_id` | N/A | store in `metadata` jsonb |
| `integration_id` | N/A | store in `metadata` jsonb |
| `message_status` | `status` | delivery status |

Columns that stay the same: `client_id`, `organization_id`, `message_type`, `is_read`, `file_name`, `status`, `sender_id`, `sender_name`, `created_at`, `metadata`.

## Files to Update (5 webhook functions)

### 1. `supabase/functions/wappi-whatsapp-webhook/index.ts`
- Fix all `chat_messages` INSERT statements (incoming, outgoing, teacher messages)
- Fix all `chat_messages` SELECT/UPDATE queries (duplicate check, delivery status)
- Map `teacher_id` to `metadata: { teacher_id: ... }`
- This also addresses the user's request: outgoing phone messages (`outgoing_message_phone`) are already handled in the switch case, they just fail on INSERT due to wrong columns

### 2. `supabase/functions/whatsapp-webhook/index.ts` (GreenAPI)
- Fix `saveMessageToDB` function column mapping
- Fix delivery status update queries
- Fix duplicate check queries

### 3. `supabase/functions/telegram-webhook/index.ts` (Wappi Telegram)
- Fix `insertChatMessage` function
- Fix all inline INSERT statements
- Fix delivery status updates

### 4. `supabase/functions/telegram-crm-webhook/index.ts` (Telethon)
- Fix message INSERT
- Fix duplicate check

### 5. `supabase/functions/max-webhook/index.ts` (GreenAPI MAX)
- Fix all INSERT statements (incoming, outgoing)
- Fix delivery status updates
- Map `integration_id` to metadata

## Example: Correct INSERT format

```text
Before (BROKEN):
{
  message_text: messageText,
  message_type: 'client',
  messenger_type: 'whatsapp',
  is_outgoing: false,
  external_message_id: message.id,
  file_url: fileUrl,
  file_type: fileType,
}

After (CORRECT):
{
  content: messageText,
  message_type: 'client',
  messenger: 'whatsapp',
  direction: 'incoming',
  external_id: message.id,
  media_url: fileUrl,
  media_type: fileType,
}
```

## Example: Correct query format

```text
Before: .eq('external_message_id', messageId)
After:  .eq('external_id', messageId)

Before: .update({ message_status: mappedStatus })
After:  .update({ status: mappedStatus })
```

## Outgoing Phone Messages (Wappi)

The `handleOutgoingMessage` function in `wappi-whatsapp-webhook` already processes both `outgoing_message_phone` and `outgoing_message_api` webhook types. The only reason they weren't being saved is the column mismatch. After fixing column names, both types will work:
- `outgoing_message_phone` (sent from physical phone) -- `from_where: "phone"`
- `outgoing_message_api` (sent via CRM/API) -- `from_where: "api"`, has `task_id`

## Technical Notes

- `teacher_id` and `integration_id` columns don't exist in `chat_messages`. Teacher ID will be stored in the `metadata` jsonb field as `{ teacher_id: "..." }`. Integration ID will also go in metadata as `{ integration_id: "..." }`.
- The `webhook_logs` table uses `messenger_type` which is correct for that table (separate from `chat_messages`).
- `wpp-webhook` also has the same wrong columns but will be fixed alongside the others.
