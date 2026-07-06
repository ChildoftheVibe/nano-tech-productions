import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UiState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "ntv-ui",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
