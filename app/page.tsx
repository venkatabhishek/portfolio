'use client';

import { useEffect, useState } from 'react';

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

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => setAccounts(data.accounts));
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>💰 Asset Dashboard</h1>

      {accounts?.map(acc => (
        <div
          key={acc.account_id}
          style={{
            border: '1px solid #ccc',
            padding: 16,
            marginTop: 12,
            borderRadius: 8,
          }}
        >
          <h3>{acc.name}</h3>
          <p>Type: {acc.subtype}</p>
          <p>
            Balance: {acc.balances.current} {acc.balances.iso_currency_code}
          </p>
        </div>
      ))}
    </main>
  );
}