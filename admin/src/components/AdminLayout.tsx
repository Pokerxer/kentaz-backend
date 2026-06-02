'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAdminStore } from '@/store/admin-store';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useAdminStore();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

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
