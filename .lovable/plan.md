
# Fix: Show client phone number in edit modal

## Problem

The "Редактировать контакт" modal shows "Нет телефонов" even though the client's phone number is known (visible in the right panel as +79261979556).

## Root Cause

The self-hosted database doesn't have a `client_phone_numbers` table. The RPC `get_family_data_optimized` returns an empty `phone_numbers` array for every member. However, the client's phone IS available in `activeMember.phone` (from the `clients.phone` column).

The edit modal receives `activeMember.phoneNumbers` (always empty) and never falls back to `activeMember.phone`.

## Solution

**File: `src/components/crm/FamilyCard.tsx` (lines 591-604)**

When `activeMember.phoneNumbers` is empty but `activeMember.phone` exists, create a synthetic phone number entry from the client's main phone:

```typescript
phoneNumbers: (activeMember.phoneNumbers.length > 0 
  ? activeMember.phoneNumbers 
  : activeMember.phone 
    ? [{ phone: activeMember.phone, type: 'mobile', isPrimary: true, 
         isWhatsappEnabled: true, isTelegramEnabled: false, id: 'main' }]
    : []
).map(p => {
  const normalized = normalizePhone(p.phone);
  const displayPhone = normalized 
    ? (formatPhoneForDisplay(normalized) || `+${normalized}`) 
    : p.phone;
  return {
    id: p.id,
    phone: displayPhone,
    phoneType: (p.type as 'mobile' | 'work' | 'home' | 'other') || 'mobile',
    isPrimary: p.isPrimary,
    isWhatsappEnabled: p.isWhatsappEnabled,
    isTelegramEnabled: p.isTelegramEnabled,
    isMaxEnabled: p.isMaxEnabled ?? true,
  };
})
```

This ensures:
- If the `client_phone_numbers` table has data (cloud schema), it works as before
- If it's empty (self-hosted), the client's main phone from `clients.phone` is shown
- The phone is properly formatted for display
