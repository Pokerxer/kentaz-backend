'use client';

import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Clock,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const stats = [
  {
    name: 'Total Revenue',
    value: '₦2,450,000',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
  },
  {
    name: 'Orders',
    value: '156',
    change: '+8.2%',
    trend: 'up',
    icon: ShoppingCart,
  },
  {
    name: 'Customers',
    value: '89',
    change: '+5.1%',
    trend: 'up',
    icon: Users,
  },
  {
    name: 'Avg. Order Value',
    value: '₦15,705',
    change: '-2.3%',
    trend: 'down',
    icon: TrendingUp,
  },
];

const recentOrders = [
  {
    id: 'ORD-001',
    customer: 'Adaobi Nwankwo',
    total: 45000,
    status: 'Processing',
    date: '2 hours ago',
  },
  {
    id: 'ORD-002',
    customer: 'Chidi Okonkwo',
    total: 28500,
    status: 'Shipped',
    date: '4 hours ago',
  },
  {
    id: 'ORD-003',
    customer: 'Ngozi Eze',
    total: 78000,
    status: 'Delivered',
    date: '6 hours ago',
  },
  {
    id: 'ORD-004',
    customer: 'Emeka Obi',
    total: 15500,
    status: 'Pending',
    date: '8 hours ago',
  },
];

const topProducts = [
  { name: 'Classic Slim Fit Denim Jeans', sales: 45, revenue: 675000 },
  { name: 'Premium Cotton Polo Shirt', sales: 32, revenue: 272000 },
  { name: 'Luxury Virgin Hair Weave', sales: 28, revenue: 980000 },
  { name: 'Designer Leather Handbag', sales: 21, revenue: 735000 },
];

const statusColors: Record<string, string> = {
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64">
        <Header />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.name} className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <stat.icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {stat.change}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                <a href="/orders" className="text-sm text-blue-600 hover:underline">View all</a>
              </div>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.customer}</p>
                        <p className="text-sm text-gray-500">{order.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatPrice(order.total)}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
                <a href="/products" className="text-sm text-blue-600 hover:underline">View all</a>
              </div>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <p className="font-medium text-gray-900">{product.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatPrice(product.revenue)}</p>
                      <p className="text-sm text-gray-500">{product.sales} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}