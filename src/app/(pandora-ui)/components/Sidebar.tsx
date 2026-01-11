"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Settings, Activity, GitGraph, MessageSquare, Plus, Search, Menu } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import PandoraBoxInteractive from "./PandoraBoxInteractive";
import { useRouter, usePathname } from "next/navigation";
import { useFirestore, useUser } from "@/firebase";
import { createThreadAuthed, getUserThreadsAuthed, setActiveWorkspace, createWorkspace, inviteWorkspaceMember } from "@/app/actions";
import type { Thread } from "@/lib/types";
import { useUIState } from "./useUIState";
import { useIsMobile } from "@/hooks/use-mobile";
import { collection, doc, onSnapshot } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, setSettingsOpen, toggleSidebar, toggleSidebarCollapsed } = useUIState();
  const isMobile = useIsMobile();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<Array<{ workspaceId: string; name: string; role: string }>>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const { toast } = useToast();

  // Load threads
  useEffect(() => {
    const shouldLoad = user && (isMobile ? sidebarOpen : true);
    if (shouldLoad) {
      setIsLoadingThreads(true);
      user
        .getIdToken()
        .then((token) => getUserThreadsAuthed(token))
        .then(setThreads)
        .catch(console.error)
        .finally(() => setIsLoadingThreads(false));
    }
  }, [user, sidebarOpen, isMobile, activeWorkspaceId]);

  // Subscribe to user-owned workspace index (allowed by existing rules)
  useEffect(() => {
    if (!user?.uid) return;
    const wsCol = collection(firestore, "users", user.uid, "workspaces");
    const unsub = onSnapshot(wsCol, (snap) => {
      const items = snap.docs.map((d) => d.data() as any);
      setWorkspaces(
        items.map((d) => ({
          workspaceId: d.workspaceId || d.id,
          name: d.name || "Workspace",
          role: d.role || "member",
        }))
      );
    });
    return () => unsub();
  }, [user?.uid, firestore]);

  // Subscribe to active workspace state
  useEffect(() => {
    if (!user?.uid) return;
    const wsStateRef = doc(firestore, "users", user.uid, "state", "workspace");
    const unsub = onSnapshot(wsStateRef, (snap) => {
      setActiveWorkspaceId((snap.data() as any)?.activeWorkspaceId ?? null);
    });
    return () => unsub();
  }, [user?.uid, firestore]);

  const handleNewChat = async () => {
    if (!user?.uid) return;
    try {
      const token = await user.getIdToken();
      const threadId = await createThreadAuthed(token);
      router.push(`/?threadId=${encodeURIComponent(threadId)}`);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setSidebarOpen(false);
  };

  const handleThreadSelect = (threadId: string) => {
    router.push(`/?threadId=${encodeURIComponent(threadId)}`);
    setSidebarOpen(false);
  };

  const activeWorkspace =
    workspaces.find((w) => w.workspaceId === activeWorkspaceId) || workspaces[0] || null;

  const handleSelectWorkspace = async (workspaceId: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    await setActiveWorkspace(token, workspaceId);
    setSidebarOpen(false);
    // reset to chat route; thread selection is workspace-specific
    router.push("/");
  };

  const handleCreateWorkspace = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    await createWorkspace(token, newWsName);
    setNewWsName("");
    setCreateWsOpen(false);
  };

  const handleInvite = async () => {
    if (!user || !activeWorkspace) return;
    try {
      const token = await user.getIdToken();
      await inviteWorkspaceMember(token, activeWorkspace.workspaceId, inviteEmail, inviteRole);
      toast({ title: "Invite sent", description: `${inviteEmail} can now access ${activeWorkspace.name}.` });
      setInviteEmail("");
      setInviteRole("member");
      setInviteOpen(false);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Invite failed",
        description: e?.message || "Could not invite member.",
      });
    }
  };

  const filteredThreads = threads.filter((thread) =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mobile hamburger button (video-like): shows when sidebar is closed.
  // Topbar is hidden on mobile; this is the primary entry point.
  const mobileHamburger = isMobile && !sidebarOpen ? (
    <button
      onClick={toggleSidebar}
      className="fixed z-50 left-3 top-[calc(env(safe-area-inset-top)+12px)] h-11 w-11 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
      aria-label="Open sidebar"
    >
      <Menu className="w-5 h-5 mx-auto" />
    </button>
  ) : null;

  return (
    <>
      {mobileHamburger}

      <Dialog open={createWsOpen} onOpenChange={setCreateWsOpen}>
        <DialogContent className="glass-panel-strong border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Create workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="Workspace name"
              className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateWsOpen(false)}
              className="bg-white/10 text-white hover:bg-white/15"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateWorkspace}
              className="bg-white/10 text-white hover:bg-white/15"
              disabled={!newWsName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="glass-panel-strong border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Invite member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
              <SelectTrigger className="bg-black/40 border-white/10 text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10 text-white">
                <SelectItem value="member" className="text-white">
                  Member
                </SelectItem>
                <SelectItem value="admin" className="text-white">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setInviteOpen(false)}
              className="bg-white/10 text-white hover:bg-white/15"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleInvite}
              className="bg-white/10 text-white hover:bg-white/15"
              disabled={!inviteEmail.trim() || !activeWorkspace}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Desktop persistent sidebar */}
      {!isMobile && (
        <aside
          className={[
            "hidden md:flex h-full flex-col border-r border-white/10 bg-black/40 backdrop-blur-md",
            sidebarCollapsed ? "w-[72px]" : "w-[280px]",
          ].join(" ")}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2">
                <PandoraBoxInteractive />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium text-white/80">Pandora</span>
                  <span className="text-[11px] text-white/50">
                    {activeWorkspace ? activeWorkspace.name : "Loading…"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-auto">
                <PandoraBoxInteractive />
              </div>
            )}
            <button
              onClick={toggleSidebarCollapsed}
              className="text-white/60 hover:text-white hover:bg-white/5 transition-colors rounded-lg p-2"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full text-left px-3 py-2 rounded-full bg-black/40 border border-purple-400/30 hover:border-purple-400/50 transition-colors">
                    <div className="text-xs text-white/60">Workspace</div>
                    <div className="text-sm text-white/90 truncate">
                      {activeWorkspace ? activeWorkspace.name : "Select workspace"}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-panel-strong border border-white/10 text-white">
                  {workspaces.map((w) => (
                    <DropdownMenuItem
                      key={w.workspaceId}
                      onSelect={() => handleSelectWorkspace(w.workspaceId)}
                      className="cursor-pointer"
                    >
                      {w.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onSelect={() => setInviteOpen(true)}
                    className="cursor-pointer"
                    disabled={!activeWorkspace}
                  >
                    Invite member…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setCreateWsOpen(true)}
                    className="cursor-pointer"
                  >
                    + Create workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search chats"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-purple-400/30 rounded-full text-white/90 placeholder-white/40 text-sm focus:outline-none focus:border-purple-400/50 transition-colors"
                />
              </div>

              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> New Chat
              </button>

              <div className="space-y-1">
                <h3 className="text-xs uppercase tracking-widest text-white/50 px-1 mb-2">
                  Recent Chats
                </h3>
                <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                  {isLoadingThreads ? (
                    <div className="text-xs text-white/40 px-2 py-2">Loading…</div>
                  ) : filteredThreads.length > 0 ? (
                    filteredThreads.slice(0, 30).map((thread) => (
                      <button
                        key={thread.id}
                        className="w-full text-left px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors truncate"
                        onClick={() => handleThreadSelect(thread.id)}
                        title={thread.title}
                      >
                        <MessageSquare className="w-3.5 h-3.5 inline mr-2 opacity-50" />
                        {thread.title}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-white/40 px-2 py-2">No recent chats.</div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-1">
                <button
                  className={`flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors ${
                    pathname === "/"
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                  onClick={() => handleNavigate("/")}
                >
                  <Home className="w-4 h-4" /> Chat
                </button>
                <button
                  className={`flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-colors ${
                    pathname === "/graph"
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                  onClick={() => handleNavigate("/graph")}
                >
                  <GitGraph className="w-4 h-4" /> Graph
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
                    setSettingsOpen(true);
                  }}
                >
                  <Activity className="w-4 h-4" /> Quick Settings
                </button>
              </div>
            </div>
          )}

          <div className="mt-auto">
            <ProfileMenu />
          </div>
        </aside>
      )}

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
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
        {isMobile && sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed top-0 left-0 h-full w-[300px] bg-black/90 backdrop-blur-md border-r border-white/10 flex flex-col z-50"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full text-left px-3 py-2 rounded-full bg-black/40 border border-purple-400/30 hover:border-purple-400/50 transition-colors">
                      <div className="text-xs text-white/60">Workspace</div>
                      <div className="text-sm text-white/90 truncate">
                        {activeWorkspace ? activeWorkspace.name : "Select workspace"}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-panel-strong border border-white/10 text-white">
                    {workspaces.map((w) => (
                      <DropdownMenuItem
                        key={w.workspaceId}
                        onSelect={() => handleSelectWorkspace(w.workspaceId)}
                        className="cursor-pointer"
                      >
                        {w.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      onSelect={() => setInviteOpen(true)}
                      className="cursor-pointer"
                      disabled={!activeWorkspace}
                    >
                      Invite member…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setCreateWsOpen(true)}
                      className="cursor-pointer"
                    >
                      + Create workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Search Bar - ChatGPT style */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search chats"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-purple-400/30 rounded-full text-white/90 placeholder-white/40 text-sm focus:outline-none focus:border-purple-400/50 transition-colors"
                  />
                </div>

                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> New Chat
                </button>

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
                          onClick={() => handleThreadSelect(thread.id)}
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
                {/* (Mobile) New chat button is always visible near the top, matching video. */}
              </div>
            </div>
            <ProfileMenu />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
