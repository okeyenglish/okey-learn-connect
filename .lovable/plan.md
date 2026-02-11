
# Fix: New messages go to client instead of teacher after conversion

## Problem

After converting a client to a teacher (merging chat history), new incoming messages from MAX still create/restore the old client record instead of going to the teacher.

## Root Cause

Two issues work together to cause this:

**1. Deactivated client keeps messenger identifiers**

When converting, the code tries to delete the client (line 200-204). If deletion fails (foreign keys), it deactivates the client (`is_active: false`, line 207). But the client record still has `max_chat_id` and `max_user_id` set.

**2. Webhook restores deactivated clients**

In `max-webhook`, `findOrCreateClient` (line 476-486) searches by `max_chat_id` **without filtering by `is_active`**, finds the deactivated client, and restores it (`is_active: true`). The message then goes to the client instead of the teacher.

Even if the teacher lookup (PRIORITY 1) runs first, it may fail due to type mismatches between the `max_user_id` stored on the client (numeric) vs what was copied to the teacher (string).

## Solution

### 1. Clear messenger identifiers from client before deletion/deactivation

**File: `src/components/crm/ConvertToTeacherModal.tsx`** (in `handleConvertWithTeacher`, before the delete/deactivate block at line ~200)

Add a step to clear all messenger identifiers from the client record so the webhook can never match the old client again:

```typescript
// Clear messenger IDs from client BEFORE deletion to prevent webhook conflicts
await supabase
  .from('clients')
  .update({
    max_chat_id: null,
    max_user_id: null,
    telegram_user_id: null,
    telegram_chat_id: null,
    whatsapp_id: null,
    whatsapp_chat_id: null,
  })
  .eq('id', clientId);

// Also clear from client_phone_numbers
await supabase
  .from('client_phone_numbers')
  .update({
    max_chat_id: null,
    max_user_id: null,
    telegram_user_id: null,
    whatsapp_id: null,
  })
  .eq('client_id', clientId);
```

### 2. Same fix in "create new teacher" flow

**File: `src/components/crm/ConvertToTeacherModal.tsx`** -- the `handleCreateNewTeacher` function (around line ~250-300) has a similar delete/deactivate block that also needs the same clearing logic.

### Summary

| File | Change |
|------|--------|
| `src/components/crm/ConvertToTeacherModal.tsx` | Clear all messenger IDs from `clients` and `client_phone_numbers` before attempting to delete/deactivate the client, in both `handleConvertWithTeacher` and `handleCreateNewTeacher` flows |

This ensures that even if the client record survives (deactivated), webhooks will never match it by messenger identifiers. All identifiers are already copied to the teacher record before this step runs.
