"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type UIState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  settingsOpen: boolean;
  phaseDashboardOpen: boolean;
  pandoraMenuOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setPhaseDashboardOpen: (open: boolean) => void;
  setPandoraMenuOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  toggleSettings: () => void;
};

const UIStateContext = createContext<UIState | null>(null);

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phaseDashboardOpen, setPhaseDashboardOpen] = useState(false);
  const [pandoraMenuOpen, setPandoraMenuOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      if (!prev) {
        // Close other modals when opening sidebar
        setSettingsOpen(false);
        setPhaseDashboardOpen(false);
        setPandoraMenuOpen(false);
      }
      return !prev;
    });
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => {
      if (!prev) {
        // Close other modals when opening settings
        setSidebarOpen(false);
        setPhaseDashboardOpen(false);
        setPandoraMenuOpen(false);
      }
      return !prev;
    });
  }, []);

  return (
    <UIStateContext.Provider
      value={{
        sidebarOpen,
        sidebarCollapsed,
        settingsOpen,
        phaseDashboardOpen,
        pandoraMenuOpen,
        setSidebarOpen,
        setSidebarCollapsed,
        setSettingsOpen,
        setPhaseDashboardOpen,
        setPandoraMenuOpen,
        toggleSidebar,
        toggleSidebarCollapsed,
        toggleSettings,
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) throw new Error("useUIState must be inside <UIStateProvider>");
  return ctx;
}

