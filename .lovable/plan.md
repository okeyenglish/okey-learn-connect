

# Fix: Save manager name (sender_name) when sending messages

## Problem

When a manager sends a message via WhatsApp/Telegram/MAX, the edge functions save the message to the database WITHOUT the `sender_name` field. So when the message is rendered, it falls back to the hardcoded "Менеджер поддержки".

The `sender_name` is only saved for ChatOS messages (internal chat), not for messenger messages.

## Root Cause

1. `SendMessageParams` in `useWhatsApp.ts` doesn't include `senderName`
2. The edge functions (`wpp-send`, `wappi-whatsapp-send`, `whatsapp-send`, `max-send`, `telegram-send`, `telegram-crm-send`) don't include `sender_name` in the DB insert
3. `ChatArea.tsx` doesn't pass the manager's name when calling send functions

## Solution

### 1. Add `senderName` to hook params

**Files:**
- `src/hooks/useWhatsApp.ts` -- add `senderName?: string` to `SendMessageParams`
- `src/hooks/useMaxGreenApi.ts` -- add `senderName` param
- `src/hooks/useTelegramWappi.ts` -- add `senderName` param

### 2. Pass `senderName` from ChatArea

**File: `src/components/crm/ChatArea.tsx`**

In `sendMessageNow()`, compute `senderName` from `authProfile` (already available at line 373) and include it in all send calls (WhatsApp, MAX, Telegram).

### 3. Update edge functions to save `sender_name`

**Files (6 edge functions):**
- `supabase/functions/wpp-send/index.ts` -- add `sender_name: payload.senderName` to `baseInsert` (line 250)
- `supabase/functions/wappi-whatsapp-send/index.ts` -- add `sender_name: payload.senderName` to insert (line 376)
- `supabase/functions/whatsapp-send/index.ts` -- add `sender_name` to insert
- `supabase/functions/max-send/index.ts` -- add `sender_name` to insert
- `supabase/functions/telegram-send/index.ts` -- add `sender_name` to insert
- `supabase/functions/telegram-crm-send/index.ts` -- add `sender_name` to insert

### 4. Also save `sender_name` for failed messages in ChatArea

In `sendMessageNow()`, the failed-message inserts (lines 1409, 1444, 1478, 1514) also don't include `sender_name`. Add it there too.

## Display logic (unchanged)

In `ChatArea.tsx` line 841:
```
managerName: msg.sender_name || managerName
```

- If `sender_name` exists in DB -- show it (real sender)
- If not -- fall back to `managerName` prop which is "Менеджер поддержки" (line 4322, kept as-is per user's request)

## Summary of changes

| File | Change |
|------|--------|
| `src/hooks/useWhatsApp.ts` | Add `senderName` to params interface |
| `src/hooks/useMaxGreenApi.ts` | Add `senderName` to send function |
| `src/hooks/useTelegramWappi.ts` | Add `senderName` to send function |
| `src/components/crm/ChatArea.tsx` | Compute and pass `senderName` in all send paths + failed inserts |
| `supabase/functions/wpp-send/index.ts` | Save `sender_name` from payload |
| `supabase/functions/wappi-whatsapp-send/index.ts` | Save `sender_name` from payload |
| `supabase/functions/whatsapp-send/index.ts` | Save `sender_name` from payload |
| `supabase/functions/max-send/index.ts` | Save `sender_name` from payload |
| `supabase/functions/telegram-send/index.ts` | Save `sender_name` from payload |
| `supabase/functions/telegram-crm-send/index.ts` | Save `sender_name` from payload |

