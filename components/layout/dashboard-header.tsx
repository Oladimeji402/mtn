"use client";

import Link from "next/link";
import { Bell, LifeBuoy, LogOut, Receipt, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/layout/logo";

export function DashboardHeader({
  username,
  unreadCount,
}: {
  username: string;
  unreadCount: number;
}) {
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b border-transparent bg-gradient-to-br from-brand to-amber-500 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:h-16 sm:border-border sm:bg-background/95 sm:bg-none sm:px-6 sm:pt-0 lg:sticky lg:left-auto lg:right-auto"
    >
      {/* Greeting — always visible on mobile, hidden on sm+ */}
      <p className="truncate text-base font-semibold text-brand-foreground sm:hidden">
        Hi, {username}
      </p>

      {/* Logo — hidden on mobile (greeting takes its place), visible on sm+ */}
      <div className="hidden sm:block lg:hidden">
        <Logo href="/dashboard" className="min-h-11" />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative size-11 text-brand-foreground hover:bg-white/25 hover:text-brand-foreground sm:size-10 sm:text-foreground sm:hover:bg-accent sm:hover:text-foreground"
          asChild
        >
          <Link href="/dashboard/notifications" aria-label="Notifications">
            <Bell className="size-[19px] sm:size-4.5" />
            {unreadCount > 0 ? (
              <span className="absolute right-2 top-2 flex size-2 rounded-full bg-destructive sm:right-1.5 sm:top-1.5" />
            ) : null}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex sm:size-auto">
              <Avatar className="size-9 sm:size-8">
                <AvatarFallback className="bg-secondary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">@{username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/transactions">
                <Receipt className="size-4" />
                Transactions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/support">
                <LifeBuoy className="size-4" />
                Support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild variant="destructive">
              <Link href="/login">
                <LogOut className="size-4" />
                Logout
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
