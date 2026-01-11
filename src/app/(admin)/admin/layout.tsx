"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminGuard } from "./components/AdminGuard";
import { AdminSidebar } from "./components/AdminSidebar";
import { AdminTopbar } from "./components/AdminTopbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <AuthGuard>
      <AdminGuard>
        <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
          <AdminSidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
          <div className="flex flex-col flex-1 min-w-0">
            <AdminTopbar onOpenSidebar={() => setMobileNavOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}


