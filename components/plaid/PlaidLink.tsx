'use client';

import { useCallback, useState } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { Loader2 } from 'lucide-react';

type PlaidLinkProps = {
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit?: () => void;
  children?: React.ReactNode;
};

export default function PlaidLink({ onSuccess, onExit, children }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/plaid/link-token', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setLinkToken(data.linkToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Plaid');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOnSuccess: PlaidLinkOnSuccess = useCallback(
    (publicToken, metadata) => {
      onSuccess(publicToken, metadata);
    },
    [onSuccess]
  );

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: (exitError, metadata) => {
      if (exitError) {
        console.error('Plaid exit error:', exitError);
      }
      onExit?.();
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = async () => {
    if (!linkToken) {
      await fetchLinkToken();
    } else {
      open();
    }
  };

  // Open Plaid Link when token is ready
  if (linkToken && ready && !loading) {
    open();
    setLinkToken(null);
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Connecting...' : children || 'Connect Bank Account'}
      </button>

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </>
  );
}
