"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function PandoraBoxInteractive() {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isHovered) {
      // Gentle continuous rotation when not hovered
      const interval = setInterval(() => {
        setRotation((prev) => ({
          x: prev.x + 0.5,
          y: prev.y + 0.5,
        }));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isHovered]);

  return (
    <div
      className="relative w-12 h-12 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={(e) => {
        if (isHovered) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setRotation({
            x: (y / rect.height - 0.5) * 360,
            y: (x / rect.width - 0.5) * 360,
          });
        }
      }}
    >
      <motion.div
        className="w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
        animate={{
          scale: isHovered ? 1.1 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Cube faces */}
        <div className="absolute inset-0" style={{ transform: "translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-violet-600 rounded-sm opacity-90 border border-cyan-400/30" />
        </div>
        <div className="absolute inset-0" style={{ transform: "translateZ(-24px) rotateY(180deg)" }}>
          <div className="w-full h-full bg-gradient-to-br from-violet-600 to-cyan-500 rounded-sm opacity-90 border border-violet-400/30" />
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateY(90deg) translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-purple-600 rounded-sm opacity-80 border border-cyan-300/30" />
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateY(-90deg) translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-cyan-400 rounded-sm opacity-80 border border-purple-300/30" />
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateX(90deg) translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-violet-500 to-cyan-500 rounded-sm opacity-85 border border-violet-300/30" />
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateX(-90deg) translateZ(24px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-violet-500 rounded-sm opacity-85 border border-cyan-300/30" />
        </div>
      </motion.div>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-sm"
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
        animate={{
          opacity: isHovered ? 0.8 : 0.4,
        }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
}

