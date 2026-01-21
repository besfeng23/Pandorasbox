import { create } from 'zustand';

interface ArtifactState {
  activeArtifactId: string | null;
  setActiveArtifactId: (id: string | null) => void;
}

export const useArtifactStore = create<ArtifactState>((set) => ({
  activeArtifactId: null,
  setActiveArtifactId: (id) => set({ activeArtifactId: id }),
}));
