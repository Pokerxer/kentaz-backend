'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, CheckCircle, Loader2, Clock, MapPin, Video, Mic, Heart, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-blue-50 text-blue-700',
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  therapy: Heart,
  podcast: Mic,
};

function BookingsPageContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('kentaz_token');
    if (!token) { setLoading(false); setError('Please log in to view your bookings.'); return; }

    fetch(`${API}/api/store/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load bookings.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {success && (
        <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-4">
          <CheckCircle className="h-7 w-7 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Booking Confirmed!</p>
            <p className="text-green-600 text-sm">We'll see you soon. Check your email for details.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">My Bookings</h1>
        <Link href="/services/booking">
          <Button size="sm" className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] font-semibold">
            Book a Service
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{error}</p>
          <Link href="/login?redirect=/account/bookings" className="mt-4 inline-block text-[#C9A84C] font-semibold text-sm">Log In</Link>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-[#FAFAFA] rounded-2xl border border-[#E5E5E5]">
          <Calendar className="h-14 w-14 mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">No bookings yet</h3>
          <p className="text-gray-400 text-sm mb-6">Book a therapy session or podcast studio to get started.</p>
          <Link href="/services/booking">
            <Button className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] font-semibold">Book a Service</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-gray-50 text-gray-600';
            const ServiceIcon = SERVICE_ICONS[booking.serviceType] ?? Calendar;
            const date = booking.date
              ? new Date(booking.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
              : '—';
            const isPaid = booking.paymentStatus === 'paid';
            const isOnline = booking.sessionType === 'online';

            return (
              <div key={booking._id} className="bg-white border border-[#E5E5E5] rounded-2xl p-5 hover:border-[#C9A84C]/40 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                    <ServiceIcon className="h-5 w-5 text-[#C9A84C]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-bold text-[#1A1A1A] text-sm">
                        {booking.serviceType === 'therapy' ? 'Therapy Session' : 'Podcast Studio'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusStyle}`}>
                        {booking.status}
                      </span>
                      {!isPaid && booking.status !== 'cancelled' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600">
                          Payment Pending
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {booking.timeSlot} WAT · {booking.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        {isOnline ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {isOnline ? 'Online' : 'In-Person'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#C9A84C] text-sm">₦{booking.amount?.toLocaleString('en-NG')}</p>
                    {isPaid && <p className="text-xs text-emerald-600 font-medium mt-0.5">Paid</p>}
                  </div>
                </div>

                {/* Unpaid CTA */}
                {!isPaid && booking.status !== 'cancelled' && (
                  <div className="mt-4 pt-4 border-t border-[#F0F0F0] flex items-center justify-between">
                    <p className="text-xs text-gray-400">Complete payment to confirm this slot.</p>
                    <Link href={`/services/booking?type=${booking.serviceType}`}>
                      <Button size="sm" className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] font-semibold text-xs">
                        Complete Payment
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    }>
      <BookingsPageContent />
    </Suspense>
  );
}
