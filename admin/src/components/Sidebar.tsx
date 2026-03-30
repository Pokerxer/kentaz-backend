'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAdminStore } from '@/store/admin-store';
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
  Menu,
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
} from 'lucide-react';

const productsSubMenu = [
  { name: 'All Products', href: '/products', icon: List },
  { name: 'Add Product', href: '/products/new', icon: Plus },
  { name: 'Import Products', href: '/products/import', icon: Upload },
  { name: 'Quantity Adjustment', href: '/products/adjustment', icon: ArrowUpDown },
  { name: 'Stock Count', href: '/products/stock-count', icon: ClipboardList },
];

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Point of Sale', href: '/pos/dashboard', icon: Monitor, external: true },
  { name: 'POS Sales', href: '/pos/sales', icon: Receipt, external: true },
  { name: 'Products', href: '/products', icon: Package, hasDropdown: true },
  { name: 'Inventory', href: '/inventory', icon: Box },
  { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Staff', href: '/staff', icon: UserCog },
  { name: 'Categories', href: '/categories', icon: Tags },
  { name: 'Discounts', href: '/discounts', icon: Percent },
  { name: 'Gift Cards', href: '/gift-cards', icon: CreditCard },
  { name: 'Shipping', href: '/shipping', icon: Truck },
  { name: 'Reviews', href: '/reviews', icon: MessageSquare },
  { name: 'Wishlists', href: '/wishlists', icon: Heart },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAdminStore();
  const isProductsActive = pathname.startsWith('/products') || pathname.startsWith('/inventory') || pathname.startsWith('/purchases');
  const isProductsPage = pathname === '/products' || pathname.startsWith('/products/') || pathname.startsWith('/inventory') || pathname.startsWith('/purchases');
  
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(isProductsActive);

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
        "fixed top-0 left-0 z-40 h-screen w-64 border-r bg-white transition-transform duration-300 ease-out flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
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
            title="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* User info - visible on mobile */}
        <div className="lg:hidden p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center shadow-md">
              <span className="text-white font-medium">A</span>
            </div>
            <div>
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-gray-500">admin@kentaz.com</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1 p-4 overflow-y-auto h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)] custom-scrollbar">
          {navigation.map((item, index) => {
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
                      <item.icon className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        isProductsPage ? "text-[#C9A84C]" : ""
                      )} />
                      {item.name}
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      productsDropdownOpen ? "rotate-180" : ""
                    )} />
                  </button>
                  
                  {productsDropdownOpen && (
                    <div className="mt-1 ml-3 space-y-1 animate-fade-in">
                      {productsSubMenu.map((subItem) => {
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
                    ? 'bg-gradient-to-r from-[#C9A84C]/10 to-[#C9A84C]/5 text-[#C9A84C] border-l-3 border-[#C9A84C]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive ? "text-[#C9A84C]" : "group-hover:scale-110"
                )} />
                {item.name}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#C9A84C]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout button - mobile */}
        <div className="lg:hidden p-4 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={() => {
              setSidebarOpen(false);
              window.location.href = '/login';
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>

        {/* Desktop footer */}
        <div className="hidden lg:block p-4 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 p-4 text-white">
            <p className="text-xs font-medium">Kentaz Admin</p>
            <p className="text-[10px] text-gray-400">v1.0.0 · Luxury. Lifestyle. Wellness.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
