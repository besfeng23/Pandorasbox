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
              active ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"
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
      <aside className="hidden md:flex w-[280px] h-full flex-col border-r border-white/10 bg-black/40 backdrop-blur-md">
        <div className="px-4 py-3 border-b border-white/10">
          <div className="text-sm font-semibold text-white/90">Admin Cockpit</div>
          <div className="text-xs text-white/50">Digital Void</div>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
      </aside>

      {/* Mobile */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[300px] p-0 bg-black/90 backdrop-blur-md border-r border-white/10">
          <SheetHeader className="px-4 py-3 border-b border-white/10">
            <SheetTitle className="text-white">Admin Cockpit</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-56px)] overflow-y-auto">{nav}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}


