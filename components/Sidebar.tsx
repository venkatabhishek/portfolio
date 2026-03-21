"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Home, CreditCard, Repeat, Settings, LogOut, Loader2 } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type User = {
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
};

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

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
        {loading ? (
          <div className="flex items-center gap-2 mt-1">
            <Loader2 className="w-3 h-3 animate-spin text-sidebar-foreground/80" />
            <div className="text-sm text-sidebar-foreground/80">Loading...</div>
          </div>
        ) : user ? (
          <div className="text-sm text-sidebar-foreground/80 mt-1 truncate">
            {user.user_metadata?.name || user.email}
          </div>
        ) : null}
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

      <div className="mt-6 pt-6 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 w-full text-sidebar-foreground hover:bg-muted/50 rounded-md transition-colors"
        >
          <LogOut size={18} className="opacity-90" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="mt-4 text-xs text-sidebar-foreground/70">© 2026 Finance Dashboard</div>
    </aside>
  );
}
