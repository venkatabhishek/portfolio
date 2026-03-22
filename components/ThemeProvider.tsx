'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    async function loadThemeFromSupabase() {
      try {
        const res = await fetch('/api/user/settings');
        const data = await res.json();
        if (data.settings?.theme && data.settings.theme !== 'system') {
          document.documentElement.classList.add(data.settings.theme);
        }
      } catch {
        // Ignore errors, fall back to system theme
      }
    }
    
    loadThemeFromSupabase();
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
