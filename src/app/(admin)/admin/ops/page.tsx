export default function AdminOpsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Ops Dashboard</h1>
      <div className="rounded-xl border border-border bg-card/30 p-4">
        <p className="text-sm text-muted-foreground">
          Placeholder: p50/p95 latency, error rates, queue depth, cron status, usage caps.
        </p>
      </div>
    </div>
  );
}


