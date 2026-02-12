

## Problem

On smaller desktop screens (not mobile), the floating ChatOS button (bottom-right corner) overlaps the send button in the chat area, making it hard to send messages.

## Solution

Move the ChatOS button out of the way on smaller screens by repositioning it **above the message input area** when a chat is active, and add a small "ChatOS" button in the **chat header toolbar** as an alternative entry point.

### Changes:

**1. `src/pages/CRM.tsx`** - Adjust the floating button position
- When an active chat is open (activeChatId is set), shift the button higher (e.g., `bottom-24` instead of `bottom-6`) so it doesn't overlap the input area
- On screens below `lg` breakpoint, use responsive positioning: `bottom-24 right-4` to avoid overlap with the send button area

**2. `src/components/crm/ChatArea.tsx`** - Add padding/margin to the input area
- Add `pr-20` (right padding) to the message input container on smaller screens so the text field doesn't extend under the floating button

**3. Alternative approach (recommended)**: Add a ChatOS shortcut button in the top toolbar of the chat area (next to existing icons like search, phone, etc.) so users can open ChatOS from the header. Then hide the floating button when a chat is open on smaller screens.

### Specific implementation:

- In `CRM.tsx`, change the floating button classes from `fixed bottom-6 right-6` to `fixed bottom-6 right-6 xl:bottom-6 xl:right-6` with a media-query-based offset: on screens `< xl`, use `bottom-20 right-4` to sit above the input toolbar
- Add a `Sparkles` icon button in the `ChatArea.tsx` header toolbar (next to the existing action buttons) that opens ChatOS, providing an alternative access point that never overlaps
- This dual approach ensures ChatOS is always accessible without blocking the send button

### Technical details:

```
File: src/pages/CRM.tsx (line ~4440)
Change: "fixed bottom-6 right-6 z-50 h-14 w-14"
To: "fixed z-50 h-14 w-14 bottom-20 right-4 xl:bottom-6 xl:right-6"

This pushes the button above the input area on screens smaller than xl.
```

```
File: src/components/crm/ChatArea.tsx
Add: A small Sparkles button in the chat header toolbar 
that calls a new onOpenAssistant callback prop
```

