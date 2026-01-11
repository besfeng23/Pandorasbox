"use client";

import React from "react";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import { MemoryTable } from "@/components/settings/memory-table";
import { ReindexMemoriesButton } from "@/components/settings/reindex-memories-button";
import { Separator } from "@/components/ui/separator";

export default function MemoriesPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        Sign in to manage memories.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Memories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect, edit, and delete what Pandora remembers.
          </p>
        </div>
        <ReindexMemoriesButton userId={user.uid} />
      </div>

      <Separator />

      <div className="rounded-xl border border-border bg-card/30 p-5">
        <MemoryTable userId={user.uid} />
      </div>
    </div>
  );
}


