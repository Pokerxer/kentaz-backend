'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Package, ArrowRight, CheckCircle, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped:    'bg-purple-50 text-purple-700',
  delivered:  'bg-emerald-50 text-emerald-700',
  cancelled:  'bg-red-50 text-red-700',
};

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('kentaz_token');
    if (!token) { setLoading(false); setError('Please log in to view your orders.'); return; }

    fetch(`${API}/api/store/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {success && (
        <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-4">
          <CheckCircle className="h-7 w-7 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Order Confirmed!</p>
            <p className="text-green-600 text-sm">Thank you for your purchase. We'll email you once it ships.</p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">My Orders</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{error}</p>
          <Link href="/login?redirect=/account/orders" className="mt-4 inline-block text-[#C9A84C] font-semibold text-sm">Log In</Link>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-[#FAFAFA] rounded-2xl border border-[#E5E5E5]">
          <ShoppingBag className="h-14 w-14 mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">No orders yet</h3>
          <p className="text-gray-400 text-sm mb-6">Start shopping to see your orders here.</p>
          <Link href="/products">
            <Button>Shop Now</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const statusStyle = STATUS_STYLES[order.status] ?? 'bg-gray-50 text-gray-600';
            const date = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—';
            return (
              <div key={order._id} className="bg-white border border-[#E5E5E5] rounded-2xl p-5 hover:border-[#C9A84C]/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-5">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Order ID</p>
                      <p className="font-mono text-sm font-semibold text-[#1A1A1A]">#{String(order._id).slice(-8).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Date</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">{date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Total</p>
                      <p className="text-sm font-bold text-[#C9A84C]">{formatPrice(order.total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Items</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">{order.items?.length ?? 0}</p>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle}`}>
                      {order.status}
                    </span>
                  </div>
                  <Link href={`/account?tab=orders&order=${order._id}`}>
                    <Button variant="outline" size="sm" className="gap-1 whitespace-nowrap">
                      View Details <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>

                {/* Item names preview */}
                {order.items?.length > 0 && (
                  <p className="mt-3 text-xs text-gray-400 line-clamp-1">
                    {order.items.map((i: any) => i.name || i.product?.name).filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}
