import {
  Bell,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  Smartphone,
  User,
  Wallet,
  Wifi,
} from "lucide-react";

export const dashboardNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/airtime", label: "Buy Airtime", icon: Smartphone },
  { href: "/dashboard/data", label: "Buy Data", icon: Wifi },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
];

export const mobilePrimaryNavItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/airtime", label: "Airtime", icon: Smartphone },
  { href: "/dashboard/data", label: "Data", icon: Wifi },
];
