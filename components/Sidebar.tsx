"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Home, CreditCard, Repeat, Settings } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname() || "/";

  const items = [
    { href: "/", label: "Dashboard", icon: <Home size={18} /> },
    { href: "/accounts", label: "Accounts", icon: <CreditCard size={18} /> },
    { href: "/transactions", label: "Transactions", icon: <Repeat size={18} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="w-64 min-h-screen border-r border-sidebar-border bg-sidebar p-6 flex flex-col">
      <div className="mb-8">
        <div className="text-2xl font-semibold text-sidebar-primary-foreground">
          Finance Dashboard
        </div>
        <div className="text-sm text-sidebar-foreground/80 mt-1">Welcome back</div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors " +
                    (active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-muted/50")
                  }
                >
                  <span className="opacity-90 text-sidebar-foreground">{it.icon}</span>
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 text-xs text-sidebar-foreground/70">© 2026 Finance Dashboard</div>
    </aside>
  );
}
