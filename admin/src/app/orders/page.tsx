'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Search, Eye, Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const orders = [
  { id: 'ORD-001', display_id: '#1001', customer: 'Adaobi Nwankwo', email: 'adaobi@example.com', total: 45000, status: 'processing', items: 2, date: '2024-01-15' },
  { id: 'ORD-002', display_id: '#1002', customer: 'Chidi Okonkwo', email: 'chidi@example.com', total: 28500, status: 'shipped', items: 1, date: '2024-01-15' },
  { id: 'ORD-003', display_id: '#1003', customer: 'Ngozi Eze', email: 'ngozi@example.com', total: 78000, status: 'delivered', items: 3, date: '2024-01-14' },
  { id: 'ORD-004', display_id: '#1004', customer: 'Emeka Obi', email: 'emeka@example.com', total: 15500, status: 'pending', items: 1, date: '2024-01-14' },
];

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing: { color: 'bg-blue-100 text-blue-700', icon: Package },
  shipped: { color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredOrders = orders.filter(order => order.customer.toLowerCase().includes(searchQuery.toLowerCase()) || order.id.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64">
        <Header />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-500">Manage and track customer orders</p>
          </div>

          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="search" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-lg border bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => {
                  const config = statusConfig[order.status];
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{order.display_id}</p>
                        <p className="text-sm text-gray-500">{order.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{order.customer}</p>
                        <p className="text-sm text-gray-500">{order.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
                          <config.icon className="h-3 w-3" />
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{formatPrice(order.total)}</td>
                      <td className="px-6 py-4 text-gray-600">{order.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="rounded-lg p-1.5 hover:bg-gray-100"><Eye className="h-4 w-4 text-gray-600" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}