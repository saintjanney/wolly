'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpenIcon, 
  Cog6ToothIcon,
  Squares2X2Icon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon, color: 'blue' },
  { name: 'My Books', href: '/books', icon: BookOpenIcon, color: 'purple' },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, color: 'gray' },
];

const publicNavigation = [
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'About', href: '#about' },
];

export default function Navigation() {
  const { user, loading } = useAuth();
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPublicMobileMenuOpen, setIsPublicMobileMenuOpen] = useState(false);

  // Don't show navigation on onboarding page
  if (pathname === '/onboarding') return null;

  // Show public top navigation for non-authenticated users
  if (!user && !loading) {
    return (
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link 
                href="/" 
                className="flex items-center space-x-2 group transition-transform duration-200 hover:scale-105"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <BookOpenIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Wolly
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {publicNavigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-200"
                >
                  {item.name}
                </a>
              ))}
              <Link
                href="/#login-section"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/#login-section"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsPublicMobileMenuOpen(!isPublicMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isPublicMobileMenuOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isPublicMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4 space-y-3">
              {publicNavigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsPublicMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  {item.name}
                </a>
              ))}
              <Link
                href="/#login-section"
                onClick={() => setIsPublicMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/#login-section"
                onClick={() => setIsPublicMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-center hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </nav>
    );
  }

  // Show side navigation for authenticated users (but not on onboarding)
  if (!user || loading) return null;

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { active: string; inactive: string; icon: string; border: string } } = {
      blue: {
        active: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm',
        inactive: 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200',
        icon: 'text-blue-600',
        border: 'border-l-4'
      },
      green: {
        active: 'bg-green-50 text-green-700 border-green-200 shadow-sm',
        inactive: 'text-gray-600 hover:text-green-600 hover:bg-green-50/50 hover:border-green-200',
        icon: 'text-green-600',
        border: 'border-l-4'
      },
      purple: {
        active: 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm',
        inactive: 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50 hover:border-purple-200',
        icon: 'text-purple-600',
        border: 'border-l-4'
      },
      indigo: {
        active: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm',
        inactive: 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200',
        icon: 'text-indigo-600',
        border: 'border-l-4'
      },
      gray: {
        active: 'bg-gray-50 text-gray-700 border-gray-200 shadow-sm',
        inactive: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50/50 hover:border-gray-200',
        icon: 'text-gray-600',
        border: 'border-l-4'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      {/* Mobile menu button - fixed top left */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="w-6 h-6 text-gray-700" />
        ) : (
          <Bars3Icon className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-lg z-40
          transition-all duration-300 ease-in-out overflow-hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}
        aria-label="Sidebar navigation"
        aria-expanded={!isSidebarCollapsed}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand/Logo Section */}
          <div className={`h-20 ${isSidebarCollapsed ? 'px-0' : 'px-6'} border-b border-gray-200 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} overflow-hidden`}>
            <Link 
              href="/dashboard" 
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2.5'} group transition-transform duration-200 hover:scale-105 overflow-hidden`}
              onClick={() => setIsMobileMenuOpen(false)}
              title={isSidebarCollapsed ? 'Wolly' : undefined}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                <BookOpenIcon className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent transition-all duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:w-0 lg:max-w-0 lg:overflow-hidden' : 'opacity-100 max-w-full'}`}>
                Wolly
              </span>
            </Link>
            
            {/* Toggle Button - Desktop Only */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRightIcon className="w-5 h-5 text-gray-600 transition-transform duration-200" />
              ) : (
                <ChevronLeftIcon className="w-5 h-5 text-gray-600 transition-transform duration-200" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2 py-6' : 'px-4 py-6'} flex flex-col justify-center space-y-3 overflow-y-auto overflow-x-hidden`}>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const colors = getColorClasses(item.color);
              return (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-4'} 
                      ${isSidebarCollapsed ? 'px-2 py-3.5' : 'px-5 py-3.5'} 
                      rounded-lg font-medium transition-all duration-200 ease-in-out overflow-hidden
                      ${colors.border}
                      ${isActive ? colors.active : colors.inactive}
                      ${!isActive ? 'hover:scale-[1.02] hover:shadow-sm' : ''}
                    `}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${isActive ? colors.icon : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className={`text-sm transition-all duration-200 whitespace-nowrap ${isSidebarCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden lg:max-w-0' : 'opacity-100 max-w-full'}`}>
                      {item.name}
                    </span>
                  </Link>
                  
                  {/* Tooltip for collapsed state */}
                  {isSidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap shadow-lg">
                      {item.name}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
