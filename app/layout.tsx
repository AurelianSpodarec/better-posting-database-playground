import type { Metadata, Viewport } from 'next';

// import './../styles/styles.css';
import './globals.css';

import { createClient } from '@/utils/supabase/server';
import AppProvider from '@/providers';

export const metadata: Metadata = {
  title: 'BetterPosting',
  description: 'BetterPosting',
};

export const viewport: Viewport = {
  maximumScale: 1,
};

async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-[100dvh] font-body text-sm ">
        <AppProvider user={user}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}

export default RootLayout
