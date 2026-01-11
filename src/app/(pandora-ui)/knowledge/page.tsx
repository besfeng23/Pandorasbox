"use client";

import React from "react";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import { KnowledgeUpload } from "@/components/settings/knowledge-upload";

export default function KnowledgePage() {
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
        Sign in to manage knowledge.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload documents and let Pandora build searchable context.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/30 p-5">
        <KnowledgeUpload userId={user.uid} />
      </div>
    </div>
  );
}


