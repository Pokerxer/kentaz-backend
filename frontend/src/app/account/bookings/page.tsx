'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const bookings = [
  {
    id: 'BK-001',
    service: 'Therapy Session',
    date: '2024-03-20',
    time: '10:00 AM',
    status: 'confirmed',
    total: 150,
  },
];

function BookingsPageContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  return (
    <div className="container mx-auto px-4 py-8">
      {success && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-800">Booking Confirmed!</h3>
            <p className="text-green-600 text-sm">We'll see you soon.</p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold tracking-tight mb-8">My Bookings</h1>

      {bookings.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
          <p className="text-muted-foreground mb-6">Book a service to get started</p>
          <Button>Book a Service</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-semibold">{booking.service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{booking.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">{booking.time}</p>
                  </div>
                  <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                </div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <BookingsPageContent />
    </Suspense>
  );
}
