
'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function NeuralCube() {
    return (
        <div className="relative w-64 h-64 flex items-center justify-center perspective-[1000px] group">
            {/* Outer Glow Ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse-subtle" />

            {/* 3D Cube Container */}
            <div className="w-32 h-32 relative transform-style-3d animate-[spin-slow_20s_linear_infinite]">

                {/* Core - The "Brain" */}
                <div className="absolute inset-4 bg-primary/50 blur-xl rounded-full animate-pulse transform-style-3d" />

                <CubeFace rotateX={0} rotateY={0} translateZ={64} />   {/* Front */}
                <CubeFace rotateX={180} rotateY={0} translateZ={64} /> {/* Back */}
                <CubeFace rotateX={0} rotateY={90} translateZ={64} />  {/* Right */}
                <CubeFace rotateX={0} rotateY={-90} translateZ={64} /> {/* Left */}
                <CubeFace rotateX={90} rotateY={0} translateZ={64} />  {/* Top */}
                <CubeFace rotateX={-90} rotateY={0} translateZ={64} /> {/* Bottom */}

                {/* Inner rotating rings */}
                <div className="absolute inset-0 border border-primary/30 rounded-full animate-[spin-reverse_10s_linear_infinite] transform scale-150 border-dashed" />
                <div className="absolute inset-0 border border-secondary/30 rounded-full animate-[spin_15s_linear_infinite] transform scale-125 border-dotted" />
            </div>

            <style jsx global>{`
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        
        @keyframes spin-slow {
          0% { transform: rotateX(0deg) rotateY(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }
        
        @keyframes spin-reverse {
          0% { transform: rotateZ(0deg); }
          100% { transform: rotateZ(-360deg); }
        }
        
        @keyframes spin {
          0% { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
      `}</style>
        </div>
    );
}

function CubeFace({ rotateX, rotateY, translateZ }: { rotateX: number, rotateY: number, translateZ: number }) {
    return (
        <div
            className="absolute inset-0 border border-primary/40 bg-primary/10 backdrop-blur-sm flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.3)_inset]"
            style={{
                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px)`
            }}
        >
            <div className="w-16 h-16 border border-white/10 opacity-50" />
            <div className="absolute w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_var(--primary)]" />
        </div>
    );
}
