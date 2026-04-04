'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Search, User, ChevronDown, LogOut, Settings, Menu, X, Package, ShoppingCart, Users, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useAdminStore } from '@/store/admin-store';
import { api } from '@/lib/api';

interface SearchResults {
  products: { _id: string; name: string; category: string; images?: { url: string }[] }[];
  orders: { _id: string; orderNumber?: string; customer?: { name?: string; email?: string }; status: string }[];
  customers: { _id: string; name: string; email: string }[];
}

function GlobalSearch({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const [productsRes, ordersRes, customersRes] = await Promise.allSettled([
        api.products.getAll({ search: q, limit: 4 }),
        api.orders.getAll({ search: q, limit: 4 }),
        api.users.getAll({ role: 'customer', search: q, limit: 4 }),
      ]);
      setResults({
        products: productsRes.status === 'fulfilled' ? productsRes.value.products : [],
        orders: ordersRes.status === 'fulfilled' ? ordersRes.value.orders : [],
        customers: customersRes.status === 'fulfilled' ? customersRes.value.users : [],
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navigate = (path: string) => {
    setOpen(false);
    setQuery('');
    onClose?.();
    router.push(path);
  };

  const hasResults = results && (results.products.length > 0 || results.orders.length > 0 || results.customers.length > 0);
  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        placeholder="Search products, orders, customers..."
        className="h-10 w-full rounded-lg border bg-gray-50 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:bg-white transition"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 animate-spin" />
      )}

      {showDropdown && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[340px] rounded-xl border bg-white shadow-xl z-50 overflow-hidden">
          {loading && !results && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching…
            </div>
          )}

          {!loading && !hasResults && results !== null && (
            <div className="py-8 text-center text-sm text-gray-500">No results for "{query}"</div>
          )}

          {hasResults && (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {results.products.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Package className="h-3 w-3" /> Products
                    </span>
                    <button
                      onClick={() => navigate(`/products?search=${encodeURIComponent(query)}`)}
                      className="text-xs text-[#C9A84C] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  {results.products.map(p => (
                    <button
                      key={p._id}
                      onClick={() => navigate(`/products/${p._id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {p.images?.[0]?.url
                          ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                          : <Package className="h-4 w-4 text-gray-400 m-2" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 truncate">{p.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.orders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <ShoppingCart className="h-3 w-3" /> Orders
                    </span>
                    <button
                      onClick={() => navigate(`/orders?search=${encodeURIComponent(query)}`)}
                      className="text-xs text-[#C9A84C] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  {results.orders.map(o => (
                    <button
                      key={o._id}
                      onClick={() => navigate(`/orders/${o._id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {o.orderNumber ? `#${o.orderNumber}` : `#${o._id.slice(-6).toUpperCase()}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {o.customer?.name || o.customer?.email || 'Unknown customer'} · {o.status}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.customers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="h-3 w-3" /> Customers
                    </span>
                    <button
                      onClick={() => navigate(`/customers?search=${encodeURIComponent(query)}`)}
                      className="text-xs text-[#C9A84C] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  {results.customers.map(c => (
                    <button
                      key={c._id}
                      onClick={() => navigate(`/customers/${c._id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-[#C9A84C]">
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">{c.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer hint */}
          {hasResults && (
            <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-400">
              Press <kbd className="px-1 py-0.5 rounded bg-gray-200 font-mono">Esc</kbd> to close
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
      <div className="hidden md:flex flex-1">
        <GlobalSearch />
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
          <GlobalSearch onClose={() => setShowSearch(false)} />
        </div>
      )}
    </header>
  );
}
