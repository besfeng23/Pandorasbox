"use client";
import React from "react";
import { Menu, Plus, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { createThreadAuthed } from "@/app/actions";
import { useUIState } from "./useUIState";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

export default function Topbar({ setOpen }: { setOpen: (o: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { sidebarOpen, setSidebarOpen, toggleSidebarCollapsed } = useUIState();
  const isMobile = useIsMobile();

  const handleNewChat = async () => {
    if (user?.uid) {
      try {
        const token = await user.getIdToken();
        const threadId = await createThreadAuthed(token);
        router.push(`/?threadId=${encodeURIComponent(threadId)}`);
      } catch (error) {
        console.error("Failed to create thread:", error);
      }
    }
  };

  const handleMenuClick = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      toggleSidebarCollapsed();
    }
  };

  const title =
    pathname === "/settings"
      ? "Settings"
      : pathname === "/graph"
        ? "Graph"
        : pathname === "/workspaces"
          ? "Workspaces"
          : pathname === "/knowledge"
            ? "Knowledge"
            : pathname === "/memories"
              ? "Memories"
              : pathname === "/artifacts"
                ? "Artifacts"
                : "Chat";

  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/60 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleMenuClick}
        aria-label="Open navigation"
        className="md:hidden hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium gradient-text-cyan truncate">{title}</div>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-9 rounded-full bg-muted/40 border border-border px-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-all"
            placeholder="Search… (Cmd+K)"
          />
        </div>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleNewChat} 
        aria-label="New chat"
        className="hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <Plus className="w-5 h-5" />
      </Button>
    </header>
  );
}

