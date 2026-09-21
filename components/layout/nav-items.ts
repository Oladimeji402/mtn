import { MtnLogoIcon } from "@/components/shared/mtn-logo-icon";
import {
  Bell,
  Database,
  History,
  House,
  LayoutDashboard,
  LifeBuoy,
  MoreHorizontal,
  Receipt,
  User,
  Wallet,
} from "lucide-react";

export const dashboardNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/data", label: "Buy Data", icon: MtnLogoIcon },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
];

export const mobilePrimaryNavItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/data", label: "Buy Data", icon: Database },
  { href: "/dashboard/transactions", label: "History", icon: History },
  { href: "/dashboard/more", label: "More", icon: MoreHorizontal },
];
