"use client";
import React from "react";
import { Menu, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { createThread } from "@/app/actions";
import { useUIState } from "./useUIState";
import PhaseIndicator from "./PhaseIndicator";

export default function Topbar({ setOpen }: { setOpen: (o: boolean) => void }) {
  const router = useRouter();
  const { user } = useUser();
  const { toggleSidebar } = useUIState();

  const handleNewChat = async () => {
    if (user?.uid) {
      try {
        const threadId = await createThread(user.uid);
        router.push("/");
      } catch (error) {
        console.error("Failed to create thread:", error);
      }
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar} 
          className="text-white hover:text-white/80 transition-colors p-1.5 hover:bg-white/10 rounded-lg"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <PhaseIndicator />
      </div>
      <button 
        onClick={handleNewChat}
        className="text-white hover:text-white/80 transition-colors p-1.5 hover:bg-white/10 rounded-lg"
        aria-label="New chat"
      >
        <Plus className="w-5 h-5" />
      </button>
    </header>
  );
}

