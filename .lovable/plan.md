
# Plan: Fix Cross-Device Session Synchronization

## Problem Analysis
Each device starts tracking from scratch and re-sends already-counted server data as new deltas, causing double-counting. The `useSessionPersistence` hook doesn't know that `activeTime` was loaded from server (not locally accumulated).

## Solution
Pass server baseline to `useSessionPersistence` and initialize `lastSavedRef` with server values when baseline arrives. This ensures only NEW activity (accumulated after sync) gets sent as deltas.

---

## Technical Changes

### 1. Update `useSessionPersistence.ts`
Add `serverBaseline` parameter and sync `lastSavedRef` when baseline arrives:

```typescript
export const useSessionPersistence = (
  sessionStart: number,
  activeTime: number,
  idleTime: number,
  onCallTime: number = 0,
  isIdle: boolean = false,
  currentIdleStreak: number = 0,
  serverBaseline?: ServerSessionBaseline | null  // NEW PARAMETER
) => {
  // ... existing code ...

  // NEW: Sync lastSavedRef with server baseline to prevent double-counting
  const serverBaselineAppliedRef = useRef(false);
  
  useEffect(() => {
    if (!serverBaseline || serverBaselineAppliedRef.current) return;
    
    // Server baseline loaded - initialize lastSavedRef to server values
    // This prevents re-sending already-counted time as new deltas
    const serverActiveMs = serverBaseline.activeSeconds * 1000;
    const serverIdleMs = serverBaseline.idleSeconds * 1000;
    const serverOnCallMs = serverBaseline.onCallSeconds * 1000;
    
    // Only apply if server has meaningful data
    if (serverActiveMs > 0 || serverIdleMs > 0) {
      console.log('[useSessionPersistence] Syncing with server baseline:', {
        serverActive: serverBaseline.activeSeconds,
        serverIdle: serverBaseline.idleSeconds,
      });
      
      lastSavedRef.current = {
        activeTime: Math.max(lastSavedRef.current.activeTime, serverActiveMs),
        idleTime: Math.max(lastSavedRef.current.idleTime, serverIdleMs),
        onCallTime: Math.max(lastSavedRef.current.onCallTime, serverOnCallMs),
        timestamp: Date.now(),
      };
      
      serverBaselineAppliedRef.current = true;
    }
  }, [serverBaseline]);
```

### 2. Update `StaffActivityIndicator.tsx`
Pass `serverBaseline` to `useSessionPersistence`:

```typescript
const { baseline: serverBaseline } = useTodayWorkSession();

// ... useActivityTracker call ...

useSessionPersistence(
  sessionStart,
  activeTime,
  idleTime,
  0,
  isIdle,
  currentIdleStreak,
  serverBaseline  // NEW: Pass server baseline
);
```

---

## Data Flow After Fix

```text
Device A (Desktop):
1. Start fresh, activeTime=0, lastSaved=0
2. Work 2h → activeTime=2h
3. Save delta: 2h - 0 = 2h → Server: 2h ✓
4. lastSaved updated to 2h

Device B (PWA) opens:
1. Fetch server baseline: 2h
2. useActivityTracker syncs: activeTime = max(0, 2h) = 2h
3. useSessionPersistence syncs lastSaved = max(0, 2h) = 2h  ← FIX
4. Work 30min → activeTime = 2.5h
5. Save delta: 2.5h - 2h = 0.5h → Server: 2h + 0.5h = 2.5h ✓
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useSessionPersistence.ts` | Add serverBaseline parameter, sync lastSavedRef |
| `src/components/crm/StaffActivityIndicator.tsx` | Pass serverBaseline to useSessionPersistence |

## Edge Cases Handled
- First-time user: serverBaseline = 0, no sync needed
- New day: Day change logic resets both tracker and persistence
- Network failure: Falls back to local-only tracking until sync succeeds
