'use client';

import { Calendar, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const bookings = [
  { id: 'BK-001', service: 'Therapy Session', customer: 'John Doe', date: '2024-03-20', time: '10:00 AM', status: 'confirmed' },
  { id: 'BK-002', service: 'Podcast Studio', customer: 'Jane Smith', date: '2024-03-21', time: '2:00 PM', status: 'pending' },
];

export default function AdminBookingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground">Manage service bookings</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Booking ID</th>
                <th className="p-4 font-medium">Service</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-border">
                  <td className="p-4 font-medium">{booking.id}</td>
                  <td className="p-4">{booking.service}</td>
                  <td className="p-4 text-muted-foreground">{booking.customer}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {booking.date} at {booking.time}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                    >
                      {booking.status}
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
