"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFirestore } from "@/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useUIState } from "./useUIState";

interface PhaseData {
  id: number;
  title: string;
  status: string;
  active?: boolean;
}

const PHASE_COLORS: Record<number, { from: string; to: string; glow: string }> = {
  1: { from: "#38BDF8", to: "#60A5FA", glow: "rgba(56, 189, 248, 0.4)" },
  2: { from: "#60A5FA", to: "#818CF8", glow: "rgba(96, 165, 250, 0.4)" },
  3: { from: "#818CF8", to: "#A78BFA", glow: "rgba(129, 140, 248, 0.4)" },
  4: { from: "#A78BFA", to: "#C084FC", glow: "rgba(167, 139, 250, 0.4)" },
  5: { from: "#C084FC", to: "#D946EF", glow: "rgba(192, 132, 252, 0.4)" },
  6: { from: "#A855F7", to: "#9333EA", glow: "rgba(168, 85, 247, 0.4)" },
  7: { from: "#9333EA", to: "#7E22CE", glow: "rgba(147, 51, 234, 0.4)" },
  8: { from: "#7E22CE", to: "#6B21A8", glow: "rgba(126, 34, 206, 0.4)" },
  9: { from: "#6B21A8", to: "#581C87", glow: "rgba(107, 33, 168, 0.4)" },
  10: { from: "#581C87", to: "#EC4899", glow: "rgba(88, 28, 135, 0.4)" },
  11: { from: "#EC4899", to: "#DB2777", glow: "rgba(236, 72, 153, 0.4)" },
  12: { from: "#DB2777", to: "#BE185D", glow: "rgba(219, 39, 119, 0.4)" },
  13: { from: "#BE185D", to: "#9F1239", glow: "rgba(190, 24, 93, 0.4)" },
  14: { from: "#9F1239", to: "#881337", glow: "rgba(159, 18, 57, 0.4)" },
};

export default function PhaseIndicator() {
  const [currentPhase, setCurrentPhase] = useState<PhaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setPhaseDashboardOpen } = useUIState();
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      setCurrentPhase({
        id: 1,
        title: "Core System Setup",
        status: "Completed",
        active: true,
      });
      return;
    }

    try {
      // Query for active phases - need to handle "in" query with orderBy
      // For now, we'll query all and filter client-side or use a simpler query
      const q = query(
        collection(firestore, "system_phases"),
        orderBy("id", "asc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Find the most recent active phase
          const activePhases = snapshot.docs
            .map((doc) => ({
              id: doc.data().id,
              title: doc.data().title,
              status: doc.data().status,
              active: ["Active", "Running", "Live", "Deployed"].includes(doc.data().status),
            }))
            .filter((phase) => phase.active)
            .sort((a, b) => b.id - a.id);

          if (activePhases.length > 0) {
            setCurrentPhase(activePhases[0]);
          } else {
            // Fallback: use highest ID phase or Phase 1
            const allPhases = snapshot.docs
              .map((doc) => ({
                id: doc.data().id,
                title: doc.data().title,
                status: doc.data().status,
                active: false,
              }))
              .sort((a, b) => b.id - a.id);
            
            setCurrentPhase(allPhases[0] || {
              id: 1,
              title: "Core System Setup",
              status: "Completed",
              active: true,
            });
          }
          setIsLoading(false);
        },
        (error) => {
          console.error("Phase listener error:", error);
          // Fallback on error
          setCurrentPhase({
            id: 1,
            title: "Core System Setup",
            status: "Completed",
            active: true,
          });
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up phase listener:", error);
      setCurrentPhase({
        id: 1,
        title: "Core System Setup",
        status: "Completed",
        active: true,
      });
      setIsLoading(false);
    }
  }, [firestore]);

  if (isLoading || !currentPhase) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-white/10">
        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
        <span className="text-sm text-white/60">Loading phase...</span>
      </div>
    );
  }

  const colors = PHASE_COLORS[currentPhase.id] || PHASE_COLORS[1];

  return (
    <motion.button
      onClick={() => setPhaseDashboardOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-white/10 hover:border-white/20 transition-colors cursor-pointer group relative overflow-hidden"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Gradient glow background */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, ${colors.from}20, ${colors.to}20)`,
        }}
      />

      {/* Phase number with glow */}
      <motion.div
        className="relative z-10 flex items-center justify-center w-6 h-6 rounded"
        animate={{
          boxShadow: [
            `0 0 8px ${colors.glow}`,
            `0 0 16px ${colors.glow}`,
            `0 0 8px ${colors.glow}`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div
          className="w-full h-full rounded flex items-center justify-center text-xs font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
          }}
        >
          {currentPhase.id}
        </div>
      </motion.div>

      {/* Phase label */}
      <span className="text-sm text-white/90 font-medium relative z-10">
        {currentPhase.title}
      </span>

      {/* Ripple animation on phase transition */}
      <AnimatePresence>
        {currentPhase.active && (
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{
              background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.2, 1.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

