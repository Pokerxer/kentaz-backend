'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAdminStore } from '@/store/admin-store';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useAdminStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Keep sidebar state as-is on desktop (allow closed sidebar)
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-[#C9A84C]/20" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-[#C9A84C] border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Sidebar backdrop - closes sidebar when clicking outside */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={cn(
        "transition-all duration-300",
        sidebarOpen ? "lg:pl-64" : ""
      )}>
        <Header />
        <main className="p-4 md:p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
