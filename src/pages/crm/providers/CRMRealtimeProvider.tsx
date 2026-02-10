import React, { createContext, useContext } from 'react';
import { useNewMessageHighlight } from '@/hooks/useNewMessageHighlight';
import { useTypingPresence } from '@/hooks/useTypingPresence';
import { useChatPresenceList } from '@/hooks/useChatPresence';

interface CRMRealtimeContextValue {
  newMessageClientIds: Set<string>;
  addNewMessageHighlight: (clientId: string) => void;
  typingByClient: ReturnType<typeof useTypingPresence>['typingByClient'];
  presenceByClient: ReturnType<typeof useChatPresenceList>['presenceByClient'];
}

const CRMRealtimeContext = createContext<CRMRealtimeContextValue | null>(null);

export const CRMRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { newMessageClientIds, addNewMessageHighlight } = useNewMessageHighlight();
  const { typingByClient } = useTypingPresence();
  const { presenceByClient } = useChatPresenceList();

  return (
    <CRMRealtimeContext.Provider value={{ newMessageClientIds, addNewMessageHighlight, typingByClient, presenceByClient }}>
      {children}
    </CRMRealtimeContext.Provider>
  );
};

export const useCRMRealtime = (): CRMRealtimeContextValue => {
  const ctx = useContext(CRMRealtimeContext);
  if (!ctx) throw new Error('useCRMRealtime must be used within CRMRealtimeProvider');
  return ctx;
};
