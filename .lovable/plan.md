
# Fix: Smart routing — integration_id not saved/queried correctly

## Problem

When a client writes through a Telegram Bot (Wappi), the reply goes out through the wrong integration (the one marked `is_primary`) instead of routing back through the same bot.

## Root Cause (actual)

The webhooks (telegram-webhook, max-webhook) save `integration_id` **only inside `metadata` JSONB**, but never set the **top-level `integration_id` column** which exists on self-hosted.

The send functions (telegram-send, telegram-crm-send, max-send) query `integration_id` as a top-level column — which is always NULL because the webhooks never populate it. Smart routing always fails and falls back to `is_primary`.

For wpp-send (Lovable Cloud), the `integration_id` column doesn't exist at all — it must be queried from `metadata` JSONB.

## Fix Applied

### 1. Webhooks — save `integration_id` as top-level column

**telegram-webhook**: Added `integration_id: integrationId || null` to both `fullPayload` and `minimalPayload` in `resilientInsertMessage`.

**max-webhook**: Added `integration_id: integrationId || null` to all 3 insert payloads (teacher, client, outgoing).

### 2. wpp-send — query metadata instead of non-existent column

Changed from `.select('integration_id')` / `.not('integration_id', 'is', null)` to `.select('metadata')` / `.not('metadata->integration_id', 'is', null)` and reading `lastMessage?.metadata?.integration_id`.

### 3. telegram-send, telegram-crm-send, max-send — no changes needed

These use self-hosted DB which has `integration_id` as a top-level column. Now that the webhooks populate it, the existing queries will work correctly.

## Status: ✅ Complete
