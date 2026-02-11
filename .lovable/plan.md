

# Fix: Cannot delete Telegram integration (okeyenglishbot)

## Problem

Clicking "Удалить" on the okeyenglishbot integration returns "Server error" (500).

## Root Cause

In `supabase/functions/messenger-integrations/index.ts`, the DELETE handler (line 314-323) uses `.single()` when looking for the next primary integration after deletion. If the deleted integration was primary and there are no remaining integrations of the same type, `.single()` throws a `PGRST116` error ("no rows returned"). This unhandled error bubbles up to the catch block and returns a 500 response -- even though the actual deletion already succeeded.

## Fix

**File: `supabase/functions/messenger-integrations/index.ts`**

**Line 323**: Change `.single()` to `.maybeSingle()` so that when no next integration exists, it returns `null` instead of throwing an error:

```typescript
// Before (line 323):
.single();

// After:
.maybeSingle();
```

This is a one-line fix. The rest of the logic already handles `null` correctly (line 325: `if (nextIntegration)`).

## Technical Details

- `.single()` -- throws error if 0 or 2+ rows returned
- `.maybeSingle()` -- returns `null` if 0 rows, throws only if 2+ rows
- The delete itself (line 304-307) likely succeeds; it's the "reassign primary" logic that crashes
- This follows the project convention noted in memory: "always use `.maybeSingle()` instead of `.single()` for prevention of function crashes"

