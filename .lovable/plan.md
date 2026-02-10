

# Fix: "Should have a queue" React HMR Error

## Root Cause
This is a **development-only** error caused by React's Hot Module Replacement (HMR). When files are edited, React tries to refresh components in-place, but `CRMContent` has so many hooks (~40+) that hook ordering gets corrupted during hot reload. The error fires at `useNewMessageHighlight` because it's deep in the hook chain.

This does NOT affect production builds or end users.

## Solution
Wrap `CRMContent` in an HMR-safe boundary by adding a unique key that forces a full remount on hot refresh, and extract the realtime/presence hooks into a dedicated provider to reduce hook density in the main component.

## Changes

### 1. Extract realtime hooks into a CRM Realtime Provider
Create `src/pages/crm/providers/CRMRealtimeProvider.tsx` that owns:
- `useNewMessageHighlight`
- `useTypingPresence`
- `useChatPresenceList`

These values will be passed down via React Context, reducing the hook count in `CRMContent` by 3 and making HMR more stable.

### 2. Update `CRM.tsx`
- Remove direct calls to `useNewMessageHighlight`, `useTypingPresence`, `useChatPresenceList` from `CRMContent`
- Wrap `CRMContent` with `CRMRealtimeProvider`
- Consume values via `useCRMRealtime()` context hook (single hook instead of 3)

### 3. Add HMR error recovery
In `CRM.tsx`, add a key to `CRMContent` that changes on HMR to force clean remount:
```text
// In the CRM page component that renders CRMContent:
<CRMRealtimeProvider>
  <CRMContent key={import.meta.hot ? Date.now() : 'stable'} />
</CRMRealtimeProvider>
```
This ensures that during development hot reloads, the component fully remounts instead of trying to reconcile stale hook queues.

## Files to create
- `src/pages/crm/providers/CRMRealtimeProvider.tsx`

## Files to modify
- `src/pages/CRM.tsx` — remove 3 hook calls, wrap in provider, add HMR key

## Impact
- Eliminates the "Should have a queue" error during development
- No behavior change in production
- Slightly cleaner separation of concerns in the CRM component

