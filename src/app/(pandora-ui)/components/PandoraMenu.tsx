"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Image, FileText, Upload, X } from "lucide-react";
import { useUIState } from "./useUIState";

export default function PandoraMenu() {
  const { pandoraMenuOpen, setPandoraMenuOpen } = useUIState();

  if (!pandoraMenuOpen) return null;

  const menuItems = [
    {
      icon: Image,
      label: "Attach Image",
      onClick: () => {
        // TODO: Implement image attachment
        setPandoraMenuOpen(false);
      },
    },
    {
      icon: Upload,
      label: "Import Memory",
      onClick: () => {
        // TODO: Implement memory import
        setPandoraMenuOpen(false);
      },
    },
    {
      icon: FileText,
      label: "Add Document",
      onClick: () => {
        // TODO: Implement document upload
        setPandoraMenuOpen(false);
      },
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={() => setPandoraMenuOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute bottom-20 left-4 w-56 bg-black border border-white/10 rounded-xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 space-y-1">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/90 hover:bg-white/10 transition-colors text-sm font-medium"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

