"use client";
import React from "react";
import { Menu } from "lucide-react";
import { useSettings } from "./useSettings";

export default function Topbar({ setOpen }: { setOpen: (o: boolean) => void }) {
  const { model } = useSettings();
  
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur">
      <button 
        onClick={() => setOpen(true)} 
        className="hover:text-violet-400 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="text-sm text-white/70">Model: {model}</div>
      <div className="w-5 h-5" /> {/* spacer */}
    </header>
  );
}

