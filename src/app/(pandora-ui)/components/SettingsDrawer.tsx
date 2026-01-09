"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Moon, Mic, Cpu } from "lucide-react";
import { useSettings } from "./useSettings";

export default function SettingsDrawer({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const { theme, setTheme, model, setModel, voiceEnabled, toggleVoice } = useSettings();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25 }}
            className="fixed right-0 top-0 h-full w-80 bg-[#0b0b0b] border-l border-white/10 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-sm text-white/70">Settings</h2>
              <button onClick={() => setOpen(false)} className="hover:text-violet-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Theme */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-white/50 mb-2">Theme</h3>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-violet-400 transition-colors"
                >
                  <Moon className="w-4 h-4" /> {theme === "dark" ? "Dark" : "Light"}
                </button>
              </div>

              {/* Voice */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-white/50 mb-2">Voice</h3>
                <button 
                  onClick={toggleVoice} 
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-violet-400 transition-colors"
                >
                  <Mic className="w-4 h-4" /> {voiceEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>

              {/* Model */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-white/50 mb-2">Model</h3>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-transparent border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-violet-400 transition-colors"
                >
                  <option value="Pandora Core v1">Pandora Core v1</option>
                  <option value="Pandora Core v2">Pandora Core v2</option>
                  <option value="Base44 Experimental">Base44 Experimental</option>
                </select>
              </div>
            </div>

            <div className="border-t border-white/10 px-4 py-2 text-[10px] text-white/40 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Pandora UI {process.env.NEXT_PUBLIC_BUILD_VERSION || "v1.0.0"}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

