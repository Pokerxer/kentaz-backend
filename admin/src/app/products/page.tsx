'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, Search, Filter, Eye, Edit, Trash2, Copy, Package, X } from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';

const products = [
  { id: 'prod_001', title: 'Classic Slim Fit Denim Jeans', status: 'published', price: 15000, inventory: 45, thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200' },
  { id: 'prod_002', title: 'Premium Cotton Polo Shirt', status: 'published', price: 8500, inventory: 120, thumbnail: 'https://images.unsplash.com/photo-1625910513413-5fc4e58c87e6?w=200' },
  { id: 'prod_003', title: 'Luxury Virgin Hair Weave', status: 'published', price: 35000, inventory: 25, thumbnail: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200' },
  { id: 'prod_004', title: 'Designer Leather Handbag', status: 'published', price: 35000, inventory: 15, thumbnail: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200' },
];

const statusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-700',
};

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64">
        <Header />
        <main className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="text-gray-500">Manage your product inventory</p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
              <Plus className="h-4 w-4" /> Add Product
            </button>
          </div>

          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="search" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-lg border bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inventory</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                          <Image src={product.thumbnail} alt={product.title} fill className="object-cover" />
                        </div>
                        <p className="font-medium text-gray-900">{product.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[product.status]}`}>{product.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{formatPrice(product.price)}</td>
                    <td className="px-6 py-4">{product.inventory} in stock</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="rounded-lg p-1.5 hover:bg-gray-100"><Eye className="h-4 w-4 text-gray-600" /></button>
                        <button className="rounded-lg p-1.5 hover:bg-gray-100"><Edit className="h-4 w-4 text-gray-600" /></button>
                        <button className="rounded-lg p-1.5 hover:bg-gray-100"><Trash2 className="h-4 w-4 text-gray-600" /></button>
                      </div>
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