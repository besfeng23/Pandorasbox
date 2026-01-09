"use client";
import React, { useState } from "react";
import Sidebar from "@/app/(pandora-ui)/components/Sidebar";
import Topbar from "@/app/(pandora-ui)/components/Topbar";
import SettingsDrawer from "@/app/(pandora-ui)/components/SettingsDrawer";
import { SettingsProvider } from "@/app/(pandora-ui)/components/useSettings";
import ResponsiveHandler from "@/app/(pandora-ui)/components/ResponsiveHandler";

export default function PandoraUILayout({ children }: { children: React.ReactNode }) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [mobile, setMobile] = useState(false);

  return (
    <SettingsProvider>
      <ResponsiveHandler onMobile={setMobile} />
      <div className="flex h-screen w-screen bg-black text-white overflow-hidden">
        <Sidebar open={openSidebar} setOpen={setOpenSidebar} onOpenSettings={() => setOpenSettings(true)} />
        <div className="flex flex-col flex-1">
          <Topbar setOpen={setOpenSidebar} />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
        <SettingsDrawer open={openSettings} setOpen={setOpenSettings} />
      </div>
    </SettingsProvider>
  );
}

