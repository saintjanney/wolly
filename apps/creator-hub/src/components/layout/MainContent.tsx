'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const pathname = usePathname();

  // Determine if the user is authenticated and not on onboarding/landing page
  const isAuthenticatedAppPage = user && !loading && pathname !== '/onboarding' && pathname !== '/';

  // Dynamic margin based on sidebar state
  const sidebarMargin = isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64';

  if (isAuthenticatedAppPage) {
    return (
      <main className={`bg-gray-50 ${sidebarMargin} transition-all duration-300 fixed top-20 bottom-0 left-0 right-0 overflow-y-auto overflow-x-hidden`}>
        {children}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {children}
    </main>
  );
}

