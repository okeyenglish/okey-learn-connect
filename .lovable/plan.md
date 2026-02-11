

# Fix: Remove non-existent columns from ConvertToTeacherModal cleanup

## Problem

The code added in the previous fix references `whatsapp_id` and `whatsapp_chat_id` columns which don't exist on the self-hosted database (`api.academyos.ru`). This causes the clear operation to fail silently, meaning messenger IDs are NOT actually cleared before client deactivation.

## Solution

**File: `src/components/crm/ConvertToTeacherModal.tsx`** -- two locations (lines 200-211 and 298-309)

Remove `whatsapp_id` and `whatsapp_chat_id` from the update payload in both `handleConvertWithTeacher` and `handleCreateNewTeacher`:

**Before:**
```typescript
.update({
  max_chat_id: null,
  max_user_id: null,
  telegram_user_id: null,
  telegram_chat_id: null,
  whatsapp_id: null,       // does NOT exist on self-hosted
  whatsapp_chat_id: null,  // does NOT exist on self-hosted
})
```

**After:**
```typescript
.update({
  max_chat_id: null,
  max_user_id: null,
  telegram_user_id: null,
  telegram_chat_id: null,
})
```

Also remove `whatsapp_id` from the `client_phone_numbers` clear (lines 214-222 and 311-319):

**Before:**
```typescript
.update({
  max_chat_id: null,
  max_user_id: null,
  telegram_user_id: null,
  whatsapp_id: null,  // may not exist
})
```

**After:**
```typescript
.update({
  max_chat_id: null,
  max_user_id: null,
  telegram_user_id: null,
  telegram_chat_id: null,
})
```

| File | Change |
|------|--------|
| `src/components/crm/ConvertToTeacherModal.tsx` | Remove `whatsapp_id` and `whatsapp_chat_id` from both clear blocks (4 edits total) |

