"use client";
import React from "react";
import Sidebar from "@/app/(pandora-ui)/components/Sidebar";
import Topbar from "@/app/(pandora-ui)/components/Topbar";
import SettingsModal from "@/app/(pandora-ui)/components/SettingsModal";
import PhaseDashboard from "@/app/(pandora-ui)/components/PhaseDashboard";
import PandoraMenu from "@/app/(pandora-ui)/components/PandoraMenu";
import { SettingsProvider } from "@/app/(pandora-ui)/components/useSettings";
import { UIStateProvider } from "@/app/(pandora-ui)/components/useUIState";
import ResponsiveHandler from "@/app/(pandora-ui)/components/ResponsiveHandler";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@/firebase";
import { ensureDefaultWorkspace } from "@/app/actions";

export default function PandoraUILayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <UIStateProvider>
        <SettingsProvider>
          <ResponsiveHandler onMobile={() => {}} />
          <PandoraShell>{children}</PandoraShell>
        </SettingsProvider>
      </UIStateProvider>
    </AuthGuard>
  );
}

function PandoraShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { user } = useUser();

  // Ensure every user has a default workspace and an active workspace selection.
  // This is done via server action so it works even before workspace rules are updated.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const token = await user.getIdToken();
      if (cancelled) return;
      await ensureDefaultWorkspace(token);
    })().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Video-aligned: hide topbar on mobile (only hamburger remains). */}
        {!isMobile && <Topbar setOpen={() => {}} />}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <SettingsModal />
      <PhaseDashboard />
      <PandoraMenu />
    </div>
  );
}

