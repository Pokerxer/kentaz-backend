'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import type { User } from '@/lib/api';

// Routes that require explicit role or custom permission to access
const ADMIN_ONLY_PATHS = [
  '/products',
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initAuth = async () => {
      await checkAuth();
      setIsReady(true);
    };
    initAuth();
  }, [mounted, checkAuth]);

  useEffect(() => {
    if (!isReady || !mounted) return;

    const publicPaths = ['/login', '/auth/login'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!isAuthenticated && !isPublicPath) {
      router.push('/login');
    } else if (isAuthenticated && isPublicPath) {
      router.push('/dashboard');
    } else if (isAuthenticated && user && !canAccessPath(pathname, user)) {
      // Authenticated but lacks permission for this route → back to dashboard
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, isReady, mounted, pathname, router]);

  if (!mounted || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
      </div>
    );
  }

  return <AuthContext.Provider value={{ isReady }}>{children}</AuthContext.Provider>;
}
