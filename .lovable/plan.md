
# Plan: Fix Mobile Navigation Tab Switching

## Problem
When clicking "Menu" in the mobile navigation, `activeTab` is set to `'menu'`. Clicking on "Clients", "Teachers", or "ChatOS" only changes `activeChatType` but does not reset `activeTab` back to `'chats'`, causing the menu to block all other views.

## Solution
Update the mobile navigation handlers to also set `activeTab` to `'chats'` when switching away from the menu.

---

## Changes

### File: `src/pages/CRM.tsx`

Update the three mobile navigation handlers (lines ~1922-1948):

**handleMobileChatOSClick:**
```typescript
const handleMobileChatOSClick = () => {
  setActiveChatType('chatos');
  setActiveChatId(null);
  setActiveTab('chats'); // <-- ADD THIS
  if (isMobile) {
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  }
};
```

**handleMobileTeachersClick:**
```typescript
const handleMobileTeachersClick = () => {
  setActiveChatType('teachers');
  setActiveChatId(null);
  setActiveTab('chats'); // <-- ADD THIS
  if (isMobile) {
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  }
};
```

**handleMobileClientsClick:**
```typescript
const handleMobileClientsClick = () => {
  setActiveChatType('client');
  setActiveChatId(null);
  setActiveTab('chats'); // <-- ADD THIS
  if (isMobile) {
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  }
};
```

---

## Result

| Button Click | Before | After |
|-------------|--------|-------|
| ChatOS | Shows menu (blocked) | Shows AI Hub |
| Teachers | Shows menu (blocked) | Shows teacher chats |
| Clients | Shows menu (blocked) | Shows client chats |
| Menu | Shows menu | Shows menu |

Now clicking any navigation button will properly switch the view by updating both `activeChatType` AND `activeTab`.
