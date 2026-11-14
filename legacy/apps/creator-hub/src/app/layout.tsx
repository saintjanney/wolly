import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { PageTitleProvider } from '@/contexts/PageTitleContext';
import { Toaster } from 'react-hot-toast';
import Navigation from '@/components/layout/Navigation';
import AppHeader from '@/components/layout/AppHeader';
import OnboardingGuard from '@/components/auth/OnboardingGuard';
import MainContent from '@/components/layout/MainContent';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wolly Creator Hub',
  description: 'Create and manage your books on the Wolly platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SidebarProvider>
            <PageTitleProvider>
              <OnboardingGuard>
                <Navigation />
                <AppHeader />
                <MainContent>
                  {children}
                </MainContent>
              </OnboardingGuard>
              <Toaster position="top-right" />
            </PageTitleProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
