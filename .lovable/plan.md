

# Fix: Server-side branch filtering for UI dropdown

## Problem

When selecting a branch in the filter dropdown (e.g. "Мытищи"), the system fetches 50 threads from ALL branches, then filters client-side. This results in only 2-3 visible chats instead of the expected 50 for that branch.

## Root Cause

`useChatThreadsInfinite` is called with `allowedBranches` only for manager restrictions (line 421 in CRM.tsx). The UI dropdown filter (`selectedBranch`) is applied purely client-side (line 1285), after the 50-thread page is already fetched.

## Solution

Merge the UI `selectedBranch` into the `allowedBranches` parameter passed to `useChatThreadsInfinite`, so filtering happens server-side (in the RPC or direct query).

### File: `src/pages/CRM.tsx`

**Change the call to `useChatThreadsInfinite` (line ~421):**

Compute effective branches by combining manager restrictions with the UI filter:

```typescript
// Combine manager branch restrictions with UI branch filter
const effectiveBranches = useMemo(() => {
  // Start with manager restrictions (if any)
  const managerBranches = hasManagerBranchRestrictions ? allowedBranchNames : null;
  
  // If UI filter is set to a specific branch
  if (selectedBranch && selectedBranch !== 'all') {
    // If manager has restrictions, intersect (only if selected branch is in allowed list)
    if (managerBranches) {
      const filtered = managerBranches.filter(b => toBranchKey(b) === selectedBranch);
      return filtered.length > 0 ? filtered : managerBranches; // fallback to all allowed
    }
    // No manager restrictions - use UI selection directly
    // Need to find the original branch name from the normalized key
    const matchedBranch = branches.find((b: any) => toBranchKey(b.name) === selectedBranch);
    return matchedBranch ? [matchedBranch.name] : undefined;
  }
  
  // No UI filter - use manager restrictions only
  return managerBranches || undefined;
}, [selectedBranch, hasManagerBranchRestrictions, allowedBranchNames, branches]);
```

Then pass `effectiveBranches` to the hook:
```typescript
useChatThreadsInfinite(effectiveBranches);
```

This ensures the RPC/direct query fetches 50 threads specifically for the selected branch, not 50 from all branches then filtered down.

**Note:** The client-side branch filter (line 1285) can remain as a safety net -- it won't cause harm since server already filtered, but ensures consistency.

