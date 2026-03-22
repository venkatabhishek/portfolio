'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Briefcase, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import PlaidLink from '@/components/plaid/PlaidLink';
import { CardSkeleton } from '@/components/ui/skeleton';

type Holding = {
  id: string;
  ticker: string;
  name: string;
  type: string;
  subtype: string;
  quantity: number;
  price: number;
  value: number;
  costBasis: number | null;
  optionDetails: {
    type: string;
    strike_price: number;
    expiration_date: string;
    shares_per_contract?: number;
  } | null;
  connectionName: string;
  accountName: string;
};

type Summary = {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  gainLossPercent: number;
  holdingsCount: number;
};

type PortfolioData = {
  holdings: Holding[];
  summary: Summary;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatOptionContract(holding: Holding): string {
  if (!holding.optionDetails) return '';
  const { type, strike_price, expiration_date } = holding.optionDetails;
  const exp = new Date(expiration_date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: '2-digit' 
  });
  const strikeFormatted = strike_price % 1 === 0 ? strike_price.toFixed(0) : strike_price.toFixed(2);
  const callPut = type === 'call' ? 'C' : 'P';
  return `${strikeFormatted}${callPut} ${exp}`;
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/investments/holdings');
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handlePlaidSuccess = async (publicToken: string, metadata: { institution?: { name: string } | null }) => {
    try {
      const res = await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          publicToken, 
          metadata,
          products: ['transactions', 'investments'] 
        }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      fetchPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect brokerage');
    }
  };

  const equities = data?.holdings.filter(h => h.type === 'equity' || h.type === 'etf') || [];
  const options = data?.holdings.filter(h => h.type === 'derivative') || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Portfolio</h1>
            <p className="text-muted-foreground mt-1">Your investment holdings</p>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (data?.holdings.length === 0) {
    return (
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Portfolio</h1>
            <p className="text-muted-foreground mt-1">Track your investment holdings</p>
          </div>
        </header>

        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No investment accounts yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your brokerage account to see your stocks, ETFs, and options all in one place.
          </p>
          <PlaidLink 
            onSuccess={handlePlaidSuccess}
            products={['transactions', 'investments']}
          >
            <Plus className="w-4 h-4" />
            Connect Brokerage
          </PlaidLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Portfolio</h1>
          <p className="text-muted-foreground mt-1">Your investment holdings</p>
        </div>
        <PlaidLink 
          onSuccess={handlePlaidSuccess}
          products={['transactions', 'investments']}
        >
          <Plus className="w-4 h-4" />
          Connect Brokerage
        </PlaidLink>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border p-5 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Value</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-3">{formatCurrency(data?.summary.totalValue || 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {data?.summary.holdingsCount || 0} holdings
          </div>
        </div>

        <div className="rounded-xl border border-border p-5 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Gain/Loss</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              (data?.summary.totalGainLoss || 0) >= 0 ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {(data?.summary.totalGainLoss || 0) >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
          </div>
          <div className={`text-2xl font-bold mt-3 ${
            (data?.summary.totalGainLoss || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {formatCurrency(data?.summary.totalGainLoss || 0)}
          </div>
          <div className={`text-xs ${
            (data?.summary.gainLossPercent || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {formatPercent(data?.summary.gainLossPercent || 0)}
          </div>
        </div>

        <div className="rounded-xl border border-border p-5 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Cost Basis</span>
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <span className="text-xs font-bold text-violet-600">$</span>
            </div>
          </div>
          <div className="text-2xl font-bold mt-3">{formatCurrency(data?.summary.totalCostBasis || 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">Total invested</div>
        </div>
      </div>

      {equities.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Stocks & ETFs</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Symbol</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Quantity</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Value</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">P&L</th>
                </tr>
              </thead>
              <tbody>
                {equities.map((holding) => {
                  const gainLoss = holding.costBasis ? holding.value - holding.costBasis : 0;
                  const gainLossPercent = holding.costBasis ? ((gainLoss / holding.costBasis) * 100) : 0;
                  const isPositive = gainLoss >= 0;
                  
                  return (
                    <tr key={holding.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{holding.ticker}</div>
                        <div className="text-xs text-muted-foreground capitalize">{holding.subtype}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate max-w-[200px]">{holding.name}</div>
                        <div className="text-xs text-muted-foreground">{holding.connectionName}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{holding.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(holding.price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(holding.value)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span className="font-medium">{formatCurrency(Math.abs(gainLoss))}</span>
                          <span className="text-xs">({formatPercent(gainLossPercent)})</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {options.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Options</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Contract</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Contracts</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Premium</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Value</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">P&L</th>
                </tr>
              </thead>
              <tbody>
                {options.map((holding) => {
                  const gainLoss = holding.costBasis ? holding.value - holding.costBasis : 0;
                  const gainLossPercent = holding.costBasis ? ((gainLoss / holding.costBasis) * 100) : 0;
                  const isPositive = gainLoss >= 0;
                  const contracts = Math.floor(holding.quantity / 100);
                  
                  return (
                    <tr key={holding.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{formatOptionContract(holding)}</div>
                        <div className="text-xs text-muted-foreground">{holding.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          holding.optionDetails?.type === 'call' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {holding.optionDetails?.type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{contracts}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(holding.price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(holding.value)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span className="font-medium">{formatCurrency(Math.abs(gainLoss))}</span>
                          <span className="text-xs">({formatPercent(gainLossPercent)})</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
