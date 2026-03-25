'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, ShoppingBag, Calendar, TrendingUp, DollarSign, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminDashboard() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>;
  }

  if (!session || session.user.role !== 'admin') {
    redirect('/');
  }

  const stats = [
    { label: 'Total Revenue', value: '$12,450', icon: DollarSign, change: '+12%' },
    { label: 'Orders', value: '156', icon: Package, change: '+8%' },
    { label: 'Products', value: '48', icon: ShoppingBag, change: '+3' },
    { label: 'Bookings', value: '23', icon: Calendar, change: '+5' },
  ];

  const menuItems = [
    { name: 'Products', href: '/admin/products', icon: ShoppingBag, description: 'Manage product catalog' },
    { name: 'Orders', href: '/admin/orders', icon: Package, description: 'View and manage orders' },
    { name: 'Bookings', href: '/admin/bookings', icon: Calendar, description: 'Manage service bookings' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your store from here</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <stat.icon className="h-8 w-8 text-primary" />
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold mt-4">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
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
