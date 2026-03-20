'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Wallet, PiggyBank, House } from 'lucide-react';

type Account = {
  account_id: string;
  name: string;
  subtype: string;
  balances: {
    current: number;
    available: number | null;
    iso_currency_code: string;
  };
};

function formatCurrency(value: number, code = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return `${value.toFixed(2)} ${code}`;
  }
}

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => setAccounts([]));
  }, []);

  const checkingSavings = accounts.filter((a) => /checking|savings/i.test(a.subtype));
  const creditAccounts = accounts.filter((a) => /credit/i.test(a.subtype));

  const totalBalance = checkingSavings.reduce((s, a) => s + (a.balances.current || 0), 0);

  const creditUsed = creditAccounts.reduce((s, a) => s + (a.balances.current || 0), 0);

  const totalAvailableCredit = creditAccounts.reduce((sum, a) => {
    const current = a.balances.current || 0;
    const available = typeof a.balances.available === 'number' ? a.balances.available : null;
    if (available !== null) return sum + available;
    const limit = (a as any).credit_limit ?? (a as any).limit ?? 0;
    if (limit) return sum + Math.max(0, limit - current);
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's an overview of your accounts.</p>
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
        <h2 className="text-xl font-semibold mb-3">Your Accounts</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts?.map((acc) => {
            const subtype = (acc.subtype || '').toLowerCase();

            const meta = (() => {
              if (subtype.includes('savings')) {
                return {
                  icon: <PiggyBank size={20} />,
                  bg: 'bg-emerald-100',
                  fg: 'text-emerald-700',
                  border: 'border-emerald-300',
                };
              }
              if (subtype.includes('checking')) {
                return {
                  icon: <House size={20} />,
                  bg: 'bg-sky-100',
                  fg: 'text-sky-700',
                  border: 'border-sky-300',
                };
              }
              if (subtype.includes('credit') || subtype.includes('credit card')) {
                return {
                  icon: <CreditCard size={20} />,
                  bg: 'bg-violet-100',
                  fg: 'text-violet-700',
                  border: 'border-violet-300',
                };
              }
              return {
                icon: <Wallet size={20} />,
                bg: 'bg-zinc-100',
                fg: 'text-zinc-800',
                border: 'border-zinc-300',
              };
            })();

            return (
              <div key={acc.account_id} className={`rounded-lg border-2 p-4 bg-card ${meta.border}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${meta.bg} ${meta.fg}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{acc.name}</div>
                      <div className="text-xs text-muted-foreground">{acc.subtype}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{acc.subtype}</div>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-muted-foreground">Available Balance</div>
                  <div className="text-lg font-bold mt-1">{formatCurrency(acc.balances.current, acc.balances.iso_currency_code)}</div>
                  <div className="text-xs text-muted-foreground mt-2">Account ****{acc.account_id.slice(-4)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}