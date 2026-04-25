'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ShoppingBag, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useAppSelector } from '@/store/hooks';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.user);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.replace('/');
    }
  }, [isAuthenticated, user, router]);

  // Not authenticated yet — wait for Redux hydration
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]" />
      </div>
    );
  }

  if (user?.role !== 'admin') return null;

  const menuItems = [
    { name: 'Products', href: '/admin/products', icon: ShoppingBag, description: 'Manage product catalog' },
    { name: 'Orders', href: '/admin/orders', icon: Package, description: 'View and manage orders' },
    { name: 'Bookings', href: '/admin/bookings', icon: Calendar, description: 'Manage service bookings' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user.name}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <Card hover className="h-full">
              <CardContent className="p-6">
                <item.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
