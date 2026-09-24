import { Database, History, House, MoreHorizontal } from "lucide-react";

export const mobilePrimaryNavItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/data", label: "Buy Data", icon: Database },
  { href: "/dashboard/transactions", label: "History", icon: History },
  { href: "/dashboard/more", label: "More", icon: MoreHorizontal },
];
