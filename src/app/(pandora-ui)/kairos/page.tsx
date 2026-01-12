"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/firebase";
import { Loader2, CheckCircle2, Clock, Circle, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface KairosStatus {
  overall: {
    completion: number;
  };
  modules: Array<{
    id: string;
    name: string;
    status: "Done" | "In Progress" | "Planned";
    percentComplete: number;
  }>;
  phases: Array<{
    id: number;
    name: string;
    status: "Done" | "In Progress" | "Planned";
    percentComplete: number;
  }>;
  topRisks: Array<{
    severity: string;
    description: string;
  }>;
  topNextActions: Array<{
    description: string;
  }>;
}

export default function KairosPage() {
  const { user, isLoading } = useUser();
  const [status, setStatus] = useState<KairosStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/kairos/status");
        if (response.ok) {
          const data = await response.json();
          setStatus({
            overall: { completion: data.overall?.percentComplete || 0 },
            modules: (data.modules || []).map((m: any) => ({
              id: m.id || m.name,
              name: m.name || m.title,
              status: m.status,
              percentComplete: m.percentComplete || 0,
            })),
            phases: (data.phases || []).map((p: any) => ({
              id: p.id,
              name: p.title || p.name,
              status: p.status,
              percentComplete: p.percentComplete || 0,
            })),
            topRisks: data.topRisks || [],
            topNextActions: data.topNextActions || [],
          });
        }
      } catch (error) {
        console.error("Failed to load Kairos status:", error);
      } finally {
        setIsLoadingStatus(false);
      }
    };
    loadStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Done":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "In Progress":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return "bg-primary/20 text-primary border-primary/30";
      case "In Progress":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (isLoading || isLoadingStatus) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        Sign in to view Kairos status.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold gradient-text-cyan">Kairos Control Tower</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Repository status and progress tracking dashboard.
        </p>
      </div>

      {/* Overall Status */}
      {status && (
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Overall Completion
            </CardTitle>
            <CardDescription>System-wide progress indicator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-semibold text-primary">
                  {status.overall.completion}%
                </span>
              </div>
              <Progress value={status.overall.completion} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modules */}
      {status && status.modules.length > 0 && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Modules</CardTitle>
            <CardDescription>Component completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.modules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getStatusIcon(module.status)}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {module.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {module.percentComplete}% complete
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(module.status)}>
                    {module.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phases */}
      {status && status.phases.length > 0 && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Phases</CardTitle>
            <CardDescription>Implementation phase progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.phases.map((phase) => (
                <div
                  key={phase.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getStatusIcon(phase.status)}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        Phase {phase.id}: {phase.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {phase.percentComplete}% complete
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(phase.status)}>
                    {phase.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Risks */}
      {status && status.topRisks.length > 0 && (
        <Card className="glass-panel border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Top Risks
            </CardTitle>
            <CardDescription>Issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.topRisks.map((risk, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={
                        risk.severity === "high"
                          ? "border-destructive text-destructive"
                          : "border-yellow-500 text-yellow-500"
                      }
                    >
                      {risk.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{risk.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Actions */}
      {status && status.topNextActions.length > 0 && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
            <CardDescription>Recommended next steps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.topNextActions.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/30"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-foreground flex-1">{action.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!status && (
        <Card className="glass-panel">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Status data not available. Run <code className="text-xs bg-muted px-2 py-1 rounded">npm run docs:status</code> to generate.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

