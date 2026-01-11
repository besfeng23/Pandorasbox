import {
  Activity,
  BadgeDollarSign,
  BookOpenCheck,
  Flag,
  LayoutDashboard,
  Shield,
  TerminalSquare,
  Users,
  Building2,
  Database,
  Scale,
} from "lucide-react";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orgs", label: "Orgs", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/support", label: "Support", icon: Shield },
  { href: "/admin/moderation", label: "Moderation", icon: Scale },
  { href: "/admin/billing", label: "Billing", icon: BadgeDollarSign },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: Flag },
  { href: "/admin/prompts", label: "Prompts", icon: BookOpenCheck },
  { href: "/admin/models", label: "Models", icon: Database },
  { href: "/admin/ops", label: "Ops", icon: Activity },
  { href: "/admin/logs", label: "Logs", icon: TerminalSquare },
  { href: "/admin/audit", label: "Audit", icon: Shield },
  { href: "/admin/data", label: "Data", icon: Database },
] as const;


