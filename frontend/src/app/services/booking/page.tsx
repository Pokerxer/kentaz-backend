'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { format, addDays, setHours, setMinutes } from 'date-fns';

const timeSlots = [
  '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'
];

export default function BookingPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  const handleBooking = () => {
    if (!selectedDate || !selectedTime) return;
    setLoading(true);

    setTimeout(() => {
      router.push('/account/bookings?success=true');
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Book a Service</h1>
      <p className="text-muted-foreground mb-8">Select your preferred date and time</p>

      <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-8">
            {dates.map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedDate?.toDateString() === date.toDateString()
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="text-xs opacity-70">{format(date, 'EEE')}</div>
                <div className="font-semibold">{format(date, 'd')}</div>
              </button>
            ))}
          </div>

          {selectedDate && (
            <>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Select Time
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      selectedTime === time
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="p-6 h-fit sticky top-20">
          <h3 className="font-semibold mb-4">Booking Summary</h3>
          
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">Therapy Session</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>60 minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{selectedDate ? format(selectedDate, 'MMM d, yyyy') : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span>{selectedTime || '-'}</span>
            </div>
          </div>

          <div className="border-t border-border my-4 pt-4">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>$150.00</span>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!selectedDate || !selectedTime}
            loading={loading}
            onClick={handleBooking}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm Booking
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Free cancellation up to 24 hours before
          </p>
        </Card>
      </div>
    </div>
  );
}
