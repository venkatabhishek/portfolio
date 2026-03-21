'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Building2, Plus, Trash2, Loader2, RefreshCw, CreditCard, Landmark, Wallet } from 'lucide-react';
import PlaidLink from '@/components/plaid/PlaidLink';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  institution_id: string;
  status: string;
  last_synced: string | null;
  created_at: string;
  accounts: Account[];
};

export default function AccountsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/accounts');
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setConnections(data.connections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    try {
      const response = await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken, metadata }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Reload to show new accounts
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect account');
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this account? All associated data will be removed.')) {
      return;
    }

    try {
      const response = await fetch(`/api/plaid/connections/${connectionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      await fetchConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect account');
    }
  };

  const handleRefresh = async (connectionId: string) => {
    setRefreshing(connectionId);
    try {
      const response = await fetch(`/api/accounts/${connectionId}/refresh`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      await fetchConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh account');
    } finally {
      setRefreshing(null);
    }
  };

  const getAccountIcon = (subtype: string) => {
    const s = subtype?.toLowerCase() || '';
    if (s.includes('checking') || s.includes('savings')) {
      return <Landmark className="w-5 h-5" />;
    }
    if (s.includes('credit') || s.includes('loan')) {
      return <CreditCard className="w-5 h-5" />;
    }
    return <Wallet className="w-5 h-5" />;
  };

  const formatCurrency = (amount: number | null, currency = 'USD') => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your connected bank accounts and brokers
          </p>
        </div>
        <PlaidLink onSuccess={handlePlaidSuccess}>
          <Plus className="w-4 h-4" />
          Connect Account
        </PlaidLink>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {connections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/50 p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">No accounts connected</h2>
          <p className="text-muted-foreground mb-4">
            Connect your first bank account to get started
          </p>
          <PlaidLink onSuccess={handlePlaidSuccess}>
            <Plus className="w-4 h-4" />
            Connect Account
          </PlaidLink>
        </div>
      ) : (
        <div className="space-y-6">
          {connections.map((connection) => (
            <div key={connection.id} className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{connection.institution_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {connection.accounts.length} account{connection.accounts.length !== 1 ? 's' : ''} • 
                      Last synced: {formatDate(connection.last_synced)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRefresh(connection.id)}
                    disabled={refreshing === connection.id}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing === connection.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title="Disconnect"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="divide-y">
                {connection.accounts.map((account) => (
                  <div key={account.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        account.subtype?.toLowerCase().includes('credit')
                          ? 'bg-violet-100 text-violet-600'
                          : account.subtype?.toLowerCase().includes('savings')
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-sky-100 text-sky-600'
                      }`}>
                        {getAccountIcon(account.subtype)}
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {account.subtype} ••••{account.mask}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(account.current_balance, account.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Available: {formatCurrency(account.available_balance, account.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
