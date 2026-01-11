export default function AdminOpsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Ops Dashboard</h1>
      <div className="glass-panel rounded-xl border border-white/10 p-4">
        <p className="text-sm text-white/70">
          Placeholder: p50/p95 latency, error rates, queue depth, cron status, usage caps.
        </p>
      </div>
    </div>
  );
}


