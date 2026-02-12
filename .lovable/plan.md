

# Plan: Optimize Interface Loading and Fix Key Issues

## Summary
Based on the analysis of 9,279 lines of console logs, two main problems were identified that directly affect performance: ServiceWorker hangs and excessive AIHub re-renders. No critical JS errors were found from the application code itself.

---

## Problem 1: ServiceWorker Grace Timeout

The browser repeatedly kills the ServiceWorker because promises in `waitUntil`/`respondWith` never resolve. This happens when `staleWhileRevalidate()` or `networkFirst()` fetch calls hang indefinitely (e.g., slow network, server not responding).

### Fix
Add a timeout wrapper (5 seconds) to all fetch calls in `src/sw.ts` so promises always resolve. Also reduce excessive console.log calls in the SW that add overhead.

### Changes to `src/sw.ts`:
- Add a `fetchWithTimeout(request, timeout)` utility that wraps `fetch()` with `AbortController` and a 5-second timeout
- Replace all `fetch(request)` calls in `staleWhileRevalidate`, `networkFirst`, and `cacheFirstImages` with `fetchWithTimeout(request, 5000)`
- Remove verbose `console.log` for cache hits (keep only warnings/errors)

---

## Problem 2: AIHub Excessive Re-renders

The `AIHub` component re-renders 20-30+ times when `isOpen` is `false` (panel is closed). This happens because:
- CRM.tsx passes inline objects/callbacks as props: `context={{...}}`, `onOpenModal={{...}}`, `onToggle={() => ...}`
- Every CRM re-render creates new object references, triggering AIHub re-render
- AIHub has ~20 hooks that all execute on each render even when the panel is hidden

### Fix
1. **Early return in AIHub**: When `isOpen === false` and no `initialStaffUserId`/`initialGroupChatId`/`initialAssistantMessage`, skip all hook execution by returning `null` immediately after the first few essential hooks
2. **Memoize props in CRM.tsx**: Wrap `context`, `onOpenModal`, and `onToggle` in `useMemo`/`useCallback`
3. **Remove debug console.log**: Remove `console.log('[AIHub] Rendering, isOpen:', isOpen)` that fires on every render

---

## Problem 3: Minor Optimizations

### ServiceWorker registration
- Add a periodic `CLEANUP_CACHES` message from the main app (currently defined in SW but never triggered)

### Console noise reduction
- Remove or gate behind `import.meta.env.DEV` the frequent `[AIHub] Rendering` log
- Remove `[Prefetch]` logs from production builds

---

## Technical Details

### Files to modify:
1. **`src/sw.ts`** -- Add fetch timeout, reduce logging
2. **`src/components/ai-hub/AIHub.tsx`** -- Early return when closed, remove debug log
3. **`src/pages/CRM.tsx`** -- Memoize AIHub props (context, onOpenModal, onToggle)

### Estimated impact:
- ServiceWorker will no longer hang and get killed by the browser
- AIHub re-renders reduced from ~30 to 0 when the panel is closed
- Smoother CRM interface with less CPU usage from unnecessary React reconciliation

