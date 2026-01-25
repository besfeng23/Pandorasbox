import { create } from 'zustand';
import type { Artifact } from '@/lib/types';

interface ArtifactState {
  activeArtifact: Artifact | null;
  setActiveArtifact: (artifact: Artifact | null) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useArtifactStore = create<ArtifactState>((set) => ({
  activeArtifact: null,
  setActiveArtifact: (artifact) => set({ activeArtifact: artifact, isOpen: !!artifact }),
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
