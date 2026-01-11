"use client";

import React from "react";
import { Menu, Search } from "lucide-react";

export function AdminTopbar({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <button
        onClick={onOpenSidebar}
        className="md:hidden h-11 w-11 rounded-full bg-black/30 border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Open admin navigation"
      >
        <Menu className="h-5 w-5 mx-auto" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-full bg-black/40 border border-purple-400/30 text-white/90 placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-400/50 transition-colors"
            placeholder="Search users, orgs, logs…"
          />
        </div>
      </div>

      <div className="text-xs text-white/50 hidden sm:block">
        {process.env.NODE_ENV === "production" ? "prod" : "dev"}
      </div>
    </header>
  );
}


