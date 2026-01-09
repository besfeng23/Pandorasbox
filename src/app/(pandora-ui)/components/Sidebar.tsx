"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Settings, Activity, GitGraph, MessageSquare, Plus } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import PandoraBoxInteractive from "./PandoraBoxInteractive";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/firebase";
import { getUserThreads, createThread } from "@/app/actions";
import { Thread } from "@/lib/types";

export default function Sidebar({ 
  open, 
  setOpen, 
  onOpenSettings 
}: { 
  open: boolean; 
  setOpen: (o: boolean) => void;
  onOpenSettings?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Load threads
  useEffect(() => {
    if (user?.uid && open) {
      setIsLoadingThreads(true);
      getUserThreads(user.uid)
        .then(setThreads)
        .catch(console.error)
        .finally(() => setIsLoadingThreads(false));
    }
  }, [user?.uid, open]);

  const handleNewChat = async () => {
    if (!user?.uid) return;
    try {
      const threadId = await createThread(user.uid);
      router.push("/(pandora-ui)");
      setOpen(false);
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 h-full w-60 bg-[#0a0a0a] border-r border-white/10 flex flex-col z-50"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <PandoraBoxInteractive />
                </div>
                
                {/* Navigation */}
                <div className="space-y-1">
                  <button 
                    className={`flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors ${
                      pathname === "/(pandora-ui)" 
                        ? "bg-violet-500/20 text-violet-400" 
                        : "text-white/70 hover:text-violet-400 hover:bg-white/5"
                    }`}
                    onClick={() => handleNavigate("/(pandora-ui)")}
                  >
                    <Home className="w-4 h-4" /> Home
                  </button>
                  <button 
                    className={`flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors ${
                      pathname === "/graph" 
                        ? "bg-violet-500/20 text-violet-400" 
                        : "text-white/70 hover:text-violet-400 hover:bg-white/5"
                    }`}
                    onClick={() => handleNavigate("/graph")}
                  >
                    <GitGraph className="w-4 h-4" /> Knowledge Graph
                  </button>
                  <button 
                    className={`flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors ${
                      pathname === "/settings" 
                        ? "bg-violet-500/20 text-violet-400" 
                        : "text-white/70 hover:text-violet-400 hover:bg-white/5"
                    }`}
                    onClick={() => handleNavigate("/settings")}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button 
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-violet-400 hover:bg-white/5 w-full px-3 py-2 rounded-lg transition-colors"
                    onClick={() => {
                      setOpen(false);
                      onOpenSettings?.();
                    }}
                  >
                    <Activity className="w-4 h-4" /> Quick Settings
                  </button>
                </div>

                {/* Threads Section */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs uppercase tracking-widest text-white/50 px-3">Threads</h3>
                    <button
                      onClick={handleNewChat}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                      title="New Chat"
                    >
                      <Plus className="w-3.5 h-3.5 text-white/70" />
                    </button>
                  </div>
                  
                  {isLoadingThreads ? (
                    <div className="px-3 py-2 text-xs text-white/40">Loading...</div>
                  ) : threads.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-white/40">No conversations yet</div>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {threads.slice(0, 10).map((thread) => (
                        <button
                          key={thread.id}
                          className="w-full text-left px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors truncate"
                          onClick={() => {
                            // TODO: Navigate to specific thread
                            handleNavigate("/(pandora-ui)");
                          }}
                          title={thread.title}
                        >
                          <MessageSquare className="w-3.5 h-3.5 inline mr-2 opacity-50" />
                          {thread.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ProfileMenu />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

