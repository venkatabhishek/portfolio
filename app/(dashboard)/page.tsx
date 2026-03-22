'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  CreditCard, Wallet, PiggyBank, House, Plus, 
  TrendingUp, TrendingDown, ArrowRight, Shield, Zap, BarChart3
} from 'lucide-react';
import { CardSkeleton, AccountCardSkeleton } from '@/components/ui/skeleton';

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

type Transaction = {
  id: string;
  amount: number;
  date: string;
  name: string | null;
  merchant_name: string | null;
  pending: boolean;
  account: {
    name: string;
    mask: string | null;
  };
  connection: {
    institution_name: string;
  };
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

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.connections) {
        setConnections(data.connections);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const fetchRecentTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions/recent?limit=5');
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchRecentTransactions();
  }, [fetchAccounts, fetchRecentTransactions]);

  const allAccounts = connections.flatMap((c) => c.accounts);
  const checkingSavings = allAccounts.filter((a) => /checking|savings/i.test(a.subtype || ''));
  const creditAccounts = allAccounts.filter((a) => /credit|loan/i.test(a.subtype || ''));

  const totalBalance = checkingSavings.reduce((s, a) => s + (a.current_balance || 0), 0);
  const creditUsed = creditAccounts.reduce((s, a) => s + Math.abs(a.current_balance || 0), 0);
  const totalAvailableCredit = creditAccounts.reduce((s, a) => s + (a.available_balance || 0), 0);

  const monthlySpending = transactions
    .filter(t => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  const getAccountMeta = (subtype: string) => {
    const s = (subtype || '').toLowerCase();
    if (s.includes('savings')) {
      return { icon: <PiggyBank size={20} />, bg: 'bg-emerald-100', fg: 'text-emerald-700', border: 'border-emerald-200' };
    }
    if (s.includes('checking')) {
      return { icon: <House size={20} />, bg: 'bg-sky-100', fg: 'text-sky-700', border: 'border-sky-200' };
    }
    if (s.includes('credit') || s.includes('loan')) {
      return { icon: <CreditCard size={20} />, bg: 'bg-violet-100', fg: 'text-violet-700', border: 'border-violet-200' };
    }
    return { icon: <Wallet size={20} />, bg: 'bg-zinc-100', fg: 'text-zinc-800', border: 'border-zinc-200' };
  };

  if (loadingAccounts && loadingTransactions) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading your financial overview...</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AccountCardSkeleton />
          <AccountCardSkeleton />
        </div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome! Connect your first account to get started.</p>
        </header>

        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No accounts connected</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your bank accounts and investment accounts to see your complete financial picture in one place.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            <div className="flex items-start gap-3 text-left p-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">Bank-level security</div>
                <div className="text-xs text-muted-foreground">Your credentials never touch our servers</div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left p-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">Track all in one place</div>
                <div className="text-xs text-muted-foreground">Banks, brokers, credit cards</div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left p-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm">Real-time sync</div>
                <div className="text-xs text-muted-foreground">Latest balances and transactions</div>
              </div>
            </div>
          </div>

          <Link
            href="/accounts"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
          >
            <Plus className="w-5 h-5" />
            Connect Your First Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s your financial overview.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border p-5 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-3">{formatCurrency(totalBalance)}</div>
          <div className="text-xs text-muted-foreground mt-1">Checking & Savings</div>
        </div>

        <div className="rounded-xl border border-border p-5 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Credit Used</span>
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-violet-600" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-3">{formatCurrency(creditUsed)}</div>
          <div className="text-xs text-muted-foreground mt-1">of {formatCurrency(totalAvailableCredit + creditUsed)}</div>
        </div>

        <div className="rounded-xl border border-border p-5 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Net Worth</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-3">{formatCurrency(totalBalance - creditUsed)}</div>
          <div className="text-xs text-muted-foreground mt-1">Assets minus liabilities</div>
        </div>

        <div className="rounded-xl border border-border p-5 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Recent Spending</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-3">{formatCurrency(monthlySpending)}</div>
          <div className="text-xs text-muted-foreground mt-1">Last {transactions.length} transactions</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <Link
              href="/transactions"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loadingTransactions ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.amount < 0 ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        {tx.amount < 0 ? (
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {tx.merchant_name || tx.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{tx.account.name}</span>
                          <span className="text-muted">•</span>
                          <span>{formatRelativeDate(tx.date)}</span>
                          {tx.pending && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      tx.amount < 0 ? 'text-emerald-600' : 'text-foreground'
                    }`}>
                      {tx.amount < 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Accounts</h2>
            <Link
              href="/accounts"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {loadingAccounts ? (
              <>
                <AccountCardSkeleton />
                <AccountCardSkeleton />
              </>
            ) : (
              connections.map((conn) =>
                conn.accounts.slice(0, 2).map((acc) => {
                  const meta = getAccountMeta(acc.subtype || '');
                  return (
                    <div key={acc.id} className={`rounded-xl border-2 p-4 bg-card ${meta.border}`}>
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${meta.bg} ${meta.fg}`}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{acc.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{acc.subtype}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(acc.current_balance, acc.currency)}</div>
                          <div className="text-xs text-muted-foreground">
                            ****{acc.mask}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
            {allAccounts.length > 4 && (
              <Link
                href="/accounts"
                className="block text-center py-2 text-sm text-primary hover:underline"
              >
                + {allAccounts.length - 4} more accounts
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
