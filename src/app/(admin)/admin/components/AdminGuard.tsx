"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@/firebase";
import Link from "next/link";
import { Loader2, ShieldAlert } from "lucide-react";

type PlatformRole = "none" | "support" | "superadmin";

function normalizeEmailList(raw: string | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const [role, setRole] = useState<PlatformRole>("none");
  const [roleLoading, setRoleLoading] = useState(true);

  const bootstrapEmails = useMemo(
    () => normalizeEmailList(process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAILS),
    []
  );

  const isBootstrapAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return !!email && bootstrapEmails.includes(email);
  }, [user?.email, bootstrapEmails]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setRole("none");
        setRoleLoading(false);
        return;
      }
      setRoleLoading(true);
      try {
        const tokenResult = await user.getIdTokenResult();
        if (cancelled) return;
        const pr = (tokenResult.claims?.platformRole as PlatformRole | undefined) || "none";
        setRole(pr);
      } catch {
        if (!cancelled) setRole("none");
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isLoading || roleLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allowed = role === "support" || role === "superadmin" || isBootstrapAdmin;
  if (!allowed) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card/30 p-6 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don&apos;t have permission to access the admin cockpit.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors px-4 py-2 text-sm text-foreground"
            >
              Return to app
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


