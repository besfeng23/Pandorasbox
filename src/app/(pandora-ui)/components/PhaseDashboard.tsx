"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, Shield, Network, Brain, TrendingUp } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useUIState } from "./useUIState";

interface PhaseMetrics {
  phase_id: number;
  status: string;
  telemetry?: {
    active_components: number;
    health_score: number;
    last_check: string;
  };
}

interface SystemMetrics {
  federation: {
    connected_systems: number;
    active_federations: string[];
  };
  selfheal: {
    recovery_events: number;
    last_recovery: string | null;
    health_status: "healthy" | "degraded" | "critical";
  };
  governance: {
    active_constraints: number;
    violations_today: number;
  };
}

export default function PhaseDashboard() {
  const { phaseDashboardOpen, setPhaseDashboardOpen } = useUIState();
  const [phases, setPhases] = useState<PhaseMetrics[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!phaseDashboardOpen || !firestore) return;

    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        // Fetch phases
        const phasesSnapshot = await getDocs(
          query(collection(firestore, "system_phases"), orderBy("id", "asc"))
        );
        const phasesData = phasesSnapshot.docs.map((doc) => ({
          phase_id: doc.data().id,
          status: doc.data().status,
          telemetry: doc.data().telemetry,
        }));
        setPhases(phasesData);

        // Fetch system metrics (these would be in separate collections)
        // For now, simulate data
        setSystemMetrics({
          federation: {
            connected_systems: 3,
            active_federations: ["system-a", "system-b", "system-c"],
          },
          selfheal: {
            recovery_events: 12,
            last_recovery: new Date().toISOString(),
            health_status: "healthy",
          },
          governance: {
            active_constraints: 8,
            violations_today: 0,
          },
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [phaseDashboardOpen]);

  if (!phaseDashboardOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
        onClick={() => setPhaseDashboardOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-black border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-white/90" />
              <h2 className="text-xl font-semibold text-white tracking-tight">Phase Dashboard</h2>
            </div>
            <button
              onClick={() => setPhaseDashboardOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Phase Status Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 tracking-tight">Phase Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {phases.slice(0, 14).map((phase) => {
                      const isActive = ["Active", "Running", "Live", "Deployed"].includes(phase.status);
                      return (
                        <motion.div
                          key={phase.phase_id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: phase.phase_id * 0.05 }}
                          className={`p-4 rounded-lg border ${
                            isActive
                              ? "border-white/20 bg-white/5"
                              : "border-white/10 bg-black"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-white/60">
                              Phase {phase.phase_id}
                            </span>
                            {isActive && (
                              <motion.div
                                className="w-2 h-2 rounded-full bg-green-400"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                          </div>
                          <p className="text-xs text-white/80 font-medium truncate">
                            {phase.status}
                          </p>
                          {phase.telemetry && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <div className="text-xs text-white/60">
                                Health: {phase.telemetry.health_score || "N/A"}%
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* System Metrics */}
                {systemMetrics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Federation */}
                    <div className="p-4 rounded-lg border border-white/10 bg-black">
                      <div className="flex items-center gap-2 mb-3">
                        <Network className="w-4 h-4 text-white/70" />
                        <h4 className="text-sm font-semibold text-white">Federation (Phase 9)</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-white">
                          {systemMetrics.federation.connected_systems}
                        </div>
                        <div className="text-xs text-white/60">Connected Systems</div>
                        <div className="text-xs text-white/50">
                          {systemMetrics.federation.active_federations.join(", ")}
                        </div>
                      </div>
                    </div>

                    {/* Self-Healing */}
                    <div className="p-4 rounded-lg border border-white/10 bg-black">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-white/70" />
                        <h4 className="text-sm font-semibold text-white">Self-Healing (Phase 7)</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-white">
                          {systemMetrics.selfheal.recovery_events}
                        </div>
                        <div className="text-xs text-white/60">Recovery Events</div>
                        <div
                          className={`text-xs font-medium ${
                            systemMetrics.selfheal.health_status === "healthy"
                              ? "text-green-400"
                              : systemMetrics.selfheal.health_status === "degraded"
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          Status: {systemMetrics.selfheal.health_status}
                        </div>
                      </div>
                    </div>

                    {/* Governance */}
                    <div className="p-4 rounded-lg border border-white/10 bg-black">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-white/70" />
                        <h4 className="text-sm font-semibold text-white">Governance (Phase 11)</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-white">
                          {systemMetrics.governance.active_constraints}
                        </div>
                        <div className="text-xs text-white/60">Active Constraints</div>
                        <div className="text-xs text-white/50">
                          Violations Today: {systemMetrics.governance.violations_today}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phase 10 Orchestration Map */}
                <div className="p-4 rounded-lg border border-white/10 bg-black">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-white/70" />
                    <h4 className="text-sm font-semibold text-white">Orchestration (Phase 10)</h4>
                  </div>
                  <div className="text-sm text-white/60">
                    Real-time subsystem map visualization would appear here.
                    <br />
                    <span className="text-xs text-white/40">
                      (Integration with Phase 10 telemetry pending)
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

