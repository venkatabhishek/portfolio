'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Filter } from 'lucide-react';

interface Transaction {
  account_id: string;
  account_name?: string;
  name?: string;
  merchant_name?: string;
  category?: string[];
  amount: number;
  date: string;
  pending?: boolean;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  accounts: any[];
  onRefresh?: () => void;
}

export function TransactionsTable({ transactions, accounts, onRefresh }: TransactionsTableProps) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

  const accountMap = new Map(accounts.map(a => [a.account_id, a.name]));

  const filtered = transactions.filter(tx => {
    if (filter !== 'all' && filter !== 'all') return true;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <svg className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All</option>
          <option value="deposits">Deposits Only</option>
          <option value="withdrawals">Withdrawals Only</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="date">Newest First</option>
          <option value="amount">Amount</option>
        </select>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-card">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payee / Merchant</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((tx, idx) => (
              <tr key={idx} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-sm">
                  {tx.account_name || accountMap.get(tx.account_id) || tx.account_id}
                </td>
                <td className="px-4 py-3 text-sm">
                  {tx.merchant_name || tx.name || '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {tx.category?.[0] || '-'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  <span className={tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tx.pending 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {tx.pending ? '⏳' : '✓'} {tx.pending ? 'Pending' : 'Posted'}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No transactions found. Try adjusting your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{sorted.length} transactions</span>
          <span>Showing all transactions</span>
        </div>
      )}
    </div>
  );
}
