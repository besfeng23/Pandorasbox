"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type SettingsState = {
  theme: "dark" | "light";
  model: string;
  voiceEnabled: boolean;
  setTheme: (t: "dark" | "light") => void;
  setModel: (m: string) => void;
  toggleVoice: () => void;
};

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [model, setModel] = useState("Pandora Core v1");
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const toggleVoice = () => setVoiceEnabled((v) => !v);

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

