"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Settings, Activity, GitGraph, MessageSquare, Plus, Search } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import PandoraBoxInteractive from "./PandoraBoxInteractive";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/firebase";
import { getUserThreads, createThread } from "@/app/actions";
import { Thread } from "@/lib/types";
import { useUIState } from "./useUIState";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { sidebarOpen, setSidebarOpen, setSettingsOpen, toggleSidebar } = useUIState();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load threads
  useEffect(() => {
    if (user?.uid && sidebarOpen) {
      setIsLoadingThreads(true);
      getUserThreads(user.uid)
        .then(setThreads)
        .catch(console.error)
        .finally(() => setIsLoadingThreads(false));
    }
  }, [user?.uid, sidebarOpen]);

  const handleNewChat = async () => {
    if (!user?.uid) return;
    try {
      const threadId = await createThread(user.uid);
      router.push("/");
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setSidebarOpen(false);
  };

  const filteredThreads = threads.filter((thread) =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed top-0 left-0 h-full w-[300px] bg-black border-r border-white/10 flex flex-col z-50"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Search Bar - ChatGPT style */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search or start chat"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black border border-white/10 rounded-lg text-white/90 placeholder-white/40 text-sm focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Recent Chats or Pandora Cube */}
                {threads.length > 0 ? (
                  <div className="space-y-1">
                    <h3 className="text-xs uppercase tracking-widest text-white/50 px-3 mb-2">
                      Recent Chats
                    </h3>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {filteredThreads.slice(0, 10).map((thread) => (
                        <button
                          key={thread.id}
                          className="w-full text-left px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors truncate"
                          onClick={() => handleNavigate("/")}
                          title={thread.title}
                        >
                          <MessageSquare className="w-3.5 h-3.5 inline mr-2 opacity-50" />
                          {thread.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <button
                      onClick={handleNewChat}
                      className="flex flex-col items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <PandoraBoxInteractive />
                      <span className="text-xs text-white/60">Start Chatting</span>
                    </button>
                  </div>
                )}

                {/* Navigation */}
                <div className="pt-4 border-t border-white/10 space-y-1">
                  <button 
                    className={`flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors ${
                      pathname === "/" 
                        ? "bg-white/10 text-white" 
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => handleNavigate("/")}
                  >
                    <Home className="w-4 h-4" /> Home
                  </button>
                  <button 
                    className={`flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors ${
                      pathname === "/graph" 
                        ? "bg-white/10 text-white" 
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => handleNavigate("/graph")}
                  >
                    <GitGraph className="w-4 h-4" /> Knowledge Graph
                  </button>
                  <button 
                    className={`flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors ${
                      pathname === "/settings" 
                        ? "bg-white/10 text-white" 
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => handleNavigate("/settings")}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button 
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white hover:bg-white/5 w-full px-3 py-2 rounded-lg transition-colors"
                    onClick={() => {
                      setSidebarOpen(false);
                      setSettingsOpen(true);
                    }}
                  >
                    <Activity className="w-4 h-4" /> Quick Settings
                  </button>
                </div>

                {/* New Chat Button */}
                {threads.length > 0 && (
                  <button
                    onClick={handleNewChat}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors mt-2"
                  >
                    <Plus className="w-4 h-4" /> New Chat
                  </button>
                )}
              </div>
            </div>
            <ProfileMenu />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
