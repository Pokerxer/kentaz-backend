'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import type { User } from '@/lib/api';

// Routes that require explicit role or custom permission to access
const PRODUCTS_WRITE_PATHS = ['/products/new', '/products/import', '/products/adjustment'];

const ADMIN_ONLY_PATHS = [
  '/inventory',
  '/purchases',
  '/customers',
  '/users',
  '/staff',
  '/categories',
  '/discounts',
  '/gift-cards',
  '/shipping',
  '/reviews',
  '/wishlists',
  '/analytics',
  '/announcements',
  '/reports',
];

export function canAccessPath(pathname: string, user: User): boolean {
  if (user.role === 'admin') return true;

  // Staff can view products list/detail but not write paths
  if (user.role === 'staff') {
    if (PRODUCTS_WRITE_PATHS.some(p => pathname.startsWith(p))) return false;
    if (pathname.startsWith('/products/') && pathname.endsWith('/edit')) return false;
  }

  const restricted = ADMIN_ONLY_PATHS.find(p => pathname.startsWith(p));
  if (!restricted) return true; // Unrestricted route

  const permissions = user.permissions ?? [];
  if (permissions.length === 0) return false; // No custom permissions → no access

  return permissions.some(perm => pathname.startsWith(perm));
}

interface AuthContextType {
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType>({ isReady: false });

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // useEffect is client-only — no need for a separate mounted gate.
  // Start the token validation immediately; if the persisted store already
  // has isAuthenticated=true we show content right away and re-validate silently.
  useEffect(() => {
    checkAuth().finally(() => setIsReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isReady) return;

    const publicPaths = ['/login', '/auth/login'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!isAuthenticated && !isPublicPath) {
      router.push('/login');
    } else if (isAuthenticated && isPublicPath) {
      router.push(user?.role === 'staff' ? '/pos/dashboard' : '/dashboard');
    } else if (isAuthenticated && user && !canAccessPath(pathname, user)) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, isReady, pathname, router]);

  // If the persisted store already has a valid session, render immediately
  // while checkAuth silently re-validates in the background.
  // Only block on the spinner when there is genuinely no cached auth state.
  if (!isReady && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
      </div>
    );
  }

  return <AuthContext.Provider value={{ isReady }}>{children}</AuthContext.Provider>;
}
