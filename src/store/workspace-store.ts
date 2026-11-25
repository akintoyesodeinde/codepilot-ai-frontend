'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceUiState {
  activeWorkspaceId: string | null;
  mobileNavOpen: boolean;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  setMobileNavOpen: (open: boolean) => void;
  resetWorkspaceState: () => void;
}

export const useWorkspaceStore = create<WorkspaceUiState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      mobileNavOpen: false,
      setActiveWorkspaceId: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      resetWorkspaceState: () => set({ activeWorkspaceId: null, mobileNavOpen: false }),
    }),
    {
      name: 'codepilot-workspace-ui',
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    },
  ),
);
