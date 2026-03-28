'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

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
  const { isAuthenticated, checkAuth } = useAuthStore();
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
    }
  }, [isAuthenticated, isReady, mounted, pathname, router]);

  if (!mounted || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
      </div>
    );
  }

  return <AuthContext.Provider value={{ isReady }}>{children}</AuthContext.Provider>;
}
