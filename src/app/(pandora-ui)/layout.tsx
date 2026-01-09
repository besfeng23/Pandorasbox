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

export default function PandoraUILayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <UIStateProvider>
        <SettingsProvider>
          <ResponsiveHandler onMobile={() => {}} />
          <div className="flex h-screen w-screen bg-black text-white overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1">
              <Topbar setOpen={() => {}} />
              <main className="flex-1 overflow-hidden">{children}</main>
            </div>
            <SettingsModal />
            <PhaseDashboard />
            <PandoraMenu />
          </div>
        </SettingsProvider>
      </UIStateProvider>
    </AuthGuard>
  );
}

