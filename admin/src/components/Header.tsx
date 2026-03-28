'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Search, User, ChevronDown, LogOut, Settings, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useAdminStore } from '@/store/admin-store';
import { api } from '@/lib/api';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, unreadNotifications, setUnreadNotifications } = useAdminStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    api.notifications.getUnreadCount()
      .then(r => setUnreadNotifications(r.count))
      .catch(() => {});
  }, [setUnreadNotifications]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 md:gap-4 border-b bg-white px-2 md:px-6">
      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <X className="h-5 w-5 text-gray-600" /> : <Menu className="h-5 w-5 text-gray-600" />}
      </button>

      {/* Search - desktop */}
      <div className="hidden md:block flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search products, orders, customers..."
            className="h-10 w-full rounded-lg border bg-gray-50 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Mobile search toggle */}
      <button 
        onClick={() => setShowSearch(!showSearch)}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100"
      >
        {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </button>

      {/* Notifications */}
      <Link href="/notifications" className="relative rounded-lg p-2 hover:bg-gray-100 block">
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadNotifications > 0 && (
          <span className="absolute right-1 top-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </span>
        )}
      </Link>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100"
        >
          <div className="h-8 w-8 rounded-full bg-[#C9A84C] flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium">{user?.name || 'Admin'}</p>
            <p className="text-xs text-gray-500">{user?.email || 'admin@kentaz.com'}</p>
          </div>
          <ChevronDown className="hidden md:block h-4 w-4 text-gray-400" />
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-white py-1 shadow-lg z-50">
            <div className="md:hidden px-4 py-2 border-b">
              <p className="font-medium">{user?.name || 'Admin'}</p>
              <p className="text-sm text-gray-500">{user?.email || 'admin@kentaz.com'}</p>
            </div>
            <button
              onClick={() => {
                setShowDropdown(false);
                router.push('/settings');
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Mobile search bar */}
      {showSearch && (
        <div className="absolute left-0 right-0 top-16 z-30 border-b bg-white p-4 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search..."
              className="h-10 w-full rounded-lg border bg-gray-50 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:bg-white"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
