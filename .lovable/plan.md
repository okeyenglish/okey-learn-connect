

# Fix: Show contact data and client ID in the right panel

## Problem

1. The right panel shows "Нет контактных данных" even when the client has a MAX ID (visible in the header as MAX ID: 12605062)
2. The client's system ID (e.g., #C99903) is not always visible -- needed for merging chats

## Root Cause

The direct client fallback query in `FamilyCardWrapper.tsx` (line 188) only selects `id, name, phone, email, avatar_url, branch` from the `clients` table. It does NOT select:
- `client_number` (system ID like C99903)
- `telegram_chat_id`, `telegram_user_id`
- `whatsapp_chat_id`
- `max_chat_id`, `max_user_id`

So the member object built on lines 242-254 has no messenger IDs and no client number. The `ContactInfoBlock` receives empty props and shows "Нет контактных данных".

Additionally, in `ContactInfoBlock.tsx`, the MAX-only virtual entry (line 174) only triggers when `result.length === 0`, but the condition doesn't account for cases where MAX data exists alongside other empty arrays.

## Solution

### 1. Add missing columns to the direct fallback query

**File: `src/components/crm/FamilyCardWrapper.tsx`**

**Line 188**: Expand the select to include all messenger and ID fields:
```
.select('id, name, phone, email, avatar_url, branch, client_number, telegram_chat_id, telegram_user_id, whatsapp_chat_id, max_chat_id, max_user_id')
```

**Lines 242-254**: Add the missing fields to the member object:
```typescript
{
  id: clientData.id,
  clientNumber: clientData.client_number || undefined,
  name: clientData.name || '',
  phone: clientData.phone || '',
  email: clientData.email || undefined,
  branch: clientData.branch || undefined,
  relationship: 'main' as const,
  isPrimaryContact: true,
  unreadMessages: 0,
  isOnline: false,
  avatar_url: clientData.avatar_url || undefined,
  telegramChatId: clientData.telegram_chat_id || null,
  telegramUserId: clientData.telegram_user_id || null,
  whatsappChatId: clientData.whatsapp_chat_id || null,
  maxChatId: clientData.max_chat_id || clientData.max_user_id?.toString() || null,
  phoneNumbers: [],
}
```

### 2. Fix MAX-only contact display in ContactInfoBlock

**File: `src/components/crm/ContactInfoBlock.tsx`**

**Line 174**: Remove the `result.length === 0` guard so MAX entry is always added when MAX data exists and no MAX entry is already in the result:
```typescript
if (clientMaxChatId && !result.some(r => r.maxChatId)) {
  result.push({
    id: 'virtual-max-contact',
    phone: '',
    isPrimary: result.length === 0,
    ...
  });
}
```

Also add a display line for MAX ID (similar to Telegram ID display on line 435-444) so users can see the MAX ID directly:
```typescript
{maxActive && !hasPhone && !tgActive && clientMaxChatId ? (
  <button onClick={() => handleMessengerClick(phoneNumber.id, 'max', true)}>
    <MaxIcon active={true} />
    <span>MAX ID: {clientMaxChatId}</span>
  </button>
) : ...}
```

### 3. Ensure client system ID is always visible

The client number (#C99903) is already displayed in `FamilyCard.tsx` lines 572-576 when `activeMember.clientNumber` is set. After fix #1, this will work correctly because `clientNumber` will be populated from the direct fallback query.

## Summary

| File | Change |
|------|--------|
| `src/components/crm/FamilyCardWrapper.tsx` | Add `client_number`, messenger ID columns to fallback select query and member object |
| `src/components/crm/ContactInfoBlock.tsx` | Fix MAX-only virtual entry logic; add MAX ID display line |

