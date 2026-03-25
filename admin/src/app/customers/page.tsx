'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Search, Eye, Mail, Phone } from 'lucide-react';

const customers = [
  { id: 'cust_001', name: 'Adaobi Nwankwo', email: 'adaobi@example.com', phone: '+234 801 234 5678', orders: 12, totalSpent: 345000, joinDate: '2023-06-15' },
  { id: 'cust_002', name: 'Chidi Okonkwo', email: 'chidi@example.com', phone: '+234 802 345 6789', orders: 8, totalSpent: 228000, joinDate: '2023-08-20' },
  { id: 'cust_003', name: 'Ngozi Eze', email: 'ngozi@example.com', phone: '+234 803 456 7890', orders: 15, totalSpent: 520000, joinDate: '2023-04-10' },
];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64">
        <Header />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-500">View and manage your customers</p>
          </div>

          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="search" placeholder="Search customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-lg border bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Join Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{customer.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3 w-3" /> {customer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">{customer.orders}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">₦{customer.totalSpent.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600">{customer.joinDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="rounded-lg p-1.5 hover:bg-gray-100"><Eye className="h-4 w-4 text-gray-600" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}