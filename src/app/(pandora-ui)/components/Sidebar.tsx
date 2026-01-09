"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Settings, Activity } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import PandoraBoxInteractive from "./PandoraBoxInteractive";

export default function Sidebar({ 
  open, 
  setOpen, 
  onOpenSettings 
}: { 
  open: boolean; 
  setOpen: (o: boolean) => void;
  onOpenSettings?: () => void;
}) {
  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 h-full w-60 bg-[#0a0a0a] border-r border-white/10 flex flex-col justify-between z-50"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-center mb-4">
                <PandoraBoxInteractive />
              </div>
              <button 
                className="flex items-center gap-2 text-sm text-white/70 hover:text-violet-400 transition-colors w-full"
                onClick={() => setOpen(false)}
              >
                <Home className="w-4 h-4" /> Home
              </button>
              <button 
                className="flex items-center gap-2 text-sm text-white/70 hover:text-violet-400 transition-colors w-full"
                onClick={() => setOpen(false)}
              >
                <Activity className="w-4 h-4" /> Metrics
              </button>
              <button 
                className="flex items-center gap-2 text-sm text-white/70 hover:text-violet-400 transition-colors w-full"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings?.();
                }}
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
            </div>
            <ProfileMenu />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

