'use client';

import React from 'react';

export default function AccountsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Accounts</h1>
      <p className="text-muted-foreground">This is a placeholder page for managing accounts.</p>

      <div className="rounded-lg border border-card p-6 bg-card">
        <div className="text-sm text-muted-foreground">Manage linked accounts, update nicknames, and view details.</div>
      </div>
    </div>
  );
}
