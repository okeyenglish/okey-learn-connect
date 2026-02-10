

# Optimization: Top-3 Heavy Database Queries

## Current Situation

The self-hosted database is overwhelmed -- **connection pool timeouts** everywhere (`PGRST003`). Based on the CSV data analysis:

| Query | CPU Time (15 min) | Avg Time | Calls | Impact |
|-------|-------------------|----------|-------|--------|
| `get_chat_threads_fast` | 12.9 min | 1523ms | ~500 | **CRITICAL** |
| `get_unread_chat_threads` | ~7 min | 204ms | ~2000 | HIGH |
| `SELECT * FROM students` | ~2 min | 2900ms | ~40 | HIGH |

Total: **~22 minutes of CPU** consumed in 15 minutes = database overloaded.

## Fix 1: Remove `get_chat_threads_fast` Fallback (Frontend)

**File:** `src/hooks/useChatThreadsInfinite.ts`

The code falls back to `get_chat_threads_fast` (unoptimized, 1.5s/call) when `get_chat_threads_paginated` errors. Since `get_chat_threads_paginated` is already deployed, the fallback just hammers the DB with the slow version on transient errors.

**Change:** Remove the `get_chat_threads_fast` fallback. When `get_chat_threads_paginated` fails with a non-schema error, fall back to `fetchThreadsDirectly` (lightweight direct query) instead of calling another slow RPC.

**File:** `src/hooks/useChatThreadsOptimized.ts`

Same fix -- remove the `get_chat_threads_fast` fallback on line 88.

## Fix 2: Reduce Polling Frequency

**File:** `src/hooks/useRealtimeClients.ts`

Currently polls every **30 seconds**, invalidating both `clients` and `chat-threads`. Each invalidation triggers `get_chat_threads_paginated` + `get_unread_chat_threads` -- two heavy RPCs. Combined with multiple browser tabs, this creates thousands of calls.

**Change:** Increase polling interval from 30s to **120 seconds** (2 minutes). Also invalidate `chat-threads-infinite` and `chat-threads-unread-priority` instead of the generic `chat-threads` key.

**File:** `src/hooks/useChatThreadsInfinite.ts` (unread query)

The unread query has `staleTime: 60000` but no explicit `refetchInterval`. However, the `useRealtimeClients` polling triggers it every 30s. With the polling fix above, this is already addressed.

## Fix 3: Optimize Students Query

**File:** `src/hooks/useStudentsLazy.ts`

Currently fetches `SELECT * FROM students LIMIT 10000` -- returns ALL columns for up to 10,000 rows. Takes 2.9 seconds per call.

**Changes:**
1. Reduce columns to only what's needed: `id, name, first_name, last_name, phone, status, branch, family_group_id, created_at`
2. Add `organization_id` filter (if available from context)
3. Keep `staleTime: 10 * 60 * 1000` (already good)

**Find all other `from('students').select('*')` calls** and replace with specific columns where possible. Key files:
- `src/hooks/useStudentBalances.ts` -- selects `*` for active students
- `src/hooks/useStudentsWithFilters.ts` -- selects `*` with joins

## Fix 4: Debounce Invalidation Cascade

**File:** `src/hooks/useOrganizationRealtimeMessages.ts`

The realtime message handler invalidates `chat-threads`, `chat-threads-infinite`, and `chat-threads-unread-priority` on every single incoming message. When multiple messages arrive rapidly (common in group chats), this triggers dozens of heavy RPCs.

**Change:** Add debounce (500ms) to `invalidateThreadsQueries` so rapid message bursts only trigger one refresh.

## Summary of Changes

| File | Change | Expected Impact |
|------|--------|----------------|
| `src/hooks/useChatThreadsInfinite.ts` | Remove `get_chat_threads_fast` fallback | Eliminates 1.5s/call slow RPC |
| `src/hooks/useChatThreadsOptimized.ts` | Remove `get_chat_threads_fast` fallback | Same |
| `src/hooks/useRealtimeClients.ts` | Polling 30s -> 120s | ~75% fewer RPC calls |
| `src/hooks/useStudentsLazy.ts` | Select specific columns instead of `*` | ~70% faster student queries |
| `src/hooks/useStudentBalances.ts` | Select specific columns | Faster balance queries |
| `src/hooks/useOrganizationRealtimeMessages.ts` | Debounce thread invalidation | Prevents cascade during message bursts |

## Expected Result

- `get_chat_threads_fast` CPU: 12.9 min -> **0 min** (removed)
- `get_unread_chat_threads` calls: 2000 -> **~500** (4x reduction)
- `students SELECT *`: 2.9s -> **~0.5s** (fewer columns)
- Connection pool timeouts: should **stop completely**

## SQL Recommendation for Self-Hosted

No new SQL migrations needed in this change. The existing `get_chat_threads_paginated` and `get_unread_chat_threads` RPCs on the self-hosted server are already optimized (from previous docs). The problem is the frontend calling the **old** slow RPCs too often.

