export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Admin Overview</h1>
        <div className="text-xs text-muted-foreground">Pandora Elite Admin</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card/30 p-4">
          <div className="text-xs text-muted-foreground">Users</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">—</div>
          <div className="mt-1 text-xs text-muted-foreground">Wire to Firestore counts later</div>
        </div>
        <div className="rounded-xl border border-border bg-card/30 p-4">
          <div className="text-xs text-muted-foreground">Workspaces</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">—</div>
          <div className="mt-1 text-xs text-muted-foreground">Wire to workspaces collection</div>
        </div>
        <div className="rounded-xl border border-border bg-card/30 p-4">
          <div className="text-xs text-muted-foreground">Error rate</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">—</div>
          <div className="mt-1 text-xs text-muted-foreground">Wire to logs/telemetry</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/30 p-4">
        <h2 className="text-sm font-semibold text-foreground">Next steps</h2>
        <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>Implement admin data sources (orgs/users/audit/logs)</li>
          <li>Enforce RBAC server-side for all admin APIs</li>
          <li>Add ops telemetry dashboards</li>
        </ul>
      </div>
    </div>
  );
}


