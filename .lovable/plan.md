

# Fix: Branch filter not matching database values for server-side queries

## Problem

Two issues with branch filtering:

1. **Грайвороновская shows 0 chats**: The filter sends `branch = "Грайвороновская"` to the server, but clients in the database have `branch = "Стахановская"` (the old name). The alias mapping (`стахановская` -> `грайвороновская`) only works client-side via `toBranchKey()`, not in SQL queries.

2. **Мытищи not loading all chats on scroll**: Same root cause -- if some clients have `branch = "O'KEY ENGLISH Мытищи"` in the database, the exact match `branch = "Мытищи"` misses them.

## Root Cause

`effectiveBranches` in CRM.tsx (line 415) passes display names like `["Грайвороновская"]` to the server query. Both the RPC (`branch = ANY(p_branches)`) and the direct fallback (`branch.in.(...)`) do **exact string matching** against the `clients.branch` column, which stores raw imported values that may differ from the display names in `organization_branches`.

## Solution

Add a reverse-alias expansion function to `branchUtils.ts` that, given a normalized key, returns all raw branch name variants that should match in the database. Then use it in `effectiveBranches` to pass all variants to the server.

### File: `src/lib/branchUtils.ts`

Add a new function `expandBranchVariants(displayName)` that returns an array of all possible raw database values for a given branch:
- The display name itself (e.g., "Грайвороновская")
- Any reverse aliases (e.g., "Стахановская" since it maps to "грайвороновская")
- Common prefixed variants (e.g., "O'KEY ENGLISH Грайвороновская", "O'KEY ENGLISH Стахановская")

```typescript
// Reverse alias map: for a given normalized key, 
// what raw values might exist in the database?
const REVERSE_ALIASES: Record<string, string[]> = {
  'грайвороновская': ['Грайвороновская', 'Стахановская'],
  'люберцы': ['Люберцы', 'Красная горка'],
  'online school': ['Online school', 'Онлайн', 'Онлайн школа'],
  'новокосино': ['Новокосино'],
};

export function expandBranchVariants(displayName: string): string[] {
  const key = toBranchKey(displayName);
  if (!key) return [displayName];
  
  const baseVariants = REVERSE_ALIASES[key] || [displayName];
  const allVariants = new Set<string>(baseVariants);
  
  // Add prefixed variants with brand tokens
  for (const variant of baseVariants) {
    allVariants.add(`O'KEY ENGLISH ${variant}`);
  }
  allVariants.add(displayName);
  
  return Array.from(allVariants);
}
```

### File: `src/pages/CRM.tsx`

Update `effectiveBranches` (line 415) to expand branch names into all database variants before passing to the server:

```typescript
const effectiveBranches = useMemo(() => {
  const managerBranches = hasManagerBranchRestrictions ? allowedBranchNames : null;
  
  if (selectedBranch && selectedBranch !== 'all') {
    if (managerBranches) {
      const filtered = managerBranches.filter(b => toBranchKey(b) === selectedBranch);
      const base = filtered.length > 0 ? filtered : managerBranches;
      return base.flatMap(b => expandBranchVariants(b));
    }
    const matchedBranch = branches.find((b: any) => toBranchKey(b.name) === selectedBranch);
    if (matchedBranch) {
      return expandBranchVariants(matchedBranch.name);
    }
    return undefined;
  }
  
  return managerBranches ? managerBranches.flatMap(b => expandBranchVariants(b)) : undefined;
}, [selectedBranch, hasManagerBranchRestrictions, allowedBranchNames, branches]);
```

This ensures the SQL query includes all raw name variants that normalize to the same branch key, so "Грайвороновская" filter also matches clients with `branch = "Стахановская"` or `branch = "O'KEY ENGLISH Стахановская"` in the database.

### Build Error Fix

The build error (if any) from the previous change will also be addressed -- the `useOrganization()` hook placement and dependencies are already correct.

