import { create } from 'zustand';

type ConnectionStatus = 'live' | 'syncing' | 'offline';

interface ConnectionState {
  status: ConnectionStatus;
  latency: number | null;
  pendingMessages: Map<string, number>;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addPendingMessage: (messageId: string) => void;
  calculateLatency: (messageId: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'syncing',
  latency: null,
  pendingMessages: new Map(),
  setConnectionStatus: (status) => set({ status }),
  addPendingMessage: (messageId) => {
    set((state) => {
      const newPending = new Map(state.pendingMessages);
      newPending.set(messageId, Date.now());
      return { pendingMessages: newPending };
    });
  },
  calculateLatency: (messageId) => {
    const { pendingMessages } = get();
    if (pendingMessages.has(messageId)) {
      const startTime = pendingMessages.get(messageId)!;
      const latency = Date.now() - startTime;
      
      set((state) => {
        const newPending = new Map(state.pendingMessages);
        newPending.delete(messageId);
        return { 
            pendingMessages: newPending,
            latency: latency 
        };
      });
    }
  },
}));
