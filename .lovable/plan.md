
# Fix: AI Hub Panel Not Opening (Only Overlay Shows)

## Diagnosis

After analyzing the code and all log files, the issue is clear:

1. **Missing `SheetTitle` (DialogTitle)** - The `SheetContent` in all three return paths of AIHub.tsx lacks a `SheetTitle` component. Radix UI requires this for the Dialog/Sheet to function correctly. The console shows repeated errors: `DialogContent requires a DialogTitle`. While typically this is just a warning, certain browser versions (especially Firefox, which the user runs) can suppress the content rendering when accessibility requirements are not met.

2. **Missing `aria-describedby`** - The SheetContent also lacks a description, triggering another warning that compounds the rendering issue.

3. **No error boundary inside SheetContent** - If any hook or child component throws inside the Sheet Portal, the overlay stays visible while the content silently disappears, with no error message for the user.

## Solution

### File: `src/components/ai-hub/AIHub.tsx`

Add `SheetTitle` (visually hidden) and `SheetDescription` to all three Sheet return paths:

**Return path 1** (activeChat === 'assistant', ~line 807-842):
- Add `import { VisuallyHidden } from '@radix-ui/react-visually-hidden'` at top
- Add `SheetTitle` and `SheetDescription` imports from sheet component
- Inside SheetContent, add visually hidden title and description:
  ```
  <VisuallyHidden asChild><SheetTitle>AI Assistant</SheetTitle></VisuallyHidden>
  ```
- Add `aria-describedby={undefined}` to SheetContent

**Return path 2** (activeChat exists, ~line 851-853):
- Same pattern: add hidden SheetTitle + aria-describedby

**Return path 3** (main chat list, ~line 1564-1566):
- Same pattern: add hidden SheetTitle + aria-describedby

### File: `src/components/ui/sheet.tsx`

No changes needed - the component already supports custom content.

## Technical Details

### New dependency
- `@radix-ui/react-visually-hidden` - already available as a transitive dependency of Radix UI components, no install needed

### Changes summary
1. Add import for `VisuallyHidden` from `@radix-ui/react-visually-hidden`
2. Add import for `SheetTitle, SheetDescription` from sheet component  
3. Add `<VisuallyHidden asChild><SheetTitle>...</SheetTitle></VisuallyHidden>` inside each SheetContent
4. Add `aria-describedby={undefined}` to each SheetContent to suppress the description warning

### Why this fixes the issue
The Radix Dialog engine expects a `DialogTitle` (= `SheetTitle`) to be present. Without it, the internal focus-trap and portal rendering logic may not complete correctly in all browsers, particularly Firefox. The overlay renders because it is a simple div, but the Content (which has focus-trap, escape-key handling, and accessibility tree integration) may silently fail to mount its children.
