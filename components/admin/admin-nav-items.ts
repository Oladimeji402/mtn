import { AlertTriangle, LayoutDashboard, RadioTower, Receipt, Settings, Users } from "lucide-react";

export const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/sims", label: "SIMs", icon: RadioTower },
  { href: "/admin/errors", label: "Errors", icon: AlertTriangle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
