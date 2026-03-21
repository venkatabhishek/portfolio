'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Wallet, PiggyBank, House, Plus, Loader2 } from 'lucide-react';

type Account = {
  id: string;
  plaid_account_id: string;
  name: string;
  subtype: string;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  currency: string;
};

type Connection = {
  id: string;
  institution_name: string;
  accounts: Account[];
};

function formatCurrency(value: number | null, code = 'USD') {
  if (value === null) return '$0.00';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export default function DashboardPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => {
        if (data.connections) {
          setConnections(data.connections);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allAccounts = connections.flatMap((c) => c.accounts);
  const checkingSavings = allAccounts.filter((a) => /checking|savings/i.test(a.subtype || ''));
  const creditAccounts = allAccounts.filter((a) => /credit|loan/i.test(a.subtype || ''));

  const totalBalance = checkingSavings.reduce((s, a) => s + (a.current_balance || 0), 0);
  const creditUsed = creditAccounts.reduce((s, a) => s + Math.abs(a.current_balance || 0), 0);
  const totalAvailableCredit = creditAccounts.reduce((s, a) => s + (a.available_balance || 0), 0);

  const getAccountMeta = (subtype: string) => {
    const s = (subtype || '').toLowerCase();
    if (s.includes('savings')) {
      return { icon: <PiggyBank size={20} />, bg: 'bg-emerald-100', fg: 'text-emerald-700', border: 'border-emerald-300' };
    }
    if (s.includes('checking')) {
      return { icon: <House size={20} />, bg: 'bg-sky-100', fg: 'text-sky-700', border: 'border-sky-300' };
    }
    if (s.includes('credit') || s.includes('loan')) {
      return { icon: <CreditCard size={20} />, bg: 'bg-violet-100', fg: 'text-violet-700', border: 'border-violet-300' };
    }
    return { icon: <Wallet size={20} />, bg: 'bg-zinc-100', fg: 'text-zinc-800', border: 'border-zinc-300' };
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome! Connect your first account to get started.</p>
        </header>

        <div className="rounded-lg border border-dashed border-muted-foreground/50 p-12 text-center">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">No accounts connected</h2>
          <p className="text-muted-foreground mb-4">
            Connect your bank accounts to see your financial overview
          </p>
          <Link
            href="/accounts"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Connect Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s an overview of your accounts.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-card p-6 bg-card">
          <div className="text-sm text-muted-foreground">Total Balance</div>
          <div className="text-2xl font-bold mt-2">{formatCurrency(totalBalance)}</div>
          <div className="text-xs text-muted-foreground mt-2">Checking & Savings combined</div>
        </div>

        <div className="rounded-lg border border-card p-6 bg-card">
          <div className="text-sm text-muted-foreground">Credit Used</div>
          <div className="text-2xl font-bold mt-2">{formatCurrency(creditUsed)}</div>
          <div className="text-xs text-muted-foreground mt-2">Current balances on credit accounts</div>
        </div>

        <div className="rounded-lg border border-card p-6 bg-card">
          <div className="text-sm text-muted-foreground">Available Credit</div>
          <div className="text-2xl font-bold mt-2">{formatCurrency(totalAvailableCredit)}</div>
          <div className="text-xs text-muted-foreground mt-2">Sum of reported available credit</div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Your Accounts</h2>
          <Link
            href="/accounts"
            className="text-sm text-primary hover:underline"
          >
            Manage accounts
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn) =>
            conn.accounts.map((acc) => {
              const meta = getAccountMeta(acc.subtype || '');

              return (
                <div key={acc.id} className={`rounded-lg border-2 p-4 bg-card ${meta.border}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${meta.bg} ${meta.fg}`}>
                        {meta.icon}
                      </div>
                      <div>
                        <div className="font-semibold">{acc.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{acc.subtype}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground">Balance</div>
                    <div className="text-lg font-bold mt-1">{formatCurrency(acc.current_balance, acc.currency)}</div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-muted-foreground">
                        ****{acc.mask || acc.plaid_account_id.slice(-4)}
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {conn.institution_name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
