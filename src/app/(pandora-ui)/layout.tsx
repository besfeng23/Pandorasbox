"use client";
import React, { useState } from "react";
import Sidebar from "@/app/(pandora-ui)/components/Sidebar";
import Topbar from "@/app/(pandora-ui)/components/Topbar";

export default function PandoraUILayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen} />

      {/* Main content */}
      <div className="flex flex-col flex-1">
        <Topbar setOpen={setOpen} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

