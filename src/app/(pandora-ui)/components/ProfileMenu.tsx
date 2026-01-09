"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User } from "lucide-react";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative p-4 border-t border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors w-full"
      >
        <User className="w-4 h-4" /> Operator
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay to close menu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-12 left-4 w-44 bg-[#111] border border-white/10 rounded-lg p-2 space-y-1 z-50"
            >
              <button 
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setOpen(false)}
              >
                Manage Account
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setOpen(false)}
              >
                Preferences
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-white/10 rounded-md transition-colors"
                onClick={() => {
                  setOpen(false);
                  // TODO: Implement sign out logic
                  console.log("Sign out clicked");
                }}
              >
                <LogOut className="inline w-3 h-3 mr-1" /> Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

