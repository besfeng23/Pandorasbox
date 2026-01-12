"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Home, Settings, GitGraph, MessageSquare, Plus, Search, Building2, Library, Database, Boxes } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { collection, doc, onSnapshot } from "firebase/firestore";

import { useFirestore, useUser } from "@/firebase";
import type { Thread } from "@/lib/types";
import {
  createThreadAuthed,
  createWorkspace,
  getUserThreadsAuthed,
  inviteWorkspaceMember,
  setActiveWorkspace,
} from "@/app/actions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUIState } from "./useUIState";
import { ThreadMenu } from "@/components/chat/thread-menu";
import { formatMessageTime } from "@/lib/utils";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import ProfileMenu from "./ProfileMenu";

function NavItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all relative",
        active 
          ? "bg-muted/60 text-foreground border border-primary/30 ring-1 ring-primary/10" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent",
      ].join(" ")}
    >
      {active && (
        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 pointer-events-none" />
      )}
      <Icon className={["h-4 w-4 relative z-10", active ? "text-primary" : ""].join(" ")} />
      <span className={["truncate relative z-10", active ? "font-medium" : ""].join(" ")}>{label}</span>
    </button>
  );
}

function SidebarBody({
  pathname,
  threads,
  isLoadingThreads,
  searchQuery,
  setSearchQuery,
  activeWorkspace,
  workspaces,
  onSelectWorkspace,
  onNewChat,
  onSelectThread,
  onNavigate,
  onOpenInvite,
  onOpenCreateWorkspace,
}: {
  pathname: string;
  threads: Thread[];
  isLoadingThreads: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  activeWorkspace: { workspaceId: string; name: string; role: string } | null;
  workspaces: Array<{ workspaceId: string; name: string; role: string }>;
  onSelectWorkspace: (workspaceId: string) => void;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onNavigate: (path: string) => void;
  onOpenInvite: () => void;
  onOpenCreateWorkspace: () => void;
}) {
  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, searchQuery]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold gradient-text-cyan">Pandora</div>
          <div className="text-xs text-muted-foreground">Elite</div>
        </div>

        <div className="mt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full text-left rounded-md border border-border bg-muted/30 px-3 py-2 hover:bg-muted/40 transition-colors">
                <div className="text-[11px] text-muted-foreground">Workspace</div>
                <div className="text-sm text-foreground truncate">
                  {activeWorkspace ? activeWorkspace.name : "Loading…"}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.workspaceId} onSelect={() => onSelectWorkspace(w.workspaceId)}>
                  {w.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={onOpenInvite} disabled={!activeWorkspace}>
                Invite member…
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenCreateWorkspace}>+ Create workspace</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button 
          onClick={onNewChat} 
          className="mt-3 w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 hover:border-primary/30 transition-all" 
          variant="outline"
        >
          <Plus className="h-4 w-4" /> New chat
        </Button>

        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats"
            className="pl-9 rounded-full bg-muted/30"
          />
        </div>
      </div>

      <div className="px-3">
        <Separator />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="px-2.5 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          Recent
        </div>
        {isLoadingThreads ? (
          <div className="px-2.5 py-2 text-sm text-muted-foreground">Loading…</div>
        ) : filteredThreads.length > 0 ? (
          <div className="space-y-1">
            {filteredThreads.slice(0, 50).map((t) => {
              const preview = threadPreviews[t.id];
              const lastActivityTime = preview?.lastActivity ? formatMessageTime(preview.lastActivity) : '';
              return (
              <div
                key={t.id}
                className="group relative w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <button
                  onClick={() => onSelectThread(t.id)}
                  className="flex-1 flex items-center gap-2 min-w-0"
                  title={t.title}
                >
                  <MessageSquare className="h-4 w-4 opacity-70 shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="truncate font-medium">{t.title || 'New Chat'}</div>
                    {preview?.preview && (
                      <div className="truncate text-xs text-muted-foreground/70 mt-0.5">
                        {preview.preview}
                      </div>
                    )}
                    {lastActivityTime && (
                      <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {lastActivityTime}
                      </div>
                    )}
                  </div>
                </button>
                {user?.uid && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <ThreadMenu
                      threadId={t.id}
                      userId={user.uid}
                      threadTitle={t.title}
                      pinned={t.pinned}
                      archived={t.archived}
                      onRename={() => {
                        // Refresh threads after rename
                        if (user) {
                          user.getIdToken().then((token) => getUserThreadsAuthed(token)).then(setThreads);
                        }
                      }}
                      onDeleted={() => {
                        // Refresh threads after delete
                        if (user) {
                          user.getIdToken().then((token) => getUserThreadsAuthed(token)).then(setThreads);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
            })}
          </div>
        ) : (
          <div className="px-2.5 py-2 text-sm text-muted-foreground">No chats yet.</div>
        )}
      </div>

      <div className="px-3 pb-3 space-y-2">
        <Separator />
        <NavItem active={pathname === "/"} icon={Home} label="Chat" onClick={() => onNavigate("/")} />
        <NavItem
          active={pathname === "/workspaces"}
          icon={Building2}
          label="Workspaces"
          onClick={() => onNavigate("/workspaces")}
        />
        <NavItem
          active={pathname === "/knowledge"}
          icon={Library}
          label="Knowledge"
          onClick={() => onNavigate("/knowledge")}
        />
        <NavItem
          active={pathname === "/memories"}
          icon={Database}
          label="Memories"
          onClick={() => onNavigate("/memories")}
        />
        <NavItem
          active={pathname === "/artifacts"}
          icon={Boxes}
          label="Artifacts"
          onClick={() => onNavigate("/artifacts")}
        />
        <NavItem active={pathname === "/graph"} icon={GitGraph} label="Graph" onClick={() => onNavigate("/graph")} />
        <NavItem active={pathname === "/settings"} icon={Settings} label="Settings" onClick={() => onNavigate("/settings")} />
        <div className="pt-2">
          <ProfileMenu />
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const isMobile = useIsMobile();
  const { sidebarOpen, setSidebarOpen } = useUIState();
  const { toast } = useToast();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<Array<{ workspaceId: string; name: string; role: string }>>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [threadPreviews, setThreadPreviews] = useState<Record<string, { preview: string; lastActivity: Date | null }>>({});

  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

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

  const activeWorkspace =
    workspaces.find((w) => w.workspaceId === activeWorkspaceId) || workspaces[0] || null;

  // Load threads (workspace-scoped server action)
  useEffect(() => {
    const shouldLoad = user && (isMobile ? sidebarOpen : true);
    if (!shouldLoad) return;
    setIsLoadingThreads(true);
    user
      .getIdToken()
      .then((token) => getUserThreadsAuthed(token))
      .then((loadedThreads) => {
        setThreads(loadedThreads);
        // Load previews for each thread
        if (user?.uid && firestore) {
          loadedThreads.forEach(async (thread) => {
            try {
              const historyQuery = query(
                collection(firestore, 'history'),
                where('threadId', '==', thread.id),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(1)
              );
              const snapshot = await getDocs(historyQuery);
              if (!snapshot.empty) {
                const lastMessage = snapshot.docs[0].data();
                const preview = lastMessage.content?.substring(0, 60) || '';
                const lastActivity = lastMessage.createdAt?.toDate() || null;
                setThreadPreviews(prev => ({
                  ...prev,
                  [thread.id]: { preview, lastActivity }
                }));
              }
            } catch (err) {
              console.warn(`Failed to load preview for thread ${thread.id}:`, err);
            }
          });
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingThreads(false));
  }, [user, isMobile, sidebarOpen, activeWorkspaceId, firestore]);

  const onNewChat = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const threadId = await createThreadAuthed(token);
    router.push(`/?threadId=${encodeURIComponent(threadId)}`);
    setSidebarOpen(false);
  };

  const onNavigate = (path: string) => {
    router.push(path);
    setSidebarOpen(false);
  };

  const onSelectThread = (threadId: string) => {
    router.push(`/?threadId=${encodeURIComponent(threadId)}`);
    setSidebarOpen(false);
  };

  const onSelectWorkspace = async (workspaceId: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    await setActiveWorkspace(token, workspaceId);
    setSidebarOpen(false);
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
      toast({
        title: "Invite sent",
        description: `${inviteEmail} can now access ${activeWorkspace.name}.`,
      });
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

  const content = (
    <SidebarBody
      pathname={pathname}
      threads={threads}
      isLoadingThreads={isLoadingThreads}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      activeWorkspace={activeWorkspace}
      workspaces={workspaces}
      onSelectWorkspace={onSelectWorkspace}
      onNewChat={onNewChat}
      onSelectThread={onSelectThread}
      onNavigate={onNavigate}
      onOpenInvite={() => setInviteOpen(true)}
      onOpenCreateWorkspace={() => setCreateWsOpen(true)}
    />
  );

  const { sidebarCollapsed, setSidebarCollapsed } = useUIState();

  return (
    <>
      {/* Desktop */}
      <aside className={[
        "hidden md:block h-screen border-r border-border bg-background/70 circuit-texture transition-all duration-300",
        sidebarCollapsed ? "w-0 overflow-hidden" : "w-[280px]"
      ].join(" ")}>
        {!sidebarCollapsed && content}
      </aside>

      {/* Mobile */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[320px] p-0">
          {content}
        </SheetContent>
      </Sheet>

      {/* Create workspace */}
      <Dialog open={createWsOpen} onOpenChange={setCreateWsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
          </DialogHeader>
          <Input value={newWsName} onChange={(e) => setNewWsName(e.target.value)} placeholder="Workspace name" />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCreateWsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateWorkspace} disabled={!newWsName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite member */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email address" />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleInvite} disabled={!inviteEmail.trim() || !activeWorkspace}>
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


