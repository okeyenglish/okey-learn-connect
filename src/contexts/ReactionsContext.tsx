import React, { createContext, useContext, useMemo } from 'react';
import { useBatchMessageReactions, GroupedReaction } from '@/hooks/useBatchMessageReactions';

interface ReactionsContextValue {
  reactions: Record<string, GroupedReaction[]>;
  isLoading: boolean;
}

const ReactionsContext = createContext<ReactionsContextValue>({
  reactions: {},
  isLoading: false,
});

interface ReactionsProviderProps {
  messageIds: string[];
  children: React.ReactNode;
}

export const ReactionsProvider = ({ messageIds, children }: ReactionsProviderProps) => {
  // Фильтруем пустые ID и мемоизируем для стабильности
  const validMessageIds = useMemo(
    () => messageIds.filter(id => id && id.length > 0),
    [messageIds]
  );

  const { data, isLoading } = useBatchMessageReactions(validMessageIds);

  const value = useMemo<ReactionsContextValue>(
    () => ({
      reactions: data || {},
      isLoading,
    }),
    [data, isLoading]
  );

  return (
    <ReactionsContext.Provider value={value}>
      {children}
    </ReactionsContext.Provider>
  );
};

// Хук для использования контекста реакций
export const useReactionsContext = () => {
  return useContext(ReactionsContext);
};

// Хук для получения реакций конкретного сообщения
export const useMessageReactionsFromContext = (messageId: string) => {
  const { reactions, isLoading } = useReactionsContext();
  return {
    groupedReactions: reactions[messageId] || [],
    isLoading,
  };
};
