

# Optimize Self-Hosted Supabase: Reduce WAL/Realtime Load

## Summary

Based on the `pg_stat_statements` data, the #1 CPU consumer is `realtime.list_changes` (1656 calls, 8.7ms each). This is WAL decoding that fires for **every write** to **every table** in the `supabase_realtime` publication. Currently, too many high-write tables are published, generating massive WAL overhead even when no frontend client is listening.

## Problem Breakdown

| Source | CPU Impact | Controllable? |
|--------|-----------|---------------|
| `realtime.list_changes` (WAL decoding) | ~14s / 15min | YES - remove tables from publication |
| PostgREST `set_config` (1620 calls) | Low per-call but adds up | YES - reduce API call frequency |
| Analytics `log_events` INSERT (1050 rows) | Internal Supabase overhead | NO |
| 45 idle connections | Holds resources | PARTIAL - reduce channels |

## Fix 1: Remove Unnecessary Tables from Realtime Publication (SQL for self-hosted)

Tables currently in `supabase_realtime` that should be **removed** (already moved to polling/broadcast per previous optimizations):

| Table | Why Remove |
|-------|-----------|
| `typing_status` | Already uses Broadcast API, not postgres_changes |
| `chat_presence` | Already uses polling |
| `global_chat_read_status` | Already uses polling |
| `pinned_modals` | Already uses polling |
| `staff_activity_log` | Already uses polling |
| `clients` | Already uses polling (useRealtimeClients, 120s interval) |
| `student_attendance` | Low-priority, no active realtime listener |
| `student_lesson_sessions` | Low-priority, no active realtime listener |
| `whatsapp_sessions` | Rare writes, no frontend listener |
| `pending_gpt_responses` | Edge function internal, no frontend listener |

Tables to **keep** (actively used by RealtimeHub or useOrganizationRealtimeMessages):

| Table | Used By |
|-------|---------|
| `chat_messages` | useOrganizationRealtimeMessages (core CRM feature) |
| `tasks` | RealtimeHub |
| `lesson_sessions` | RealtimeHub |
| `chat_states` | RealtimeHub |
| `internal_chat_messages` | Staff chat realtime |
| `notifications` | Push notification triggers |

**SQL migration for self-hosted** (new file: `docs/selfhosted-migrations/20260210_reduce_realtime_publication.sql`):

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.typing_status;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.chat_presence;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.global_chat_read_status;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.pinned_modals;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.staff_activity_log;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.clients;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.student_attendance;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.student_lesson_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.whatsapp_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.pending_gpt_responses;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.payments;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.individual_lesson_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.teacher_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.assistant_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.call_logs;
```

This reduces published tables from ~20 to ~5, cutting WAL decoding calls proportionally.

## Fix 2: Narrow RealtimeHub Events

**File:** `src/hooks/useRealtimeHub.ts`

Currently subscribes to `event: '*'` (INSERT + UPDATE + DELETE) for `tasks`, `lesson_sessions`, `chat_states`. Most of these only need INSERT and UPDATE -- DELETE is rare and can be handled by periodic refresh.

Change all three subscriptions from `event: '*'` to `event: 'INSERT'` and add separate `event: 'UPDATE'` listeners. This avoids DELETE events which generate unnecessary WAL decoding.

Actually, the bigger win here is that `event: '*'` creates 3 separate WAL filters per table internally. Keeping `'*'` but reducing the number of published tables (Fix 1) is more impactful.

**Decision:** Keep `event: '*'` in RealtimeHub (simpler code, small marginal cost). Focus effort on Fix 1.

## Fix 3: Reduce chat_messages REPLICA IDENTITY overhead

**File:** `docs/selfhosted-migrations/20260210_reduce_realtime_publication.sql` (same file)

`chat_messages` currently uses `REPLICA IDENTITY DEFAULT` (per memory). This is correct -- it only sends the primary key on DELETE, which is lightweight. No change needed here.

However, check if any tables still have `REPLICA IDENTITY FULL`:

```sql
-- Add to migration file as a check/fix
ALTER TABLE public.chat_messages REPLICA IDENTITY DEFAULT;
ALTER TABLE public.chat_states REPLICA IDENTITY DEFAULT;
ALTER TABLE public.tasks REPLICA IDENTITY DEFAULT;
```

`REPLICA IDENTITY FULL` sends the entire row in WAL on every UPDATE, which is extremely expensive for high-write tables.

## Fix 4: Fix Build Error

The build output was truncated but likely succeeded (it shows "computing gzip size" which is the final step). If there is an actual TypeScript error, it would be from the `useAvailableStudents.ts` casting `Student` type after column reduction. The select now returns a subset of columns but is cast as `Student[]` which has more fields. This is safe at runtime (extra fields are just undefined) but may cause a TS error depending on strictness.

**Verify and fix if needed:** Ensure `useAvailableStudents.ts` casts properly after the column-limited select.

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Tables in realtime publication | ~20 | 5 |
| WAL decoding calls (per 15min) | 1656 | ~400 (estimated 75% reduction) |
| WAL size growth rate | 124 GB total | Significantly slower |
| Idle connections from realtime | ~10 | ~5 |

## Files to Create/Modify

| File | Change |
|------|--------|
| `docs/selfhosted-migrations/20260210_reduce_realtime_publication.sql` | SQL to remove 15 tables from publication |
| `src/hooks/useRealtimeHub.ts` | No change needed (already optimized) |

