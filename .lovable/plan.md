
# Fix: Real-time update after client merge

## Problem

After merging (linking) two clients, the deactivated client still appears in the chat list. Users can navigate between both the original and merged client entries. The list only updates after a full page reload.

## Root Cause

In `handleLinkChatSuccess` (CRM.tsx, line 1671), two critical query invalidations are missing:
- `deleted-client-ids` -- this is the list of deactivated clients that gets filtered out from the chat list
- `chat-threads-unread-priority` -- unread threads for the old client remain cached

Without invalidating `deleted-client-ids`, the deactivated client's ID never enters the filter set, so it keeps appearing.

## Solution

Add the missing `invalidateQueries` calls to `handleLinkChatSuccess` in `src/pages/CRM.tsx`:

```text
queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
queryClient.invalidateQueries({ queryKey: ['deleted-client-ids'] });
queryClient.invalidateQueries({ queryKey: ['deleted-chats'] });
```

### File: `src/pages/CRM.tsx`

Update `handleLinkChatSuccess` (around line 1671) to add the three missing invalidations alongside the existing ones. No other files need changes.
