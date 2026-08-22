import { create } from 'zustand';

export type SourceIntake = 'video' | 'writing';

interface UiState {
  commandOpen: boolean;
  createProjectOpen: boolean;
  addSourceOpen: boolean;
  sourceIntake: SourceIntake;
  setCommandOpen: (open: boolean) => void;
  setCreateProjectOpen: (open: boolean) => void;
  setAddSourceOpen: (open: boolean, intake?: SourceIntake) => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  createProjectOpen: false,
  addSourceOpen: false,
  sourceIntake: 'video',
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setCreateProjectOpen: (createProjectOpen) => set({ createProjectOpen }),
  setAddSourceOpen: (addSourceOpen, sourceIntake) =>
    set(sourceIntake ? { addSourceOpen, sourceIntake } : { addSourceOpen }),
}));
