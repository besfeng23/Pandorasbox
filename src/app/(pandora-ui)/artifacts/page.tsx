"use client";

import React from "react";
import { useUser } from "@/firebase";
import { ArtifactList } from "@/components/artifacts/artifact-list";
import { ArtifactViewer } from "@/components/artifacts/artifact-viewer";
import { useArtifactStore } from "@/store/artifacts";
import { Loader2 } from "lucide-react";

export default function ArtifactsPage() {
  const { user, isLoading } = useUser();
  const activeArtifactId = useArtifactStore((s) => s.activeArtifactId);

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
        Sign in to view artifacts.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Artifacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Files and code created by Pandora during your conversations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 h-[calc(100dvh-220px)] min-h-[520px]">
        <div className="rounded-xl border border-border glass-panel overflow-hidden">
          <ArtifactList userId={user.uid} />
        </div>
        <div className="rounded-xl border border-border glass-panel overflow-hidden">
          {activeArtifactId ? (
            <ArtifactViewer artifactId={activeArtifactId} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground glass-panel">
              <div className="text-center space-y-2">
                <p className="font-medium text-foreground">No artifact selected</p>
                <p className="text-xs">Select an artifact from the list to view its content</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


