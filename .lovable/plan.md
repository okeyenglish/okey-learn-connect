

# Fix: Reliable server-side branch filtering

## Problem

Branch filter doesn't work because:

1. `REVERSE_ALIASES` in `branchUtils.ts` only covers 4 branches (Грайвороновская, Люберцы, Online school, Новокосино). Other branches like Мытищи, Окская, Котельники, Солнцево have no expansion entries.
2. `expandBranchVariants` adds `O'KEY ENGLISH ...` prefixed variants, but the PostgREST `.or()` filter syntax `branch.in.(O'KEY ENGLISH Мытищи,...)` breaks on apostrophes and special characters.
3. The approach of manually maintaining a reverse-alias map is fragile and incomplete.

## Solution

Instead of maintaining a manual `REVERSE_ALIASES` map, dynamically build the list of all possible raw DB values by:

1. **Querying actual distinct branch values from the `clients` table** (one-time cached query)
2. **Matching them via `toBranchKey()` normalization** against the selected filter branch
3. Passing only the matched raw DB values to the server filter

This is a single source of truth approach: `organization_branches` defines display names, `toBranchKey()` normalizes everything, and the actual raw values come from the DB itself.

### Changes

**File: `src/hooks/useChatThreadsInfinite.ts`**

Add a helper that fetches distinct `branch` values from `clients` table (cached), then filters them by `toBranchKey` match. Replace the raw `allowedBranches` parameter with normalized matching.

**File: `src/pages/CRM.tsx`**

Simplify `effectiveBranches` logic:
- Remove `expandBranchVariants` usage
- Instead, create a new hook `useClientBranchValues()` that returns all distinct raw branch values from the `clients` table
- When UI filter is set, find all raw DB values whose `toBranchKey()` matches the selected normalized key
- Pass these exact raw values to `useChatThreadsInfinite`

**File: `src/lib/branchUtils.ts`**

Keep `expandBranchVariants` for backward compatibility but it won't be used in the critical path anymore.

### New hook: `src/hooks/useClientBranchValues.ts`

```typescript
// Fetches all distinct branch values from clients table
// Maps each to its normalized key via toBranchKey()
// Allows looking up raw DB values for a given normalized key
export function useClientBranchValues() {
  const { data: branchMap } = useQuery({
    queryKey: ['client-branch-raw-values'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('branch')
        .not('branch', 'is', null)
        .eq('is_active', true);
      
      // Group raw values by normalized key
      const map = new Map<string, Set<string>>();
      for (const row of data || []) {
        if (!row.branch) continue;
        const key = toBranchKey(row.branch);
        if (!key) continue;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(row.branch);
      }
      return map;
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  // Given a normalized key, return all raw DB values
  const getRawValues = (normalizedKey: string): string[] => {
    return Array.from(branchMap?.get(normalizedKey) || []);
  };

  return { branchMap, getRawValues };
}
```

**File: `src/pages/CRM.tsx`** - Updated `effectiveBranches`:

```typescript
const { getRawValues } = useClientBranchValues();

const effectiveBranches = useMemo(() => {
  const managerBranches = hasManagerBranchRestrictions ? allowedBranchNames : null;
  
  if (selectedBranch && selectedBranch !== 'all') {
    // selectedBranch is already a normalized key (from toBranchKey)
    const rawValues = getRawValues(selectedBranch);
    
    if (managerBranches) {
      // Intersect: only include raw values that also match manager restrictions
      const managerKeys = new Set(managerBranches.map(toBranchKey));
      if (!managerKeys.has(selectedBranch)) return undefined; // not allowed
    }
    
    return rawValues.length > 0 ? rawValues : undefined;
  }
  
  if (managerBranches) {
    // Expand all manager branches to raw values
    return managerBranches.flatMap(b => getRawValues(toBranchKey(b)));
  }
  
  return undefined;
}, [selectedBranch, hasManagerBranchRestrictions, allowedBranchNames, getRawValues]);
```

This guarantees that the SQL filter uses exact values that exist in the database, regardless of naming inconsistencies, prefixes, or aliases.
