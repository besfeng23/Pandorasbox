import { create } from 'zustand';

interface ChatState {
    isStreaming: boolean;
    setIsStreaming: (isStreaming: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    isStreaming: false,
    setIsStreaming: (isStreaming) => set({ isStreaming }),
}));
