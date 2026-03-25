'use client';

import { Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/utils';

const orders = [
  { id: 'ORD-001', customer: 'John Doe', email: 'john@example.com', date: '2024-03-15', total: 349.99, status: 'delivered', items: 2 },
  { id: 'ORD-002', customer: 'Jane Smith', email: 'jane@example.com', date: '2024-03-14', total: 89.99, status: 'shipped', items: 1 },
  { id: 'ORD-003', customer: 'Bob Wilson', email: 'bob@example.com', date: '2024-03-13', total: 199.99, status: 'processing', items: 3 },
];

export default function AdminOrdersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Manage and track orders</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border">
                  <td className="p-4 font-medium">{order.id}</td>
                  <td className="p-4">
                    <div>
                      <p>{order.customer}</p>
                      <p className="text-sm text-muted-foreground">{order.email}</p>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{order.date}</td>
                  <td className="p-4">{formatPrice(order.total)}</td>
                  <td className="p-4">
                    <Badge
                      variant={
                        order.status === 'delivered' ? 'default' :
                        order.status === 'shipped' ? 'secondary' : 'outline'
                      }
                    >
                      {order.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
