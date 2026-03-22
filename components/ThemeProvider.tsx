'use client';

import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    async function loadTheme() {
      try {
        const res = await fetch('/api/user/settings');
        const data = await res.json();
        const theme = data.settings?.theme;
        
        if (theme && theme !== 'system') {
          document.documentElement.classList.add(theme);
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.classList.add('dark');
          }
        }
      } catch {
        // Ignore errors, fall back to system theme
      }
    }
    
    loadTheme();
  }, []);

  // Prevent hydration mismatch by not rendering children until mounted
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
