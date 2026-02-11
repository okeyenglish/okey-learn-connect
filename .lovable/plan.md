
# Fix: Smart routing reads integration_id from metadata JSONB

## Problem

When a client writes through a Telegram Bot (Wappi), the reply goes out through the wrong integration (the one marked `is_primary`) instead of routing back through the same bot.

## Root Cause

The incoming webhook (`telegram-webhook`) correctly saves `integration_id` inside the `metadata` JSONB field:
```
metadata: { integration_id: "abc-123" }
```

But all send functions (`telegram-send`, `telegram-crm-send`, `max-send`, `wpp-send`) query `integration_id` as a **top-level column** which does NOT exist in the `chat_messages` table:
```js
.select('integration_id')              // column doesn't exist
.not('integration_id', 'is', null)     // always fails
```

Since the query always returns nothing, smart routing falls back to `is_primary`, which is the "numbered" personal account instead of the bot.

## Solution

Update the smart routing queries in all 4 send functions to read `integration_id` from the `metadata` JSONB field instead of a non-existent top-level column.

### Change pattern (applied to every smart routing query):

**Before:**
```js
.select('integration_id')
.not('integration_id', 'is', null)
// then: lastMessage?.integration_id
```

**After:**
```js
.select('metadata')
.not('metadata->integration_id', 'is', null)
// then: lastMessage?.metadata?.integration_id
```

### Files to update:

| File | Smart routing queries to fix |
|------|------------------------------|
| `supabase/functions/telegram-send/index.ts` | 3 queries (lines 69-83, 88-102, 118-131) |
| `supabase/functions/telegram-crm-send/index.ts` | 1 query (lines 124-128) |
| `supabase/functions/max-send/index.ts` | 1 query (lines 65-69) |
| `supabase/functions/wpp-send/index.ts` | 1 query (lines 84-88) |

### Technical detail

PostgREST supports JSONB arrow operators:
- `metadata->integration_id` accesses the JSON key
- `.not('metadata->integration_id', 'is', null)` filters rows where the key exists and is not null

No database migration needed -- this is purely an edge function change.
