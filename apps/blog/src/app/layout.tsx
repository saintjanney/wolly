import type { Metadata } from 'next';
import Link from 'next/link';

import './globals.css';
import { siteOrigin } from '@/lib/blog-data';

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
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-[var(--wolly-rule)]">
            <div className="mx-auto max-w-3xl px-5 h-14 flex items-center justify-between">
              <Link href="/" className="font-semibold tracking-tight text-lg">
                Wolly
              </Link>
              <nav className="text-sm text-[var(--wolly-muted)]">
                <Link href="/discover" className="hover:text-[var(--wolly-ink)]">
                  Discover
                </Link>
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
      </body>
    </html>
  );
}
