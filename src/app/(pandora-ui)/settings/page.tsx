"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useUser } from "@/firebase";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";

import { updateSettings, clearMemory, exportUserData, generateUserApiKey } from "@/app/actions";
import {
  seedIdentityProfileAuthed,
  triggerDeepResearchAuthed,
  triggerReflectionAuthed,
} from "@/app/actions/brain-actions";

import type { AppSettings } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { KnowledgeUpload } from "@/components/settings/knowledge-upload";
import { MemoryTable } from "@/components/settings/memory-table";
import { ReindexMemoriesButton } from "@/components/settings/reindex-memories-button";

type SettingsSection = "general" | "model" | "knowledge" | "memories" | "security" | "advanced";

const MODEL_OPTIONS: Array<{ value: AppSettings["active_model"]; label: string; helper: string }> = [
  { value: "gpt-4o", label: "Pandora Deep", helper: "Best reasoning + quality" },
  { value: "gpt-4-turbo", label: "Pandora Turbo", helper: "Balanced performance" },
  { value: "gpt-3.5-turbo", label: "Pandora Classic", helper: "Fast & efficient" },
];

export default function SettingsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { settings, isLoading: isSettingsLoading } = useSettings(user?.uid);
  const { toast } = useToast();

  const [section, setSection] = useState<SettingsSection>("general");
  const [isPending, startTransition] = useTransition();
  const [isKeyPending, startKeyTransition] = useTransition();
  const [isExportPending, startExportTransition] = useTransition();

  const [draft, setDraft] = useState<AppSettings>({
    active_model: "gpt-4o",
    reply_style: "detailed",
    system_prompt_override: "",
    personal_api_key: "",
  });

  // Local-only UX prefs
  const [fontSize, setFontSize] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("fontSize") || "medium";
    return "medium";
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("reducedMotion") === "true";
    return false;
  });

  const [hasCopiedKey, setHasCopiedKey] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setDraft({
      active_model: settings.active_model,
      reply_style: settings.reply_style,
      system_prompt_override: settings.system_prompt_override || "",
      personal_api_key: settings.personal_api_key || "",
    });
  }, [settings]);

  useEffect(() => {
    // Apply local preferences immediately
    const scale = fontSize === "small" ? "0.875" : fontSize === "large" ? "1.125" : "1";
    document.documentElement.style.setProperty("--font-size-scale", scale);
    if (reducedMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  }, [fontSize, reducedMotion]);

  const nav = useMemo(
    () =>
      [
        { id: "general" as const, label: "General", icon: SlidersHorizontal },
        { id: "model" as const, label: "Model", icon: Sparkles },
        { id: "knowledge" as const, label: "Knowledge", icon: Sparkles },
        { id: "memories" as const, label: "Memories", icon: Sparkles },
        { id: "security" as const, label: "Security & Data", icon: Shield },
        { id: "advanced" as const, label: "Advanced", icon: Sparkles },
      ] satisfies Array<{ id: SettingsSection; label: string; icon: any }>,
    []
  );

  const saveSettings = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append("idToken", token);
    formData.append("active_model", draft.active_model);
    formData.append("reply_style", draft.reply_style);
    formData.append("system_prompt_override", draft.system_prompt_override || "");

    startTransition(async () => {
      const result = await updateSettings(formData);
      if (result.success) {
        toast({ title: "Saved", description: result.message });
      } else {
        toast({ variant: "destructive", title: "Save failed", description: result.message });
      }
    });
  };

  const handleGenerateApiKey = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    startKeyTransition(async () => {
      const result = await generateUserApiKey(token);
      if (result.success && result.apiKey) {
        setDraft((d) => ({ ...d, personal_api_key: result.apiKey || "" }));
        toast({ title: "API key generated", description: "Stored in your settings." });
      } else {
        toast({ variant: "destructive", title: "Failed", description: result.message || "Could not generate key." });
      }
    });
  };

  const handleCopyKey = async () => {
    if (!draft.personal_api_key) return;
    await navigator.clipboard.writeText(draft.personal_api_key);
    setHasCopiedKey(true);
    setTimeout(() => setHasCopiedKey(false), 1000);
  };

  const handleExport = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    startExportTransition(async () => {
      const result = await exportUserData(token);
      if (!result.success || !result.data) {
        toast({ variant: "destructive", title: "Export failed", description: result.message || "Try again." });
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pandora-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Downloaded your data as JSON." });
    });
  };

  const handleClearAll = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const result = await clearMemory(token);
    if (result.success) {
      toast({ title: "Cleared", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Failed", description: result.message });
    }
  };

  const callBrainAction = async (action: "seed" | "reflect" | "research") => {
    if (!user) return;
    const token = await user.getIdToken();
    try {
      const result =
        action === "seed"
          ? await seedIdentityProfileAuthed(token)
          : action === "reflect"
            ? await triggerReflectionAuthed(token)
            : await triggerDeepResearchAuthed(token);
      toast({ title: result.success ? "Queued" : "Failed", description: result.message });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e?.message || "Could not trigger action." });
    }
  };

  if (isUserLoading || isSettingsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Premium defaults. You control the model, memory, and workspace security.
          </p>
        </div>
        <Button onClick={saveSettings} disabled={isPending || !user}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <aside className="md:sticky md:top-4 md:self-start">
          <div className="rounded-xl border border-border bg-card/30 p-2">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={[
                    "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6">
          {section === "general" ? (
            <div className="rounded-xl border border-border bg-card/30 p-5">
              <h2 className="text-sm font-semibold text-foreground">General</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                UI preferences are stored locally for instant responsiveness.
              </p>
              <Separator className="my-4" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Font size</div>
                  <div className="mt-2">
                    <Select value={fontSize} onValueChange={(v) => {
                      setFontSize(v);
                      localStorage.setItem("fontSize", v);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Reduced motion</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant={reducedMotion ? "secondary" : "outline"}
                      onClick={() => {
                        const next = !reducedMotion;
                        setReducedMotion(next);
                        localStorage.setItem("reducedMotion", String(next));
                      }}
                    >
                      {reducedMotion ? "On" : "Off"}
                    </Button>
                    <div className="text-xs text-muted-foreground">Calmer transitions and fewer animations.</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {section === "model" ? (
            <div className="rounded-xl border border-border bg-card/30 p-5 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Model</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tune the assistant’s behavior without breaking the core system.
                </p>
              </div>
              <Separator />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <div className="text-sm font-medium text-foreground">Active model</div>
                  <div className="mt-2">
                    <Select
                      value={draft.active_model}
                      onValueChange={(v) => setDraft((d) => ({ ...d, active_model: v as AppSettings["active_model"] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {MODEL_OPTIONS.find((m) => m.value === draft.active_model)?.helper}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Reply style</div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant={draft.reply_style === "concise" ? "secondary" : "outline"}
                      onClick={() => setDraft((d) => ({ ...d, reply_style: "concise" }))}
                    >
                      Concise
                    </Button>
                    <Button
                      type="button"
                      variant={draft.reply_style === "detailed" ? "secondary" : "outline"}
                      onClick={() => setDraft((d) => ({ ...d, reply_style: "detailed" }))}
                    >
                      Detailed
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Detailed is best for complex work; concise is best for fast iteration.
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-foreground">System prompt override</div>
                <div className="mt-2">
                  <Textarea
                    value={draft.system_prompt_override}
                    onChange={(e) => setDraft((d) => ({ ...d, system_prompt_override: e.target.value }))}
                    placeholder="Optional. Add instructions that always apply."
                    className="min-h-[140px]"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {section === "knowledge" ? (
            <div className="rounded-xl border border-border bg-card/30 p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Knowledge</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload sources and let Pandora build searchable context.
                </p>
              </div>
              <Separator />
              {user?.uid ? <KnowledgeUpload userId={user.uid} /> : null}
            </div>
          ) : null}

          {section === "memories" ? (
            <div className="rounded-xl border border-border bg-card/30 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Memories</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Inspect, edit, and delete what Pandora remembers.</p>
                </div>
                {user?.uid ? <ReindexMemoriesButton userId={user.uid} /> : null}
              </div>
              <Separator />
              {user?.uid ? <MemoryTable userId={user.uid} /> : null}
            </div>
          ) : null}

          {section === "security" ? (
            <div className="rounded-xl border border-border bg-card/30 p-5 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Security & Data</h2>
                <p className="mt-1 text-sm text-muted-foreground">API keys, exports, and destructive actions.</p>
              </div>
              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Personal API key</div>
                    <div className="text-xs text-muted-foreground">
                      Used for integrations. Keep it secret.
                    </div>
                  </div>
                  <Button onClick={handleGenerateApiKey} disabled={isKeyPending || !user}>
                    {isKeyPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Generate
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input value={draft.personal_api_key || ""} readOnly placeholder="No key generated yet" />
                  <Button variant="outline" onClick={handleCopyKey} disabled={!draft.personal_api_key}>
                    {hasCopiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Export data</div>
                  <div className="text-xs text-muted-foreground">Downloads a JSON snapshot of your data.</div>
                </div>
                <Button variant="outline" onClick={handleExport} disabled={isExportPending || !user}>
                  {isExportPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export
                </Button>
              </div>

              <Separator />

              <div className="rounded-lg border border-destructive/30 bg-background/40 p-4 glass-panel">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Danger zone</div>
                    <div className="text-xs text-muted-foreground">This permanently deletes your data. This action cannot be undone.</div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="neon-glow-purple">
                        <Trash2 className="h-4 w-4" />
                        Clear all data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-panel-strong border border-destructive/30">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">Clear all data?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          This will permanently delete:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>All threads and messages</li>
                            <li>All memories</li>
                            <li>All artifacts</li>
                            <li>All workspace state</li>
                            <li>All knowledge base files</li>
                          </ul>
                          <strong className="text-destructive block mt-3">This action cannot be undone.</strong>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleClearAll}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Yes, delete everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ) : null}

          {section === "advanced" ? (
            <div className="rounded-xl border border-border bg-card/30 p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Advanced</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Power tools. These actions are queued and may take time.
                </p>
              </div>
              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" onClick={() => callBrainAction("seed")} disabled={!user}>
                  Seed identity
                </Button>
                <Button variant="outline" onClick={() => callBrainAction("reflect")} disabled={!user}>
                  Trigger reflection
                </Button>
                <Button variant="outline" onClick={() => callBrainAction("research")} disabled={!user}>
                  Deep research
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                These actions are logged and can be monitored in Ops later.
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}


