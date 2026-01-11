"use client";

import React, { useEffect, useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorkspace, setActiveWorkspace } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WorkspacesPage() {
  const { user, isLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = useState<Array<{ workspaceId: string; name: string; role: string }>>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const wsCol = collection(firestore, "users", user.uid, "workspaces");
    const unsub = onSnapshot(wsCol, (snap) => {
      const items = snap.docs.map((d) => d.data() as any);
      setWorkspaces(
        items.map((d) => ({
          workspaceId: d.workspaceId || d.id,
          name: d.name || "Workspace",
          role: d.role || "member",
        }))
      );
    });
    return () => unsub();
  }, [user?.uid, firestore]);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const token = await user.getIdToken();
      await createWorkspace(token, name);
      setName("");
      toast({ title: "Workspace created" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e?.message || "Could not create workspace." });
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = async (workspaceId: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    await setActiveWorkspace(token, workspaceId);
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Workspaces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch context, invite members, and manage access.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/30 p-5 space-y-3">
        <div className="text-sm font-semibold text-foreground">Create workspace</div>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" />
          <Button onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspaces.map((w) => (
          <button
            key={w.workspaceId}
            onClick={() => handleOpen(w.workspaceId)}
            className="text-left rounded-xl border border-border bg-card/30 hover:bg-card/40 transition-colors p-5"
          >
            <div className="text-sm font-semibold text-foreground">{w.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">Role: {w.role}</div>
          </button>
        ))}
        {workspaces.length === 0 ? (
          <div className="text-sm text-muted-foreground">No workspaces found.</div>
        ) : null}
      </div>
    </div>
  );
}


