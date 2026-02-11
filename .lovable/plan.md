
# Fix: Edge functions using wrong column names for chat_messages

## Problem

ALL edge functions that save messages to the `chat_messages` table use column names from the Lovable Cloud schema, but the app connects to a self-hosted database (`api.academyos.ru`) with different column names. This means:

- Sent messages are NOT saved to the database (INSERT uses non-existent columns)
- Incoming webhook messages are also NOT saved
- This is why no new messages appear in dialogs

## Column mapping (wrong -> correct)

| Edge function uses (WRONG) | Self-hosted DB has (CORRECT) |
|---|---|
| `content` | `message_text` |
| `messenger` | `messenger_type` |
| `direction: 'outgoing'` | `is_outgoing: true` |
| `direction: 'incoming'` | `is_outgoing: false` |
| `status` | `message_status` |
| `external_id` | `external_message_id` |
| `media_url` | `file_url` |
| `media_type` | `file_type` |
| `is_incoming` | `is_outgoing` (inverted boolean) |

## Files to fix (12 edge functions)

### 1. `supabase/functions/telegram-send/index.ts` (lines 711-723)
Fix message record: `content` -> `message_text`, `messenger` -> `messenger_type`, `status` -> `message_status`, `direction` -> `is_outgoing`, `external_id` -> `external_message_id`, `media_url` -> `file_url`, `media_type` -> `file_type`

### 2. `supabase/functions/telegram-crm-send/index.ts`
Fix message record with same column mapping

### 3. `supabase/functions/telegram-webhook/index.ts`
Fix ALL insert records (incoming and outgoing echo messages) with correct columns

### 4. `supabase/functions/telegram-crm-webhook/index.ts`
Fix incoming message insert with correct columns

### 5. `supabase/functions/whatsapp-send/index.ts`
Fix outgoing message save with correct columns

### 6. `supabase/functions/whatsapp-webhook/index.ts`
Fix ALL insert records (incoming, outgoing echo, system messages). Also `is_incoming` -> `is_outgoing` (inverted)

### 7. `supabase/functions/wappi-whatsapp-send/index.ts`
Fix outgoing message save with correct columns

### 8. `supabase/functions/wappi-whatsapp-webhook/index.ts`
Fix ALL insert records with correct columns

### 9. `supabase/functions/wpp-webhook/index.ts`
Fix ALL insert records with correct columns

### 10. `supabase/functions/max-send/index.ts`
Fix outgoing message save with correct columns

### 11. `supabase/functions/max-webhook/index.ts`
Fix ALL insert records (incoming and outgoing echo) with correct columns

### 12. `supabase/functions/parent-lesson-reminders/index.ts`
Fix ChatOS message insert with correct columns

## Approach

For each edge function, apply the column mapping above to every `chat_messages` INSERT operation. The `is_incoming` flag used in `whatsapp-webhook` needs special handling: it should be converted to `is_outgoing` with inverted boolean logic.

Also verify that SELECT queries in these functions (e.g., for deduplication checks) use the correct column names.

## Impact

After this fix:
- Outgoing messages via Telegram, WhatsApp, MAX will be saved and appear in the chat
- Incoming webhook messages will be saved and appear in the chat
- All messenger integrations will work correctly with the self-hosted database
