'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

type Transaction = {
  id: string;
  account_id: string;
  plaid_transaction_id: string;
  amount: number;
  date: string;
  name: string | null;
  merchant_name: string | null;
  category: string[] | null;
  pending: boolean;
  account: {
    id: string;
    name: string;
    plaid_account_id: string;
  } | null;
};

type ApiResponse = {
  transactions: Transaction[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
  };
  error?: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ totalDeposits: 0, totalWithdrawals: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      setError(null);
      const res = await fetch('/api/transactions');
      const data: ApiResponse = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTransactions(data.transactions || []);
      setSummary(data.summary || { totalDeposits: 0, totalWithdrawals: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
        <p className="text-destructive font-medium">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Transactions</h1>
          <p className="text-muted-foreground mt-1">View and manage your transaction history.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-card bg-card p-6">
          <div className="text-sm text-muted-foreground">Total Deposits</div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(summary.totalDeposits)}
          </div>
        </div>

        <div className="rounded-lg border border-card bg-card p-6">
          <div className="text-sm text-muted-foreground">Total Withdrawals</div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(summary.totalWithdrawals)}
          </div>
        </div>

        <div className="rounded-lg border border-card bg-card p-6">
          <div className="text-sm text-muted-foreground">Total Transactions</div>
          <div className="text-2xl font-bold text-primary mt-2">{transactions.length}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No transactions found. Connect an account and refresh to see transactions.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.account?.name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.merchant_name || tx.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.category?.[0] || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <span className={tx.amount < 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {tx.amount < 0 ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      tx.pending 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {tx.pending ? 'Pending' : 'Posted'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {transactions.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{transactions.length} transactions</span>
          <span>Showing all transactions</span>
        </div>
      )}
    </div>
  );
}
