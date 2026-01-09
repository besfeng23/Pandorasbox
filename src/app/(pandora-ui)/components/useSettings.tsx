"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type SettingsState = {
  theme: "dark" | "light";
  model: string;
  voiceEnabled: boolean;
  setTheme: (t: "dark" | "light") => void;
  setModel: (m: string) => void;
  toggleVoice: () => void;
};

const SettingsContext = createContext<SettingsState | null>(null);

const STORAGE_KEY = "pandora-ui-settings";

function loadSettings() {
  if (typeof window === "undefined") {
    return { theme: "dark" as const, model: "Pandora Core v1", voiceEnabled: false };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return { theme: "dark" as const, model: "Pandora Core v1", voiceEnabled: false };
}

function saveSettings(settings: { theme: "dark" | "light"; model: string; voiceEnabled: boolean }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const loaded = loadSettings();
  const [theme, setThemeState] = useState<"dark" | "light">(loaded.theme);
  const [model, setModelState] = useState(loaded.model);
  const [voiceEnabled, setVoiceEnabledState] = useState(loaded.voiceEnabled);

  // Save to localStorage whenever settings change
  useEffect(() => {
    saveSettings({ theme, model, voiceEnabled });
  }, [theme, model, voiceEnabled]);

  const setTheme = (t: "dark" | "light") => {
    setThemeState(t);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", t === "dark");
    }
  };

  const setModel = (m: string) => setModelState(m);
  const toggleVoice = () => setVoiceEnabledState((v) => !v);

  // Apply theme on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  return (
    <SettingsContext.Provider
      value={{ theme, model, voiceEnabled, setTheme, setModel, toggleVoice }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside <SettingsProvider>");
  return ctx;
}

