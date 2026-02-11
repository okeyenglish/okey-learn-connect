

# Fix: Messenger IDs not copied to teacher during conversion

## Problem

When converting client to teacher, the code fetches client data with a SELECT that includes `whatsapp_id` and `whatsapp_chat_id` columns (line 104). These columns do not exist on the self-hosted database (`api.academyos.ru`), causing the entire query to fail silently. As a result, `clientData` is empty and NO messenger IDs (including MAX) are ever copied to the teacher record.

Additionally, the teacher INSERT (line 279) and UPDATE (line 178-179) reference `whatsapp_id` which may not exist on the `teachers` table either.

## Root Cause

```
Line 104: .select('phone, email, telegram_user_id, telegram_chat_id, whatsapp_id, whatsapp_chat_id, max_user_id, max_chat_id')
```

`whatsapp_id` and `whatsapp_chat_id` do not exist on `clients` table in self-hosted -- the entire SELECT fails and returns null.

## Solution

### File: `src/components/crm/ConvertToTeacherModal.tsx`

**1. Fix the SELECT query (line 104)**

Remove `whatsapp_id` and `whatsapp_chat_id` from the select:

```typescript
.select('phone, email, telegram_user_id, telegram_chat_id, max_user_id, max_chat_id')
```

**2. Clean up clientData state type (lines 58-65)**

Remove `whatsapp_id` and `whatsapp_chat_id` from the interface and state initialization.

**3. Clean up state variables (lines 54, 126)**

Remove `whatsappId` state variable and its setter since it references non-existent columns.

**4. Fix handleConvertWithTeacher update (lines 178-179)**

Remove the `whatsapp_id` line from the teacher update payload.

**5. Fix handleConvertNew insert (line 279)**

Remove `whatsapp_id` from the teacher insert payload.

### Manual fix for Larisa Kruzhilina

After deploying the code fix, run these SQL commands on the self-hosted database:

```sql
-- Copy MAX IDs from client to teacher
UPDATE teachers
SET max_user_id = '76931942',
    max_chat_id = '76931942',
    updated_at = now()
WHERE id = '21d2a563-00de-4085-b01b-79734612deaa';

-- Clear MAX IDs from the client and deactivate
UPDATE clients
SET max_user_id = NULL,
    max_chat_id = NULL,
    is_active = false,
    updated_at = now()
WHERE id = 'a1511c1a-fcae-4cf2-b07f-d73f1ad96767';
```

| File | Change |
|------|--------|
| `src/components/crm/ConvertToTeacherModal.tsx` | Remove all `whatsapp_id` / `whatsapp_chat_id` references from SELECT, state, INSERT, and UPDATE operations (6 locations) |

