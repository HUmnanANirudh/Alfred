import { create } from 'zustand';

export type SourceIntake = 'all' | 'video';

interface UiState {
  commandOpen: boolean;
  createProjectOpen: boolean;
  addSourceOpen: boolean;
  sourceIntake: SourceIntake;
  menuOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  setCreateProjectOpen: (open: boolean) => void;
  setAddSourceOpen: (open: boolean, intake?: SourceIntake) => void;
  setMenuOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  createProjectOpen: false,
  addSourceOpen: false,
  sourceIntake: 'all',
  menuOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setCreateProjectOpen: (createProjectOpen) => set({ createProjectOpen }),
  setAddSourceOpen: (addSourceOpen, sourceIntake = 'all') =>
    set({ addSourceOpen, sourceIntake: addSourceOpen ? sourceIntake : 'all' }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}));
