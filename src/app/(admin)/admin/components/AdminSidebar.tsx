"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "./admin-nav";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function AdminSidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  const nav = (
    <nav className="p-3 space-y-1">
      {ADMIN_NAV.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
            onClick={() => onMobileOpenChange(false)}
          >
            <Icon className="h-4 w-4 opacity-80" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-[280px] h-full flex-col border-r border-border bg-background/70">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Admin Cockpit</div>
          <div className="text-xs text-muted-foreground">Pandora Elite</div>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
      </aside>

      {/* Mobile */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[320px] p-0 bg-background border-r border-border">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-foreground">Admin Cockpit</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-56px)] overflow-y-auto">{nav}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}


