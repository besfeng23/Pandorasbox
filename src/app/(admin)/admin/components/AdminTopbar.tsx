"use client";

import React from "react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminTopbar({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/60 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSidebar}
        className="md:hidden"
        aria-label="Open admin navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-full bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            placeholder="Search users, orgs, logs…"
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground hidden sm:block">
        {process.env.NODE_ENV === "production" ? "prod" : "dev"}
      </div>
    </header>
  );
}


