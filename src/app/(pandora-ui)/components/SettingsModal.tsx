"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Settings as SettingsIcon, Palette, CreditCard, HelpCircle, Shield, LogOut, Moon, Sun, Languages, Volume2 } from "lucide-react";
import { useUIState } from "./useUIState";
import { useSettings } from "./useSettings";
import { useState } from "react";
import { useAuth } from "@/firebase";
import { useRouter } from "next/navigation";

type TabValue = "general" | "personalization" | "billing" | "help" | "security" | "logout";

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen } = useUIState();
  const { theme, setTheme, model, setModel, voiceEnabled, toggleVoice } = useSettings();
  const { signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>("general");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
      setSettingsOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!settingsOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
        onClick={() => setSettingsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-black border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-white/90" />
              <h2 className="text-xl font-semibold text-white tracking-tight">Settings</h2>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-black">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "general"
                  ? "text-white border-b-2 border-white/20"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> General
            </button>
            <button
              onClick={() => setActiveTab("personalization")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "personalization"
                  ? "text-white border-b-2 border-white/20"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              <Palette className="w-4 h-4" /> Personalization
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "billing"
                  ? "text-white border-b-2 border-white/20"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              <CreditCard className="w-4 h-4" /> Billing
            </button>
            <button
              onClick={() => setActiveTab("help")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "help"
                  ? "text-white border-b-2 border-white/20"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Help
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "security"
                  ? "text-white border-b-2 border-white/20"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              <Shield className="w-4 h-4" /> Security
            </button>
            <button
              onClick={() => setActiveTab("logout")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "logout"
                  ? "text-red-400 border-b-2 border-red-400/20"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Theme</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        theme === "dark"
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-white/10 bg-black text-white/70 hover:text-white"
                      }`}
                    >
                      <Moon className="w-4 h-4" /> Dark
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        theme === "light"
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-white/10 bg-black text-white/70 hover:text-white"
                      }`}
                    >
                      <Sun className="w-4 h-4" /> Light
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Language</label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-black text-white/90 focus:outline-none focus:border-white/20"
                    defaultValue="en"
                  >
                    <option value="en" className="bg-black">English</option>
                    <option value="es" className="bg-black">Español</option>
                    <option value="fr" className="bg-black">Français</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Sound</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleVoice}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        voiceEnabled
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-white/10 bg-black text-white/70 hover:text-white"
                      }`}
                    >
                      <Volume2 className="w-4 h-4" /> {voiceEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "personalization" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Accent Color</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { name: "Cyan", gradient: "from-cyan-400 to-blue-500" },
                      { name: "Violet", gradient: "from-violet-400 to-purple-500" },
                      { name: "Emerald", gradient: "from-emerald-400 to-teal-500" },
                      { name: "Rose", gradient: "from-rose-400 to-pink-500" },
                    ].map((color) => (
                      <button
                        key={color.name}
                        className="h-12 rounded-lg bg-gradient-to-br border border-white/10 hover:border-white/20 transition-colors"
                        style={{
                          background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-white/10 bg-black">
                  <h3 className="text-sm font-semibold text-white mb-2">Subscription</h3>
                  <p className="text-sm text-white/60">Free Tier</p>
                  <p className="text-xs text-white/40 mt-1">Usage tracking and billing information coming soon.</p>
                </div>
              </div>
            )}

            {activeTab === "help" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-white/10 bg-black">
                  <h3 className="text-sm font-semibold text-white mb-2">Documentation</h3>
                  <p className="text-sm text-white/60 mb-4">Visit our docs for guides and API reference.</p>
                  <a
                    href="#"
                    className="text-sm text-white/80 hover:text-white underline"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open("https://docs.pandorasbox.ai", "_blank");
                    }}
                  >
                    Open Documentation →
                  </a>
                </div>
                <div className="p-4 rounded-lg border border-white/10 bg-black">
                  <h3 className="text-sm font-semibold text-white mb-2">Support</h3>
                  <p className="text-sm text-white/60 mb-4">Need help? Contact our support team.</p>
                  <a
                    href="mailto:support@pandorasbox.ai"
                    className="text-sm text-white/80 hover:text-white underline"
                  >
                    support@pandorasbox.ai
                  </a>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-white/10 bg-black">
                  <h3 className="text-sm font-semibold text-white mb-2">API Keys</h3>
                  <p className="text-sm text-white/60 mb-4">Manage your API keys for external integrations.</p>
                  <button className="px-4 py-2 rounded-lg border border-white/10 bg-black text-white/90 hover:bg-white/10 transition-colors">
                    View API Keys →
                  </button>
                </div>
                <div className="p-4 rounded-lg border border-white/10 bg-black">
                  <h3 className="text-sm font-semibold text-white mb-2">Phase 11: Governance</h3>
                  <p className="text-xs text-white/40 mb-2">Read-only indicators from Ethical Governance framework.</p>
                  <div className="space-y-2">
                    <div className="text-xs text-white/60">Active Constraints: 8</div>
                    <div className="text-xs text-white/60">Violations Today: 0</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "logout" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-white/10 bg-black">
                  <h3 className="text-sm font-semibold text-white mb-2">Sign Out</h3>
                  <p className="text-sm text-white/60 mb-4">Are you sure you want to sign out?</p>
                  {showLogoutConfirm ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                      >
                        Yes, Sign Out
                      </button>
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        className="px-4 py-2 rounded-lg border border-white/10 bg-black text-white/90 hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

