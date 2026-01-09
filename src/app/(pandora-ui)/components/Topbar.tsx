"use client";
import React from "react";
import { Menu, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { createThread } from "@/app/actions";

export default function Topbar({ setOpen }: { setOpen: (o: boolean) => void }) {
  const router = useRouter();
  const { user } = useUser();

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
    <header className="flex items-center justify-between px-4 py-3 bg-black">
      <button 
        onClick={() => setOpen(true)} 
        className="text-white hover:text-white/80 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>
      <button 
        onClick={handleNewChat}
        className="text-white hover:text-white/80 transition-colors"
        aria-label="New chat"
      >
        <Plus className="w-5 h-5" />
      </button>
    </header>
  );
}

