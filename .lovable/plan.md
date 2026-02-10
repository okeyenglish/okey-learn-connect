
# Fix: Telegram Unlink -- Tab Lock and Stale ID

## Problem Analysis

Two bugs occur after unlinking Telegram from a client:

### Bug 1: Only Telegram tab opens
The `unlink-messenger` edge function clears `telegram_user_id` from the `clients` table but does **NOT** clear `telegram_chat_id`. The chat thread inference logic checks `telegram_chat_id` first:

```
if (row.telegram_chat_id) inferredMessenger = 'telegram';
```

Since `telegram_chat_id` remains on the original client, the system infers the messenger as Telegram and auto-selects that tab. When the user clicks the chat, it always opens on Telegram with "No Telegram messages" (because messages were moved to the new client).

### Bug 2: Wrong Telegram ID displayed
The ID "1050922645" visible in the right panel is the `telegram_user_id` that was either:
- Not fully cleared from the `clients` table (race condition)
- Still present in `client_phone_numbers` rows, which the `ContactInfoBlock` reads and displays

## Solution

### File 1: `supabase/functions/unlink-messenger/index.ts`

Add `telegram_chat_id` to the cleared fields for Telegram unlink:

```
// Current (broken):
if (messengerType === "telegram") {
  savedFields.telegram_user_id = client.telegram_user_id;
  clearFields.telegram_user_id = null;
}

// Fixed:
if (messengerType === "telegram") {
  savedFields.telegram_user_id = client.telegram_user_id;
  savedFields.telegram_chat_id = client.telegram_chat_id;
  clearFields.telegram_user_id = null;
  clearFields.telegram_chat_id = null;
}
```

Also copy `telegram_chat_id` to the new client:
```
if (messengerType === "telegram") {
  newClientData.telegram_user_id = savedFields.telegram_user_id ?? client.telegram_user_id;
  newClientData.telegram_chat_id = savedFields.telegram_chat_id ?? client.telegram_chat_id;
}
```

### File 2: `src/hooks/useUnlinkMessenger.ts`

After successful unlink, also invalidate the `client-unread-by-messenger` query for the affected client, so the ChatArea re-evaluates which tab to show:

```
queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', variables.clientId] });
```

## Technical Details

- The edge function rollback logic already handles restoring saved fields on failure -- adding `telegram_chat_id` to `savedFields` ensures it gets restored if the insert fails
- The `client_phone_numbers` clear logic (step 2b) already clears `telegram_chat_id` and `telegram_user_id` for telegram type -- this part is correct
- The new client creation needs `telegram_chat_id` so that Telegram messages can be properly routed to it
- Invalidating `client-unread-by-messenger` forces the ChatArea to recalculate the initial tab based on remaining messages (WhatsApp), not stale `telegram_chat_id` data

## Expected Result

After unlinking Telegram:
- Original client: `telegram_user_id = null`, `telegram_chat_id = null` -- no Telegram ID displayed, chat opens on WhatsApp tab
- New client: has both `telegram_user_id` and `telegram_chat_id` + all Telegram messages
- All messenger tabs work normally on the original client
