"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIState } from "./useUIState";
import { useFirestore } from "@/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

type CubeState = "IDLE" | "HOVERED" | "CLICKED" | "ACTIVE";

export default function PandoraBoxInteractive() {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [cubeState, setCubeState] = useState<CubeState>("IDLE");
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const { setPandoraMenuOpen } = useUIState();
  const firestore = useFirestore();

  // Fetch current phase for cube face indicators
  useEffect(() => {
    if (!firestore) return;

    try {
      const q = query(
        collection(firestore, "system_phases"),
        orderBy("id", "asc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const activePhases = snapshot.docs
          .map((doc) => ({
            id: doc.data().id,
            status: doc.data().status,
          }))
          .filter((phase) => ["Active", "Running", "Live", "Deployed"].includes(phase.status))
          .sort((a, b) => b.id - a.id);

        if (activePhases.length > 0) {
          setCurrentPhase(activePhases[0].id);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching phase:", error);
    }
  }, [firestore]);

  useEffect(() => {
    if (cubeState === "IDLE" && !isHovered) {
      // Gentle continuous rotation when idle
      const interval = setInterval(() => {
        setRotation((prev) => ({
          x: prev.x + 0.3,
          y: prev.y + 0.3,
        }));
      }, 50);
      return () => clearInterval(interval);
    } else if (cubeState === "ACTIVE") {
      // Faster rotation when active
      const interval = setInterval(() => {
        setRotation((prev) => ({
          x: prev.x + 1,
          y: prev.y + 1,
        }));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [cubeState, isHovered]);

  const handleClick = () => {
    setCubeState("CLICKED");
    setPandoraMenuOpen(true);
    
    // Reset to hovered after animation
    setTimeout(() => {
      setCubeState(isHovered ? "HOVERED" : "IDLE");
    }, 600);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setCubeState("HOVERED");
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCubeState("IDLE");
  };

  // Generate 18 light branches for burst animation
  const branches = Array.from({ length: 18 }, (_, i) => ({
    angle: (i * 360) / 18,
    delay: i * 0.02,
  }));

  return (
    <div
      className="relative w-12 h-12 cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={(e) => {
        if (isHovered && cubeState !== "CLICKED") {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setRotation({
            x: (y / rect.height - 0.5) * 360,
            y: (x / rect.width - 0.5) * 360,
          });
        }
      }}
      onClick={handleClick}
    >
      {/* Circuit pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 40 40">
        <defs>
          <pattern id="circuit" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 0 4 L 8 4 M 4 0 L 4 8" stroke="rgba(96, 165, 250, 0.6)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="40" height="40" fill="url(#circuit)" />
      </svg>

      {/* Burst animation - 18 light branches */}
      <AnimatePresence>
        {cubeState === "CLICKED" && (
          <>
            {branches.map((branch, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-8 rounded-full"
                style={{
                  left: "50%",
                  top: "50%",
                  originX: 0.5,
                  originY: 0.5,
                  background: `linear-gradient(to top, transparent, rgba(56, 189, 248, 0.8))`,
                  boxShadow: "0 0 8px rgba(56, 189, 248, 0.6)",
                }}
                initial={{
                  opacity: 0,
                  scale: 0,
                  rotate: branch.angle,
                  x: 0,
                  y: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: [0, Math.cos((branch.angle * Math.PI) / 180) * 24],
                  y: [0, Math.sin((branch.angle * Math.PI) / 180) * 24],
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 0.6,
                  delay: branch.delay,
                  ease: "easeOut",
                }}
              />
            ))}
            {/* Center pulse */}
            <motion.div
              className="absolute inset-0 rounded-sm"
              style={{
                background: "radial-gradient(circle, rgba(56, 189, 248, 0.6), transparent)",
                filter: "blur(8px)",
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.5, 2], opacity: [0, 0.8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>

      <motion.div
        className="w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
        animate={{
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Cube faces with gradient (cyan to violet) */}
        <div className="absolute inset-0" style={{ transform: "translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-violet-500 rounded-sm border border-cyan-300/40 opacity-90 relative">
            {/* Phase indicator LED on this face */}
            {currentPhase <= 3 && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        </div>
        <div className="absolute inset-0" style={{ transform: "translateZ(-24px) rotateY(180deg)" }}>
          <div className="w-full h-full bg-gradient-to-br from-violet-500 to-cyan-400 rounded-sm border border-violet-400/40 opacity-90 relative">
            {currentPhase > 3 && currentPhase <= 6 && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateY(90deg) translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-purple-600 rounded-sm border border-cyan-300/40 opacity-80 relative">
            {currentPhase > 6 && currentPhase <= 9 && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateY(-90deg) translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-cyan-400 rounded-sm border border-purple-300/40 opacity-80 relative">
            {currentPhase > 9 && currentPhase <= 11 && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateX(90deg) translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-violet-500 to-cyan-500 rounded-sm border border-violet-300/40 opacity-85 relative">
            {currentPhase > 11 && currentPhase <= 13 && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateX(-90deg) translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-violet-500 rounded-sm border border-cyan-300/40 opacity-85 relative">
            {currentPhase === 14 && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Gradient glow effect (cyan to violet) */}
      <motion.div
        className="absolute inset-0 rounded-sm pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.4) 0%, rgba(168, 85, 247, 0.3) 50%, transparent 70%)",
          filter: "blur(12px)",
        }}
        animate={{
          opacity: isHovered || cubeState === "ACTIVE" ? 0.9 : 0.5,
        }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      />

      {/* White speckles/sparkles */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

