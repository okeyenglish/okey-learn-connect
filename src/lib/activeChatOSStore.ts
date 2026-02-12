/**
 * Global store for currently active ChatOS chat.
 * Used to suppress notifications for the chat that's already open.
 */

type ActiveChat = {
  type: 'staff' | 'group' | null;
  id: string | null;
};

let current: ActiveChat = { type: null, id: null };

export const setActiveChatOS = (type: 'staff' | 'group' | null, id: string | null) => {
  current = { type, id };
};

export const getActiveChatOS = (): ActiveChat => current;
