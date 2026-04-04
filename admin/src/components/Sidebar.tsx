'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAdminStore } from '@/store/admin-store';
import { useAuthStore } from '@/store/auth-store';
import { canAccessPath } from '@/components/AuthProvider';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  Settings,
  BarChart3,
  MessageSquare,
  Bell,
  Megaphone,
  FileText,
  Heart,
  CreditCard,
  Truck,
  X,
  LogOut,
  Calendar,
  Box,
  Plus,
  List,
  Upload,
  ArrowUpDown,
  ClipboardList,
  ChevronDown,
  ShoppingBag,
  Monitor,
  UserCog,
  Receipt,
  Percent,
  ShieldCheck,
  Key,
  Lock,
} from 'lucide-react';

const productsSubMenu = [
  { name: 'All Products',        href: '/products',             icon: List },
  { name: 'Add Product',         href: '/products/new',         icon: Plus },
  { name: 'Import Products',     href: '/products/import',      icon: Upload },
  { name: 'Quantity Adjustment', href: '/products/adjustment',  icon: ArrowUpDown },
  { name: 'Stock Count',         href: '/products/stock-count', icon: ClipboardList },
];

type NavItem = {
  name: string;
  href: string;
  icon: any;
  hasDropdown?: boolean;
  external?: boolean;
  /** undefined = accessible to all authenticated users */
  roles?: string[];
};

const navigation: NavItem[] = [
  { name: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { name: 'Point of Sale',href: '/pos/dashboard',icon: Monitor,       external: true },
  { name: 'POS Sales',    href: '/pos/sales',    icon: Receipt,       external: true },
  { name: 'Products',     href: '/products',     icon: Package,       hasDropdown: true, roles: ['admin'] },
  { name: 'Inventory',    href: '/inventory',    icon: Box,           roles: ['admin'] },
  { name: 'Purchases',    href: '/purchases',    icon: ShoppingBag,   roles: ['admin'] },
  { name: 'Orders',       href: '/orders',       icon: ShoppingCart },
  { name: 'Bookings',     href: '/bookings',     icon: Calendar },
  { name: 'Customers',    href: '/customers',    icon: Users,         roles: ['admin'] },
  { name: 'Users',        href: '/users',        icon: ShieldCheck,   roles: ['admin'] },
  { name: 'Staff',        href: '/staff',        icon: UserCog,       roles: ['admin'] },
  { name: 'Categories',   href: '/categories',   icon: Tags,          roles: ['admin'] },
  { name: 'Discounts',    href: '/discounts',    icon: Percent,       roles: ['admin'] },
  { name: 'Gift Cards',   href: '/gift-cards',   icon: CreditCard,    roles: ['admin'] },
  { name: 'Shipping',     href: '/shipping',     icon: Truck,         roles: ['admin'] },
  { name: 'Reviews',      href: '/reviews',      icon: MessageSquare, roles: ['admin'] },
  { name: 'Wishlists',    href: '/wishlists',    icon: Heart,         roles: ['admin'] },
  { name: 'Analytics',    href: '/analytics',    icon: BarChart3,     roles: ['admin'] },
  { name: 'Notifications',href: '/notifications',icon: Bell },
  { name: 'Announcements',href: '/announcements',icon: Megaphone,     roles: ['admin'] },
  { name: 'Reports',      href: '/reports',      icon: FileText,      roles: ['admin'] },
  { name: 'Settings',     href: '/settings',     icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAdminStore();
  const { user, logout } = useAuthStore();
  const userRole = user?.role ?? 'customer';
  const userPermissions = user?.permissions ?? [];

  // Determine which nav items the current user can see
  const filteredNav = navigation.filter(item => {
    if (userRole === 'admin') return true;
    // No role restriction — everyone sees it
    if (!item.roles) return true;
    // Has role restriction: check custom permissions first, then role membership
    if (userPermissions.length > 0) {
      return userPermissions.some(perm => item.href === perm || item.href.startsWith(perm + '/'));
    }
    return item.roles.includes(userRole);
  });

  const isProductsActive = pathname.startsWith('/products') || pathname.startsWith('/inventory') || pathname.startsWith('/purchases');
  const isProductsPage   = pathname === '/products' || pathname.startsWith('/products/') || pathname.startsWith('/inventory') || pathname.startsWith('/purchases');

  const [productsDropdownOpen, setProductsDropdownOpen] = useState(isProductsActive);

  function handleLogout() {
    document.cookie = 'admin_token=; path=/; max-age=0';
    logout();
    window.location.href = '/login';
  }

  const permCount = userPermissions.length;
  const accessLabel =
    userRole === 'admin'   ? 'Full access' :
    permCount > 0          ? `${permCount} custom route${permCount !== 1 ? 's' : ''}` :
                             'Role defaults';

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-40 h-screen w-64 border-r bg-white transition-transform duration-300 ease-out flex flex-col',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex-shrink-0 h-16 flex items-center justify-between border-b border-gray-100 px-4 lg:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-transform hover:scale-105"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#B8953F] shadow-lg shadow-[#C9A84C]/20">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900">Kentaz</span>
              <span className="block text-[10px] text-[#C9A84C] font-medium -mt-1">Admin</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile user card */}
        <div className="lg:hidden p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white font-medium">{user?.name?.charAt(0).toUpperCase() ?? 'U'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-gray-500 capitalize flex items-center gap-1">
                {userRole === 'admin'
                  ? <><ShieldCheck className="w-3 h-3 text-purple-500" /> Admin</>
                  : permCount > 0
                  ? <><Key className="w-3 h-3 text-amber-500" /> {accessLabel}</>
                  : <><Lock className="w-3 h-3 text-gray-400" /> {userRole}</>
                }
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-0.5 p-3 overflow-y-auto flex-1 custom-scrollbar">
          {filteredNav.map((item, index) => {
            if (item.hasDropdown) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setProductsDropdownOpen(!productsDropdownOpen)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isProductsPage
                        ? 'bg-gradient-to-r from-[#C9A84C]/10 to-[#C9A84C]/5 text-[#C9A84C]'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn('h-5 w-5', isProductsPage ? 'text-[#C9A84C]' : '')} />
                      {item.name}
                    </div>
                    <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', productsDropdownOpen ? 'rotate-180' : '')} />
                  </button>

                  {productsDropdownOpen && (
                    <div className="mt-0.5 ml-3 space-y-0.5 animate-fade-in">
                      {productsSubMenu.map(subItem => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                              isSubActive
                                ? 'bg-[#C9A84C]/10 text-[#C9A84C]'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href ||
              (!item.external && item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-[#C9A84C]/10 to-[#C9A84C]/5 text-[#C9A84C]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-[#C9A84C]' : '')} />
                {item.name}
                {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#C9A84C]" />}
              </Link>
            );
          })}
        </nav>

        {/* Mobile logout */}
        <div className="lg:hidden p-4 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={() => { setSidebarOpen(false); handleLogout(); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>

        {/* Desktop footer */}
        <div className="hidden lg:block p-4 border-t border-gray-100 bg-white flex-shrink-0 space-y-3">
          <div className="rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 p-3.5 text-white">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-xs font-semibold truncate">{user?.name ?? 'User'}</p>
              {userRole === 'admin'
                ? <ShieldCheck className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                : permCount > 0
                ? <Key className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                : <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              }
            </div>
            <p className="text-[10px] text-gray-400 capitalize">{userRole} · {accessLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
