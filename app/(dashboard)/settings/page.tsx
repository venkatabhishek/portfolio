'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Palette, Globe, RefreshCw, Trash2, Download, 
  Check, AlertCircle, Sun, Moon, Monitor
} from 'lucide-react';
import { SettingsSectionSkeleton } from '@/components/ui/skeleton';

type UserSettings = {
  id: string;
  refresh_interval: number;
  currency: string;
  theme: string;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
];

const REFRESH_INTERVALS = [
  { value: 3600, label: '1 hour' },
  { value: 1800, label: '30 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 300, label: '5 minutes' },
];

const THEMES = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || null,
          image: authUser.user_metadata?.avatar_url || null,
        });
      }

      const res = await fetch('/api/user/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    if (!settings) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSettings(data.settings);
      setMessage({ type: 'success', text: 'Settings saved' });
      
      if (key === 'theme') {
        document.documentElement.setAttribute('data-theme', value as string);
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to save' 
      });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your preferences</p>
        </header>
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your preferences and account</p>
      </header>

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize how the app looks</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium mb-3 block">Theme</label>
            <div className="flex gap-3">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateSetting('theme', value)}
                  disabled={saving}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
                    settings?.theme === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Regional</h2>
              <p className="text-sm text-muted-foreground">Currency and regional settings</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">Currency</div>
              <div className="text-sm text-muted-foreground">Display amounts in this currency</div>
            </div>
            <select
              value={settings?.currency || 'USD'}
              onChange={(e) => updateSetting('currency', e.target.value)}
              disabled={saving}
              className="px-3 py-2 rounded-lg border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Sync</h2>
              <p className="text-sm text-muted-foreground">Control how often data refreshes</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">Refresh Interval</div>
              <div className="text-sm text-muted-foreground">Minimum time between manual refreshes</div>
            </div>
            <select
              value={settings?.refresh_interval || 3600}
              onChange={(e) => updateSetting('refresh_interval', parseInt(e.target.value))}
              disabled={saving}
              className="px-3 py-2 rounded-lg border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              {REFRESH_INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Data Management</h2>
              <p className="text-sm text-muted-foreground">Manage your stored data</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">Export Data</div>
              <div className="text-sm text-muted-foreground">Download all your transaction data</div>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">Delete All Data</div>
              <div className="text-sm text-muted-foreground">Remove all your stored transactions</div>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {user?.image ? (
                <Image src={user.image} alt="" width={32} height={32} className="object-cover" />
              ) : (
                <span className="text-sm font-medium">{user?.email?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <h2 className="font-semibold">Account</h2>
              <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <button
            onClick={handleSignOut}
            className="w-full py-2 px-4 rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
