'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar, Clock, CheckCircle, ArrowLeft, ArrowRight,
  Mic, Heart, Video, Users, CreditCard, Loader2,
  AlertCircle, Star
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { usePaystack } from '@/lib/paystack';

const serviceInfo: Record<string, {
  name: string; icon: any; price: number; duration: number;
  description: string; sessionTypes: string[];
}> = {
  therapy: {
    name: 'Therapy Session',
    icon: Heart,
    price: 150,
    duration: 60,
    description: 'Professional therapy with licensed counselors',
    sessionTypes: ['in-person', 'online'],
  },
  podcast: {
    name: 'Podcast Studio',
    icon: Mic,
    price: 75,
    duration: 120,
    description: 'Professional recording with state-of-the-art equipment',
    sessionTypes: ['in-person'],
  },
};

type Therapist = { _id: string; name: string; avatar?: string; role: string };

type Step = 'service' | 'datetime' | 'details' | 'payment' | 'confirmation';

const steps: { key: Step; label: string }[] = [
  { key: 'service', label: 'Service' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'details', label: 'Details' },
  { key: 'payment', label: 'Payment' },
];

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initializePayment, verifyPayment, isReady: paystackReady } = usePaystack();

  const serviceType = (searchParams.get('type') || 'therapy') as 'therapy' | 'podcast';
  const service = serviceInfo[serviceType] || serviceInfo.therapy;

  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [sessionType, setSessionType] = useState<string>(service.sessionTypes[0] || 'in-person');
  const [selectedTherapist, setSelectedTherapist] = useState<string>('');
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const today = startOfDay(new Date());
  const dates = Array.from({ length: 21 }, (_, i) => addDays(today, i + 1));

  const fetchSlots = useCallback(async (date: Date) => {
    if (!date) return;
    setSelectedTime(null);
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('kentaz_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/bookings/slots?date=${date.toISOString()}&serviceType=${serviceType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch slots');
      const data = await res.json();
      setAvailableSlots(data);
    } catch (err) {
      const allSlots = serviceType === 'therapy'
        ? ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']
        : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
      setAvailableSlots(allSlots.map(t => ({ time: t, available: true })));
    } finally {
      setLoading(false);
    }
  }, [serviceType]);

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  // Fetch therapists when service type is therapy
  useEffect(() => {
    if (serviceType !== 'therapy') {
      setTherapists([]);
      return;
    }
    const token = localStorage.getItem('kentaz_token');
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/bookings/therapists?serviceType=${serviceType}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setTherapists(Array.isArray(data) ? data : []))
      .catch(() => setTherapists([]));
  }, [serviceType]);

  const canProceed = () => {
    if (currentStep === 'service') return true;
    if (currentStep === 'datetime') return !!selectedDate && !!selectedTime;
    if (currentStep === 'details') return true;
    return false;
  };

  const nextStep = () => {
    const stepOrder: Step[] = ['service', 'datetime', 'details', 'payment', 'confirmation'];
    const idx = stepOrder.indexOf(currentStep);
    if (idx < stepOrder.length - 1) setCurrentStep(stepOrder[idx + 1]);
  };

  const prevStep = () => {
    const stepOrder: Step[] = ['service', 'datetime', 'details', 'payment', 'confirmation'];
    const idx = stepOrder.indexOf(currentStep);
    if (idx > 0) setCurrentStep(stepOrder[idx - 1]);
  };

  const handleCreateBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('kentaz_token');
      if (!token) {
        router.push('/login?redirect=/services/booking?type=' + serviceType);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceType,
          therapistId: selectedTherapist || undefined,
          date: selectedDate?.toISOString(),
          timeSlot: selectedTime,
          duration: service.duration,
          amount: service.price,
          notes: notes || undefined,
          sessionType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create booking');
      }

      const booking = await res.json();
      setBookingId(booking._id);
      setCurrentStep('payment');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    setError(null);

    const userData = JSON.parse(localStorage.getItem('kentaz_user') || '{}');
    const email = userData.email;

    if (!email) {
      setError('Please log in to complete your booking.');
      router.push('/login?redirect=/services/booking?type=' + serviceType);
      return;
    }

    try {
      initializePayment({
        email,
        amount: service.price * 100,
        firstName: userData.name?.split(' ')[0] || '',
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        onSuccess: async (ref) => {
          const verified = await verifyPayment(ref.reference);
          if (verified) {
            setCurrentStep('confirmation');
          } else {
            setError('Payment verification failed. Please contact support with your reference: ' + ref.reference);
          }
        },
        onClose: () => {
          setError('Payment was cancelled. Your booking is saved and you can return to pay later.');
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const stepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-8">
        <div className="container mx-auto px-4">
          <Link href="/services" className="inline-flex items-center gap-2 text-white/60 hover:text-[#C9A84C] transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
              <service.icon className="w-6 h-6 text-[#C9A84C]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Book {service.name}</h1>
              <p className="text-white/60 text-sm">{service.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      {currentStep !== 'confirmation' && (
        <div className="bg-white border-b border-[#E5E5E5] py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-2 md:gap-4 max-w-2xl mx-auto">
              {steps.map((step, i) => {
                const isActive = step.key === currentStep;
                const isComplete = steps.findIndex(s => s.key === currentStep) > i;
                return (
                  <div key={step.key} className="flex items-center gap-2 md:gap-4">
                    <button
                      onClick={() => {
                        const idx = steps.findIndex(s => s.key === step.key);
                        const currentIdx = steps.findIndex(s => s.key === currentStep);
                        if (idx < currentIdx) setCurrentStep(step.key);
                      }}
                      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                        isActive ? 'text-[#C9A84C]' : isComplete ? 'text-[#1A1A1A]' : 'text-[#6B6B6B]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        isActive ? 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10' :
                        isComplete ? 'border-[#1A1A1A] text-[#1A1A1A] bg-[#1A1A1A]' :
                        'border-[#E5E5E5] text-[#6B6B6B]'
                      }`}>
                        {isComplete ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className="hidden md:inline">{step.label}</span>
                    </button>
                    {i < steps.length - 1 && (
                      <div className={`w-8 md:w-16 h-0.5 ${isComplete ? 'bg-[#1A1A1A]' : 'bg-[#E5E5E5]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Error */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Service Options */}
        {currentStep === 'service' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Choose Your Session Type</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {service.sessionTypes.includes('in-person') && (
                <button
                  onClick={() => setSessionType('in-person')}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    sessionType === 'in-person'
                      ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                      : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-[#C9A84C]" />
                    <span className="font-semibold text-[#1A1A1A]">In-Person</span>
                    {sessionType === 'in-person' && <CheckCircle className="w-4 h-4 text-[#C9A84C] ml-auto" />}
                  </div>
                  <p className="text-sm text-[#6B6B6B]">Visit our studio in Abuja for a face-to-face session.</p>
                </button>
              )}
              {service.sessionTypes.includes('online') && (
                <button
                  onClick={() => setSessionType('online')}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    sessionType === 'online'
                      ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                      : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Video className="w-5 h-5 text-[#C9A84C]" />
                    <span className="font-semibold text-[#1A1A1A]">Online</span>
                    {sessionType === 'online' && <CheckCircle className="w-4 h-4 text-[#C9A84C] ml-auto" />}
                  </div>
                  <p className="text-sm text-[#6B6B6B]">Connect via secure video call from anywhere.</p>
                </button>
              )}
            </div>

            {therapists.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Choose Your Therapist</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedTherapist('')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedTherapist === ''
                        ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                        : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-[#C9A84C]" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1A1A1A]">No Preference</div>
                        <div className="text-sm text-[#6B6B6B]">Best available therapist</div>
                      </div>
                      {selectedTherapist === '' && <CheckCircle className="w-4 h-4 text-[#C9A84C] ml-auto" />}
                    </div>
                  </button>
                  {therapists.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => setSelectedTherapist(t._id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedTherapist === t._id
                          ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                          : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {t.avatar ? (
                          <div
                            className="w-12 h-12 rounded-full bg-cover bg-center flex-shrink-0"
                            style={{ backgroundImage: `url(${t.avatar})` }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-[#C9A84C]" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-[#1A1A1A]">{t.name}</div>
                          <div className="text-sm text-[#6B6B6B] capitalize">{t.role === 'therapist' ? 'Therapist' : t.role}</div>
                        </div>
                        {selectedTherapist === t._id && <CheckCircle className="w-4 h-4 text-[#C9A84C] ml-auto" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={nextStep} className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {currentStep === 'datetime' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Select Date & Time</h2>

            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#C9A84C]" />
                Select Date
              </h3>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-2">
                {dates.map((date) => {
                  const isPast = isBefore(date, today);
                  return (
                    <button
                      key={date.toISOString()}
                      disabled={isPast}
                      onClick={() => setSelectedDate(date)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedDate?.toDateString() === date.toDateString()
                          ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                          : isPast
                          ? 'border-[#E5E5E5] bg-[#F5F5F0] text-[#C0C0C0] cursor-not-allowed'
                          : 'border-[#E5E5E5] hover:border-[#C9A84C]/50 text-[#1A1A1A]'
                      }`}
                    >
                      <div className="text-xs opacity-70">{format(date, 'EEE')}</div>
                      <div className="font-semibold">{format(date, 'd')}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#6B6B6B]">Select a date up to 3 weeks in advance</p>
            </Card>

            {selectedDate && (
              <Card className="p-6 mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#C9A84C]" />
                  Select Time
                  {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedTime === slot.time
                          ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                          : slot.available
                          ? 'border-[#E5E5E5] hover:border-[#C9A84C]/50 text-[#1A1A1A]'
                          : 'border-[#E5E5E5] bg-[#F5F5F0] text-[#C0C0C0] cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
                {availableSlots.length === 0 && !loading && (
                  <p className="text-sm text-[#6B6B6B]">Loading available times...</p>
                )}
                <p className="text-xs text-[#6B6B6B] mt-3">
                  Greyed out times are already booked
                </p>
              </Card>
            )}

            <div className="flex justify-between">
              <Button onClick={prevStep} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={nextStep} disabled={!canProceed()} className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Notes */}
        {currentStep === 'details' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Review Your Booking</h2>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="p-6 lg:col-span-2">
                <h3 className="font-semibold mb-4">Booking Details</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3 pb-4 border-b border-[#E5E5E5]">
                    <service.icon className="w-5 h-5 text-[#C9A84C] mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#1A1A1A]">{service.name}</div>
                      <div className="text-[#6B6B6B]">{service.description}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[#6B6B6B] mb-1">Date</div>
                      <div className="font-medium text-[#1A1A1A]">
                        {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#6B6B6B] mb-1">Time</div>
                      <div className="font-medium text-[#1A1A1A]">{selectedTime || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[#6B6B6B] mb-1">Session Type</div>
                      <div className="font-medium text-[#1A1A1A] capitalize">{sessionType}</div>
                    </div>
                    <div>
                      <div className="text-[#6B6B6B] mb-1">Duration</div>
                      <div className="font-medium text-[#1A1A1A]">{service.duration} minutes</div>
                    </div>
                    {selectedTherapist && (
                      <div className="col-span-2">
                        <div className="text-[#6B6B6B] mb-1">Therapist</div>
                        <div className="font-medium text-[#1A1A1A]">
                          {therapists.find(t => t._id === selectedTherapist)?.name || selectedTherapist}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Additional Notes <span className="text-[#6B6B6B] font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific topics you'd like to discuss, special requirements, etc."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#1A1A1A] placeholder:text-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C]/50 resize-none text-sm"
                  />
                </div>
              </Card>

              <Card className="p-6 h-fit">
                <h3 className="font-semibold mb-4">Summary</h3>
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">{service.name}</span>
                    <span className="font-medium">${service.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Duration</span>
                    <span>{service.duration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Session</span>
                    <span className="capitalize">{sessionType}</span>
                  </div>
                  <div className="border-t border-[#E5E5E5] pt-3 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-[#C9A84C]">${service.price}</span>
                  </div>
                </div>
                <p className="text-xs text-center text-[#6B6B6B] mb-3">
                  Payment is securely processed via Paystack. You won&apos;t be charged until you confirm.
                </p>
              </Card>
            </div>

            <div className="flex justify-between mt-8">
              <Button onClick={prevStep} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleCreateBooking}
                loading={loading}
                className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2"
              >
                Proceed to Payment
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {currentStep === 'payment' && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#C9A84C]/15 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-[#C9A84C]" />
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Complete Your Payment</h2>
              <p className="text-[#6B6B6B] mb-8">
                Your booking is reserved. Complete payment to confirm your session.
              </p>

              <div className="bg-[#FAFAFA] rounded-xl p-6 mb-8 text-left">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#6B6B6B]">Service</span>
                  <span className="font-semibold text-[#1A1A1A]">{service.name}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#6B6B6B]">Date & Time</span>
                  <span className="font-semibold text-[#1A1A1A]">
                    {selectedDate ? format(selectedDate, 'MMM d') : ''} at {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#6B6B6B]">Session Type</span>
                  <span className="font-semibold text-[#1A1A1A] capitalize">{sessionType}</span>
                </div>
                <div className="border-t border-[#E5E5E5] pt-4 flex justify-between items-center">
                  <span className="text-lg font-semibold text-[#1A1A1A]">Total</span>
                  <span className="text-2xl font-bold text-[#C9A84C]">${service.price}</span>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                loading={paymentLoading}
                disabled={!paystackReady}
                className="w-full bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2 py-6 text-base"
                size="lg"
              >
                <CreditCard className="w-5 h-5" />
                Pay with Paystack
              </Button>

              <p className="text-xs text-[#6B6B6B] mt-4">
                Your payment is secured by Paystack. We accept Visa, Mastercard, and bank transfers.
              </p>

              <div className="flex justify-between mt-6">
                <Button onClick={prevStep} variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Confirmation */}
        {currentStep === 'confirmation' && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-8 md:p-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3">Booking Confirmed!</h2>
              <p className="text-[#6B6B6B] mb-8 max-w-md mx-auto">
                Your {service.name.toLowerCase()} has been booked for{' '}
                <span className="font-semibold text-[#1A1A1A]">
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''} at {selectedTime}
                </span>.
                A confirmation has been sent to your email.
              </p>

              <div className="bg-[#FAFAFA] rounded-xl p-6 mb-8 text-left">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Service</span>
                    <span className="font-medium text-[#1A1A1A]">{service.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Date</span>
                    <span className="font-medium text-[#1A1A1A]">
                      {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Time</span>
                    <span className="font-medium text-[#1A1A1A]">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Session Type</span>
                    <span className="font-medium text-[#1A1A1A] capitalize">{sessionType}</span>
                  </div>
                  <div className="border-t border-[#E5E5E5] pt-3 flex justify-between font-semibold">
                    <span>Amount Paid</span>
                    <span className="text-[#C9A84C]">${service.price}</span>
                  </div>
                </div>
              </div>

              {sessionType === 'in-person' && (
                <div className="bg-[#C9A84C]/10 rounded-xl p-4 mb-8 text-left">
                  <div className="font-semibold text-[#1A1A1A] mb-1">Venue</div>
                  <div className="text-sm text-[#6B6B6B]">
                    Suite 35, 911 Mall Usuma Street, Abuja
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/account/bookings">
                  <Button className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2 w-full sm:w-auto">
                    View My Bookings
                  </Button>
                </Link>
                <Link href="/services">
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    Explore More Services
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
