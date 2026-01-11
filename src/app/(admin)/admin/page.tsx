export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Admin Overview</h1>
        <div className="text-xs text-white/50">Digital Void SaaS/Admin Cockpit</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl border border-white/10 p-4">
          <div className="text-xs text-white/50">Users</div>
          <div className="mt-2 text-2xl font-semibold text-white">—</div>
          <div className="mt-1 text-xs text-white/40">Wire to Firestore counts later</div>
        </div>
        <div className="glass-panel rounded-xl border border-white/10 p-4">
          <div className="text-xs text-white/50">Workspaces</div>
          <div className="mt-2 text-2xl font-semibold text-white">—</div>
          <div className="mt-1 text-xs text-white/40">Wire to workspaces collection</div>
        </div>
        <div className="glass-panel rounded-xl border border-white/10 p-4">
          <div className="text-xs text-white/50">Error rate</div>
          <div className="mt-2 text-2xl font-semibold text-white">—</div>
          <div className="mt-1 text-xs text-white/40">Wire to logs/telemetry</div>
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-white/10 p-4">
        <h2 className="text-sm font-semibold text-white">Next steps</h2>
        <ul className="mt-2 text-sm text-white/70 list-disc pl-5 space-y-1">
          <li>Implement admin data sources (orgs/users/audit/logs)</li>
          <li>Enforce RBAC server-side for all admin APIs</li>
          <li>Add ops telemetry dashboards</li>
        </ul>
      </div>
    </div>
  );
}


