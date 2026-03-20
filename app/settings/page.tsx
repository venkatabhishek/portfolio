'use client';

import React from 'react';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-muted-foreground">Application settings and preferences.</p>

      <div className="rounded-lg border border-card p-6 bg-card">
        <div className="text-sm text-muted-foreground">Theme, account connections, and other preferences.</div>
      </div>
    </div>
  );
}
