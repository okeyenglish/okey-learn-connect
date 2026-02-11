

# Fix: Add WhatsApp cleanup to client-to-teacher conversion

## Problem

When converting a client to a teacher, the code clears Telegram and MAX IDs from `client_phone_numbers`, but does NOT clear `whatsapp_chat_id` and `is_whatsapp_enabled`. This can cause webhook conflicts -- incoming WhatsApp messages may still match the old client record.

## How WhatsApp works differently

Unlike Telegram and MAX (which use platform-specific user IDs stored on the `clients` row), WhatsApp is tied to the **phone number**. There is no `whatsapp_id` column on `clients` or `teachers` in the self-hosted schema. WhatsApp routing happens by matching the sender's phone number against `teachers.phone` and `clients.phone`.

So when a client is converted to a teacher with the same phone number, WhatsApp messages will route correctly to the teacher. But the `client_phone_numbers` table still holds `whatsapp_chat_id` which should be cleaned up.

## Solution

### File: `src/components/crm/ConvertToTeacherModal.tsx`

Add `whatsapp_chat_id` and `is_whatsapp_enabled` cleanup to both conversion paths.

**Two locations** (lines ~204-212 for merge, and the equivalent block for new teacher creation):

Before:
```typescript
await supabase
  .from('client_phone_numbers')
  .update({
    max_chat_id: null,
    max_user_id: null,
    telegram_user_id: null,
    telegram_chat_id: null,
  })
  .eq('client_id', clientId);
```

After:
```typescript
await supabase
  .from('client_phone_numbers')
  .update({
    max_chat_id: null,
    max_user_id: null,
    telegram_user_id: null,
    telegram_chat_id: null,
    whatsapp_chat_id: null,
    is_whatsapp_enabled: false,
  })
  .eq('client_id', clientId);
```

| File | Change |
|------|--------|
| `src/components/crm/ConvertToTeacherModal.tsx` | Add `whatsapp_chat_id: null` and `is_whatsapp_enabled: false` to `client_phone_numbers` cleanup in both conversion paths (2 locations) |

