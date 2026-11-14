import type { Metadata } from 'next';
import Link from 'next/link';

import './globals.css';
import { siteOrigin } from '@/lib/blog-data';
import { AuthProvider } from '@/components/AuthProvider';
import { HeaderAuth } from '@/components/HeaderAuth';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: 'Wolly',
    template: '%s | Wolly',
  },
  description: 'Writing from Wolly creators.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-[var(--wolly-rule)]">
            <div className="mx-auto max-w-3xl px-5 h-14 flex items-center justify-between">
              <Link href="/" className="font-semibold tracking-tight text-lg">
                Wolly
              </Link>
              <nav className="flex items-center gap-4 text-sm text-[var(--wolly-muted)]">
                <Link href="/discover" className="hover:text-[var(--wolly-ink)]">
                  Discover
                </Link>
                <HeaderAuth />
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--wolly-rule)] mt-20">
            <div className="mx-auto max-w-3xl px-5 py-8 text-sm text-[var(--wolly-muted)]">
              Published on Wolly.
            </div>
          </footer>
        </div>
        </AuthProvider>
      </body>
    </html>
  );
}
