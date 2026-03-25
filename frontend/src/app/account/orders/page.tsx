'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Package, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/utils';

const orders = [
  {
    id: 'ORD-001',
    date: '2024-03-15',
    status: 'delivered',
    total: 349.99,
    items: 2,
  },
  {
    id: 'ORD-002',
    date: '2024-03-10',
    status: 'shipped',
    total: 89.99,
    items: 1,
  },
];

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  return (
    <div className="container mx-auto px-4 py-8">
      {success && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-800">Order Confirmed!</h3>
            <p className="text-green-600 text-sm">Thank you for your purchase.</p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold tracking-tight mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
          <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
          <Link href="/products">
            <Button>Shop Now</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Order</p>
                    <p className="font-semibold">{order.id}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{order.date}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium">{formatPrice(order.total)}</p>
                  </div>
                  <Badge
                    variant={order.status === 'delivered' ? 'default' : 'secondary'}
                  >
                    {order.status}
                  </Badge>
                </div>
                <Link href={`/account/orders/${order.id}`}>
                  <Button variant="outline" size="sm">
                    View Details <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
