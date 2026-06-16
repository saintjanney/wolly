'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, Fragment } from 'react';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const { title, subtitle } = usePageTitle();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Logout clicked, opening confirmation dialog');
    setIsMenuOpen(false);
    setIsConfirmDialogOpen(true);
    console.log('Dialog state set to true');
  };

  const handleConfirmLogout = async () => {
    setIsConfirmDialogOpen(false);
    await logout();
    router.push('/');
  };

  // Calculate menu position when it opens
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if confirmation dialog is open
      if (isConfirmDialogOpen) return;
      
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isConfirmDialogOpen]);

  // Don't show header on public pages or onboarding
  if (!user || pathname === '/onboarding' || pathname === '/') {
    return null;
  }

  // Dynamic left position based on sidebar state
  const leftPosition = isSidebarCollapsed ? 'left-20' : 'left-64';

  return (
    <>
      <header
        className={`
          fixed top-0 right-0 h-20 bg-white border-b border-gray-200 shadow-sm z-50
          transition-all duration-300 ease-in-out overflow-x-hidden
          ${leftPosition}
        `}
      >
        <div className="h-full flex items-center justify-between px-6">
          {/* Left side: Page Title and Subtitle */}
          <div className="flex-1 min-w-0">
            {title && (
              <>
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-gray-600 truncate">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Right side: User Profile */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                {user.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                {user.email}
              </p>
            </div>
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                ref={buttonRef}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
                aria-label="User menu"
              >
                <img
                  className="h-10 w-10 rounded-full ring-2 ring-gray-200 hover:ring-blue-300 transition-all duration-200 cursor-pointer"
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=6366f1&color=fff&size=128`}
                  alt={user.displayName || 'User'}
                />
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
              </button>

              {/* Dropdown Menu - Using fixed positioning to ensure it appears above all content */}
              {isMenuOpen && (
                <div 
                  className="fixed bg-white rounded-lg shadow-xl py-1 z-[100] border border-gray-200 overflow-hidden w-56"
                  style={{
                    top: `${menuPosition.top}px`,
                    right: `${menuPosition.right}px`
                  }}
                >
                  <div className="py-1">
                    <button
                      onClick={handleLogoutClick}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog - Rendered outside header */}
      {console.log('Rendering dialog, isConfirmDialogOpen:', isConfirmDialogOpen)}
      <Transition appear show={isConfirmDialogOpen} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-[200]" onClose={() => setIsConfirmDialogOpen(false)}>
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
          </Transition.Child>

          {/* Dialog container */}
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                  <div className="px-6 py-5">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                      Sign out
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mb-6">
                      Are you sure you want to sign out? You&apos;ll need to sign in again to access your account.
                    </p>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setIsConfirmDialogOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmLogout}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-150 flex items-center gap-2"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

