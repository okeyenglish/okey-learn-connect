

# Fix: Unique Constraint Violation When Unlinking Telegram

## Problem
The error `duplicate key value violates unique constraint "clients_org_telegram_user_unique"` occurs because the function tries to create a new client with the same `telegram_user_id` + `organization_id` before clearing it from the original client.

## Current Order (broken)
1. Get original client
2. Build new client data (with `telegram_user_id` copied)
3. **INSERT new client** -- FAILS because original still has the same `telegram_user_id`
4. Clear `telegram_user_id` from original -- too late

## Fixed Order
1. Get original client
2. **Clear `telegram_user_id` from original client FIRST**
3. Build new client data (with `telegram_user_id` copied)
4. INSERT new client -- now succeeds, no duplicate

## File to modify
- `supabase/functions/unlink-messenger/index.ts` -- move the "clear messenger fields" step (currently step 5) to happen **before** the "insert new client" step (currently step 3). Also clear `client_phone_numbers` before the insert.

## Technical details
- Reorder steps so that clearing happens between steps 2 and 3
- Add rollback logic: if the new client insert fails after clearing, restore the original fields
- This applies to all messenger types (telegram, whatsapp, max) to prevent similar issues with future unique constraints
