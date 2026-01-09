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
      className="relative w-10 h-10 cursor-pointer"
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
      {/* Circuit pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 40 40">
        <defs>
          <pattern id="circuit" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 0 4 L 8 4 M 4 0 L 4 8" stroke="rgba(96, 165, 250, 0.6)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="40" height="40" fill="url(#circuit)" />
      </svg>

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
        {/* Cube - top face (most visible) */}
        <div className="absolute inset-0" style={{ transform: "translateZ(20px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-blue-400 via-cyan-300 to-blue-500 rounded-sm border-2 border-blue-300/40 opacity-95">
            {/* Top face glow */}
            <div className="absolute inset-0 bg-blue-400/30 rounded-sm blur-sm" />
          </div>
        </div>
        
        {/* Other faces */}
        <div className="absolute inset-0" style={{ transform: "translateZ(-20px) rotateY(180deg)" }}>
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-400 rounded-sm border border-blue-400/30 opacity-70" />
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateY(90deg) translateZ(20px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500 rounded-sm border border-cyan-300/30 opacity-60" />
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateY(-90deg) translateZ(20px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-400 rounded-sm border border-blue-300/30 opacity-60" />
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateX(90deg) translateZ(20px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-400 rounded-sm border border-blue-300/30 opacity-65" />
        </div>
        <div className="absolute inset-0" style={{ transform: "rotateX(-90deg) translateZ(20px)" }}>
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-400 rounded-sm border border-cyan-300/30 opacity-65" />
        </div>
      </motion.div>

      {/* Bright glow effect from top */}
      <motion.div
        className="absolute inset-0 rounded-sm"
        style={{
          background: "radial-gradient(circle at 50% 30%, rgba(96, 165, 250, 0.6) 0%, rgba(59, 130, 246, 0.3) 30%, transparent 70%)",
          filter: "blur(10px)",
        }}
        animate={{
          opacity: isHovered ? 1 : 0.7,
        }}
        transition={{ duration: 0.2 }}
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

