import { create } from 'zustand';

interface UiState {
  commandOpen: boolean;
  createProjectOpen: boolean;
  addSourceOpen: boolean;
  menuOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  setCreateProjectOpen: (open: boolean) => void;
  setAddSourceOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  createProjectOpen: false,
  addSourceOpen: false,
  menuOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setCreateProjectOpen: (createProjectOpen) => set({ createProjectOpen }),
  setAddSourceOpen: (addSourceOpen) => set({ addSourceOpen }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}));
