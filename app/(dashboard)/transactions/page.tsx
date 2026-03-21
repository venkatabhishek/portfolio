'use client';

import { useEffect, useState } from 'react';
import { TransactionsTable } from '@/components/TransactionsTable';

type Transaction = {
  account_id: string;
  account_name?: string;
  name?: string;
  merchant_name?: string;
  category?: string[];
  amount: number;
  date: string;
  pending?: boolean;
};

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

type ApiResponse = {
  transactions: Transaction[];
  accounts: Account[];
  grouped: any[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
  };
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grouped, setGrouped] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalDeposits: 0, totalWithdrawals: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/transactions');
      const data: ApiResponse = await res.json();

      setTransactions(data.transactions || []);
      setAccounts(data.accounts || []);
      setGrouped(data.grouped || []);
      setSummary(data.summary || { totalDeposits: 0, totalWithdrawals: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
        <p className="text-destructive font-medium">{error}</p>
        <button
          onClick={fetchTransactions}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Transactions</h1>
        <p className="text-muted-foreground mt-1">View and manage your transaction history.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-card bg-card p-6">
          <div className="text-sm text-muted-foreground">Total Deposits</div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            ${summary.totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-lg border border-card bg-card p-6">
          <div className="text-sm text-muted-foreground">Total Withdrawals</div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            ${summary.totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-lg border border-card bg-card p-6">
          <div className="text-sm text-muted-foreground">Total Transactions</div>
          <div className="text-2xl font-bold text-primary mt-2">{transactions.length}</div>
        </div>
      </div>

      <TransactionsTable
        transactions={transactions}
        accounts={accounts}
        onRefresh={fetchTransactions}
      />

      {grouped.length > 0 && (
        <div className="rounded-lg border border-card p-4">
          <h3 className="text-lg font-semibold mb-3">Monthly Overview</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {grouped.slice(0, 3).map((month: any) => (
              <div key={month.month} className="rounded-lg border border-border bg-muted p-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {new Date(month.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-600">
                    +${month.deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-2xl font-bold text-rose-600">
                    -${month.withdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {month.transactions.length} transactions
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
