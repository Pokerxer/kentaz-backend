'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SafeImage from '@/components/ui/SafeImage';
import {
  Calendar, Clock, CheckCircle, ArrowLeft, ArrowRight,
  Mic, Heart, Video, Users, CreditCard, Loader2,
  AlertCircle, MapPin, Lock, Phone, Star, ChevronRight,
  Smile, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format, addDays, startOfDay } from 'date-fns';
import { usePaystack } from '@/lib/paystack';

// ── Service config ──────────────────────────────────────────
const serviceInfo: Record<string, {
  name: string;
  icon: React.ElementType;
  priceNGN: number;
  duration: number;
  description: string;
  sessionTypes: ('in-person' | 'online')[];
  color: string;
}> = {
  therapy: {
    name: 'Therapy Session',
    icon: Heart,
    priceNGN: 25000,
    duration: 60,
    description: 'Confidential one-on-one session with a licensed therapist',
    sessionTypes: ['in-person', 'online'],
    color: 'rose',
  },
  podcast: {
    name: 'Podcast Studio',
    icon: Mic,
    priceNGN: 30000,   // 2-hr min @ ₦15k/hr
    duration: 120,
    description: 'Professional studio booking with editing included',
    sessionTypes: ['in-person'],
    color: 'amber',
  },
};

// ── Intake options ──────────────────────────────────────────
const intakeReasons = [
  { value: 'anxiety', label: 'Anxiety or Stress', icon: '😰' },
  { value: 'depression', label: 'Depression or Low Mood', icon: '🌧️' },
  { value: 'relationships', label: 'Relationship Issues', icon: '💔' },
  { value: 'trauma', label: 'Trauma or PTSD', icon: '🩹' },
  { value: 'grief', label: 'Grief or Loss', icon: '🕯️' },
  { value: 'self_esteem', label: 'Self-Esteem or Identity', icon: '🪞' },
  { value: 'burnout', label: 'Work Burnout', icon: '🔥' },
  { value: 'family', label: 'Family Dynamics', icon: '🏡' },
  { value: 'other', label: 'Something Else', icon: '💬' },
];

const intakeApproaches = [
  { value: 'no_preference', label: 'No Preference — Therapist Decides' },
  { value: 'cbt', label: 'Cognitive Behavioural Therapy (CBT)' },
  { value: 'talk', label: 'Talk Therapy' },
  { value: 'holistic', label: 'Holistic / Mindfulness' },
  { value: 'trauma_informed', label: 'Trauma-Informed' },
];

// ── Types ───────────────────────────────────────────────────
type Therapist = {
  _id: string;
  name: string;
  avatar?: string;
  role: string;
  specialization?: string;
  bio?: string;
  yearsExp?: number;
  approachTags?: string[];
};

type Step = 'service' | 'datetime' | 'intake' | 'payment' | 'confirmation';

// Steps for therapy vs podcast
function getSteps(serviceType: string): { key: Step; label: string }[] {
  if (serviceType === 'therapy') {
    return [
      { key: 'service', label: 'Setup' },
      { key: 'datetime', label: 'Date & Time' },
      { key: 'intake', label: 'About You' },
      { key: 'payment', label: 'Payment' },
    ];
  }
  return [
    { key: 'service', label: 'Setup' },
    { key: 'datetime', label: 'Date & Time' },
    { key: 'intake', label: 'Details' },
    { key: 'payment', label: 'Payment' },
  ];
}

function formatNGN(n: number) {
  return '₦' + n.toLocaleString('en-NG');
}

// ── Main component ──────────────────────────────────────────
function BookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady: paystackReady } = usePaystack();

  const serviceType = (searchParams.get('type') || 'therapy') as 'therapy' | 'podcast';
  const service = serviceInfo[serviceType] ?? serviceInfo.therapy;
  const steps = getSteps(serviceType);

  // ── State ─────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [sessionType, setSessionType] = useState<'in-person' | 'online'>(service.sessionTypes[0]);
  const [selectedTherapist, setSelectedTherapist] = useState<string>('');
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Intake form state
  const [intakeReason, setIntakeReason] = useState<string>('');
  const [intakeFirstTime, setIntakeFirstTime] = useState<boolean | null>(null);
  const [intakeApproach, setIntakeApproach] = useState<string>('no_preference');

  const today = startOfDay(new Date());
  const dates = Array.from({ length: 21 }, (_, i) => addDays(today, i + 1));

  // ── Data fetching ─────────────────────────────────────────
  const fetchSlots = useCallback(async (date: Date) => {
    setSelectedTime(null);
    setSlotsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('kentaz_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/bookings/slots?date=${date.toISOString()}&serviceType=${serviceType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('slot fetch failed');
      setAvailableSlots(await res.json());
    } catch {
      const fallback = serviceType === 'therapy'
        ? ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']
        : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
      setAvailableSlots(fallback.map(t => ({ time: t, available: true })));
    } finally {
      setSlotsLoading(false);
    }
  }, [serviceType]);

  useEffect(() => { if (selectedDate) fetchSlots(selectedDate); }, [selectedDate, fetchSlots]);

  useEffect(() => {
    if (serviceType !== 'therapy') return;
    const token = localStorage.getItem('kentaz_token');
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/bookings/therapists?serviceType=therapy`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setTherapists(Array.isArray(d) ? d : []))
      .catch(() => setTherapists([]));
  }, [serviceType]);

  // ── Navigation ────────────────────────────────────────────
  const stepOrder = steps.map(s => s.key);

  const canProceed = () => {
    if (currentStep === 'service') return true;
    if (currentStep === 'datetime') return !!selectedDate && !!selectedTime;
    if (currentStep === 'intake') {
      if (serviceType === 'therapy') return !!intakeReason && intakeFirstTime !== null;
      return true;
    }
    return false;
  };

  const nextStep = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx < stepOrder.length - 1) setCurrentStep(stepOrder[idx + 1]);
  };

  const prevStep = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx > 0) setCurrentStep(stepOrder[idx - 1]);
  };

  // ── Booking creation ──────────────────────────────────────
  const handleCreateBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('kentaz_token');
      if (!token) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/services/booking?type=${serviceType}`)}`);
        return;
      }
      const body: Record<string, unknown> = {
        serviceType,
        therapistId: selectedTherapist || undefined,
        date: selectedDate?.toISOString(),
        timeSlot: selectedTime,
        duration: service.duration,
        amount: service.priceNGN,
        notes: notes || undefined,
        sessionType,
      };
      if (serviceType === 'therapy') {
        body.intake = {
          reason: intakeReason,
          firstTime: intakeFirstTime,
          approach: intakeApproach,
        };
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create booking');
      }
      const booking = await res.json();
      setBookingId(booking._id);
      nextStep();   // go to payment
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Payment ───────────────────────────────────────────────
  const handlePayment = async () => {
    if (!bookingId) {
      setError('No booking found. Please try again.');
      return;
    }
    setPaymentLoading(true);
    setError(null);
    const userData = JSON.parse(localStorage.getItem('kentaz_user') || '{}');
    if (!userData.email) {
      setError('Please log in to complete your booking.');
      router.push(`/login?callbackUrl=${encodeURIComponent(`/services/booking?type=${serviceType}`)}`);
      setPaymentLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('kentaz_token');
      const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

      // Step 1: initialize on backend — get booking-tied reference
      const initRes = await fetch(`${BASE}/api/store/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!initRes.ok) {
        const d = await initRes.json();
        throw new Error(d.error || 'Failed to initialise payment');
      }
      const { accessCode, reference } = await initRes.json();

      // Step 2: open Paystack popup with the booking-tied access code
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: userData.email,
        amount: service.priceNGN * 100,
        access_code: accessCode,
        ref: reference,
        callback: async (txn: { reference: string }) => {
          try {
            // Step 3: verify on backend — marks booking paid + confirmed
            const vRes = await fetch(`${BASE}/api/store/bookings/${bookingId}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ reference: txn.reference }),
            });
            if (!vRes.ok) {
              const d = await vRes.json();
              setError(`Paid but verification failed — reference: ${txn.reference}. Contact support.`);
              console.error('verify error', d);
              return;
            }
            setCurrentStep('confirmation');
            // Redirect to account bookings after a short delay so user can see the confirmation
            setTimeout(() => router.push('/account/bookings'), 4000);
          } catch {
            setError(`Paid but verification failed — reference: ${txn.reference}. Contact support.`);
          }
        },
        onClose: () => {
          setError('Payment was cancelled. Your booking is saved — return to pay later.');
        },
      });
      handler.openIframe();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialise payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const stepIndex = steps.findIndex(s => s.key === currentStep);
  const isTherapy = serviceType === 'therapy';

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAFA]">

      {/* Header */}
      <div className="bg-[#0a0a0a] py-8">
        <div className="container mx-auto px-4">
          <Link href="/services" className="inline-flex items-center gap-2 text-white/50 hover:text-[#C9A84C] transition-colors mb-5 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <service.icon className="w-6 h-6 text-[#C9A84C]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Book {service.name}</h1>
              <p className="text-white/50 text-sm">{service.description}</p>
            </div>
            <div className="ml-auto hidden sm:block text-right">
              <div className="text-2xl font-black text-[#C9A84C]">{formatNGN(service.priceNGN)}</div>
              <div className="text-white/40 text-xs">{service.duration}-min session</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      {currentStep !== 'confirmation' && (
        <div className="bg-white border-b border-[#E5E5E5] py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-1 md:gap-3 max-w-lg mx-auto">
              {steps.map((step, i) => {
                const isActive = step.key === currentStep;
                const isComplete = stepIndex > i;
                return (
                  <div key={step.key} className="flex items-center gap-1 md:gap-3">
                    <button
                      onClick={() => { if (isComplete) setCurrentStep(step.key); }}
                      disabled={!isComplete}
                      className={`flex items-center gap-1.5 text-xs md:text-sm font-medium transition-colors ${
                        isActive ? 'text-[#C9A84C]' : isComplete ? 'text-[#1A1A1A] cursor-pointer' : 'text-[#C0C0C0] cursor-default'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        isActive ? 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10' :
                        isComplete ? 'border-[#C9A84C] text-white bg-[#C9A84C]' :
                        'border-[#E5E5E5] text-[#C0C0C0]'
                      }`}>
                        {isComplete ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className="hidden md:inline">{step.label}</span>
                    </button>
                    {i < steps.length - 1 && (
                      <div className={`w-6 md:w-12 h-0.5 transition-colors ${isComplete ? 'bg-[#C9A84C]' : 'bg-[#E5E5E5]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 md:py-10">
        {/* Error */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* ── STEP 1: SETUP ─────────────────────────────── */}
        {currentStep === 'service' && (
          <div className="max-w-3xl mx-auto">
            {isTherapy && (
              <div className="mb-8 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-semibold text-sm mb-0.5">100% Confidential</p>
                  <p className="text-blue-600 text-xs leading-relaxed">
                    Everything shared in your session stays private. We are bound by strict ethical and legal confidentiality standards.
                  </p>
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold text-[#1A1A1A] mb-5">
              {isTherapy ? 'How would you like to meet?' : 'Session Format'}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {service.sessionTypes.includes('in-person') && (
                <button
                  onClick={() => setSessionType('in-person')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    sessionType === 'in-person'
                      ? 'border-[#C9A84C] bg-[#C9A84C]/5 shadow-lg shadow-[#C9A84C]/10'
                      : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-[#C9A84C]" />
                      </div>
                      <span className="font-bold text-[#1A1A1A]">In-Person</span>
                    </div>
                    {sessionType === 'in-person' && <CheckCircle className="w-5 h-5 text-[#C9A84C]" />}
                  </div>
                  <p className="text-sm text-[#6B6B6B] leading-relaxed">
                    {isTherapy
                      ? 'Private room at our Abuja studio. A warm, distraction-free environment.'
                      : 'Visit our professional studio with full equipment access.'}
                  </p>
                  <p className="text-xs text-[#9B9B9B] mt-2">Suite 35, 911 Mall, Usuma St., Abuja</p>
                </button>
              )}
              {service.sessionTypes.includes('online') && (
                <button
                  onClick={() => setSessionType('online')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all relative ${
                    sessionType === 'online'
                      ? 'border-[#C9A84C] bg-[#C9A84C]/5 shadow-lg shadow-[#C9A84C]/10'
                      : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/40'
                  }`}
                >
                  <div className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full bg-[#C9A84C] text-[9px] font-bold text-black tracking-wide uppercase">Most Popular</div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                        <Video className="w-5 h-5 text-[#C9A84C]" />
                      </div>
                      <span className="font-bold text-[#1A1A1A]">Online</span>
                    </div>
                    {sessionType === 'online' && <CheckCircle className="w-5 h-5 text-[#C9A84C]" />}
                  </div>
                  <p className="text-sm text-[#6B6B6B] leading-relaxed">
                    Secure, encrypted video call. Attend from any private space across Nigeria.
                  </p>
                  <p className="text-xs text-[#9B9B9B] mt-2">Session link sent 1 hour before your appointment</p>
                </button>
              )}
            </div>

            {/* Therapist selection */}
            {isTherapy && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Choose Your Therapist</h2>
                <p className="text-[#6B6B6B] text-sm mb-5">Not sure? Choose &ldquo;Best Match&rdquo; and we&apos;ll pair you based on your needs.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Best match option */}
                  <button
                    onClick={() => setSelectedTherapist('')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedTherapist === ''
                        ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                        : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C]/20 to-[#E8D48A]/20 flex items-center justify-center flex-shrink-0">
                        <Smile className="w-6 h-6 text-[#C9A84C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#1A1A1A] text-sm">Best Match</div>
                        <div className="text-xs text-[#6B6B6B]">We pick based on your intake answers</div>
                      </div>
                      {selectedTherapist === '' && <CheckCircle className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />}
                    </div>
                  </button>

                  {therapists.map(t => (
                    <button
                      key={t._id}
                      onClick={() => setSelectedTherapist(t._id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedTherapist === t._id
                          ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                          : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {t.avatar ? (
                          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                            <SafeImage src={t.avatar} alt={t.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#C9A84C]/15 flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-[#C9A84C]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#1A1A1A] text-sm">{t.name}</div>
                          <div className="text-xs text-[#6B6B6B] mb-1">
                            {t.specialization || 'Licensed Therapist'}
                            {t.yearsExp ? ` · ${t.yearsExp}yrs exp` : ''}
                          </div>
                          {t.approachTags && t.approachTags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {t.approachTags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-[#F5F5F0] text-[#6B6B6B] text-[10px]">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedTherapist === t._id && <CheckCircle className="w-4 h-4 text-[#C9A84C] flex-shrink-0 mt-0.5" />}
                      </div>
                      {t.bio && (
                        <p className="text-xs text-[#9B9B9B] mt-2 line-clamp-2 leading-relaxed">{t.bio}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={nextStep} className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2 font-semibold">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: DATE & TIME ──────────────────────── */}
        {currentStep === 'datetime' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Select Date &amp; Time</h2>

            {/* Date picker */}
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 mb-5">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[#C9A84C]" />
                Choose a Date
              </h3>

              {/* Month label */}
              <div className="flex gap-6 mb-3 overflow-x-auto pb-1 text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <span key={d} className="flex-none w-10 text-center">{d}</span>
                ))}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                {dates.map(date => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  const dayName = format(date, 'EEE');
                  const isSun = dayName === 'Sun';
                  return (
                    <button
                      key={date.toISOString()}
                      disabled={isSun}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-none w-14 snap-start flex flex-col items-center py-3 rounded-xl border-2 transition-all text-center ${
                        isSelected
                          ? 'border-[#C9A84C] bg-[#C9A84C] text-white shadow-lg shadow-[#C9A84C]/20'
                          : isSun
                          ? 'border-[#F0F0F0] bg-[#FAFAFA] text-[#D0D0D0] cursor-not-allowed'
                          : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 text-[#1A1A1A]'
                      }`}
                    >
                      <span className={`text-[10px] font-medium mb-1 ${isSelected ? 'text-white/80' : 'text-[#9B9B9B]'}`}>{dayName}</span>
                      <span className="text-lg font-bold leading-none">{format(date, 'd')}</span>
                      <span className={`text-[10px] mt-1 ${isSelected ? 'text-white/70' : 'text-[#9B9B9B]'}`}>{format(date, 'MMM')}</span>
                    </button>
                  );
                })}
              </div>
              {selectedDate && (
                <p className="text-xs text-[#6B6B6B] mt-3 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#C9A84C]" />
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')} selected
                </p>
              )}
            </div>

            {/* Time picker */}
            {selectedDate && (
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 mb-6">
                <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-[#C9A84C]" />
                  Available Times
                  {slotsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A84C]" />}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableSlots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                        selectedTime === slot.time
                          ? 'border-[#C9A84C] bg-[#C9A84C] text-white shadow-md'
                          : slot.available
                          ? 'border-[#E5E5E5] hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 text-[#1A1A1A]'
                          : 'border-[#F0F0F0] bg-[#FAFAFA] text-[#D0D0D0] cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
                {availableSlots.length === 0 && !slotsLoading && (
                  <p className="text-sm text-[#6B6B6B] text-center py-4">No slots available — try another date.</p>
                )}
                <p className="text-xs text-[#9B9B9B] mt-3">Greyed times are already booked. All times are WAT (GMT+1).</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button onClick={prevStep} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2 font-semibold disabled:opacity-40"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: INTAKE / DETAILS ─────────────────── */}
        {currentStep === 'intake' && (
          <div className="max-w-3xl mx-auto">
            {isTherapy ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">A little about you</h2>
                  <p className="text-[#6B6B6B] text-sm">
                    This helps us match you with the right therapist. Your answers are strictly confidential.
                  </p>
                </div>

                {/* Reason */}
                <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 mb-5">
                  <label className="block font-semibold text-[#1A1A1A] mb-4 text-sm">
                    What brings you to therapy? <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {intakeReasons.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setIntakeReason(r.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all ${
                          intakeReason === r.value
                            ? 'border-[#C9A84C] bg-[#C9A84C]/8 text-[#1A1A1A] font-medium'
                            : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/40 text-[#4B4B4B]'
                        }`}
                      >
                        <span className="text-lg">{r.icon}</span>
                        <span className="text-xs leading-snug">{r.label}</span>
                        {intakeReason === r.value && <CheckCircle className="w-3.5 h-3.5 text-[#C9A84C] ml-auto flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* First time */}
                <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 mb-5">
                  <label className="block font-semibold text-[#1A1A1A] mb-4 text-sm">
                    Have you been to therapy before? <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: true, label: 'Yes, I have', sub: 'I have previous experience' },
                      { val: false, label: 'No, first time', sub: 'This is my first session' },
                    ].map(opt => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setIntakeFirstTime(!opt.val)}   // false = first time
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          intakeFirstTime === !opt.val
                            ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                            : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-[#1A1A1A]">{opt.label}</span>
                          {intakeFirstTime === !opt.val && <CheckCircle className="w-4 h-4 text-[#C9A84C]" />}
                        </div>
                        <span className="text-xs text-[#6B6B6B]">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred approach */}
                <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 mb-5">
                  <label className="block font-semibold text-[#1A1A1A] mb-1 text-sm">
                    Do you have a preferred therapeutic approach?
                  </label>
                  <p className="text-xs text-[#9B9B9B] mb-4">Optional — your therapist will guide you if unsure.</p>
                  <div className="space-y-2">
                    {intakeApproaches.map(a => (
                      <button
                        key={a.value}
                        onClick={() => setIntakeApproach(a.value)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-sm transition-all ${
                          intakeApproach === a.value
                            ? 'border-[#C9A84C] bg-[#C9A84C]/5 text-[#1A1A1A] font-medium'
                            : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/30 text-[#4B4B4B]'
                        }`}
                      >
                        {a.label}
                        {intakeApproach === a.value && <CheckCircle className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 mb-6">
                  <label className="block font-semibold text-[#1A1A1A] mb-1 text-sm">
                    Anything else you&apos;d like your therapist to know?
                  </label>
                  <p className="text-xs text-[#9B9B9B] mb-3">Optional — this stays between you and your therapist.</p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Share anything that might help us prepare for your session..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] bg-white text-[#1A1A1A] placeholder:text-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C]/50 resize-none text-sm"
                  />
                </div>
              </>
            ) : (
              /* Podcast notes step */
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 mb-6">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Session Details</h2>

                {/* Booking summary */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="p-3 bg-[#FAFAFA] rounded-xl">
                    <p className="text-[#9B9B9B] text-xs mb-0.5">Date</p>
                    <p className="font-semibold text-[#1A1A1A]">{selectedDate ? format(selectedDate, 'MMM d, yyyy') : '-'}</p>
                  </div>
                  <div className="p-3 bg-[#FAFAFA] rounded-xl">
                    <p className="text-[#9B9B9B] text-xs mb-0.5">Time</p>
                    <p className="font-semibold text-[#1A1A1A]">{selectedTime || '-'}</p>
                  </div>
                  <div className="p-3 bg-[#FAFAFA] rounded-xl">
                    <p className="text-[#9B9B9B] text-xs mb-0.5">Duration</p>
                    <p className="font-semibold text-[#1A1A1A]">{service.duration} min</p>
                  </div>
                  <div className="p-3 bg-[#FAFAFA] rounded-xl">
                    <p className="text-[#9B9B9B] text-xs mb-0.5">Total</p>
                    <p className="font-bold text-[#C9A84C]">{formatNGN(service.priceNGN)}</p>
                  </div>
                </div>

                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Additional Notes <span className="text-[#9B9B9B] font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Number of hosts, equipment needs, special requirements..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] bg-white text-[#1A1A1A] placeholder:text-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C]/50 resize-none text-sm"
                />
              </div>
            )}

            <div className="flex justify-between">
              <Button onClick={prevStep} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleCreateBooking}
                loading={loading}
                disabled={!canProceed()}
                className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2 font-semibold disabled:opacity-40"
              >
                {loading ? 'Saving…' : 'Proceed to Payment'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: PAYMENT ─────────────────────────── */}
        {currentStep === 'payment' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6 md:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#C9A84C]/15 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-[#C9A84C]" />
                </div>
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">Complete Payment</h2>
                <p className="text-[#6B6B6B] text-sm">Your booking is held. Pay now to confirm.</p>
              </div>

              {/* Summary */}
              <div className="bg-[#FAFAFA] rounded-2xl p-5 mb-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Service</span>
                  <span className="font-semibold text-[#1A1A1A]">{service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Date &amp; Time</span>
                  <span className="font-semibold text-[#1A1A1A]">
                    {selectedDate ? format(selectedDate, 'MMM d') : ''} at {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Format</span>
                  <span className="font-semibold text-[#1A1A1A] capitalize">{sessionType}</span>
                </div>
                {isTherapy && selectedTherapist && (
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Therapist</span>
                    <span className="font-semibold text-[#1A1A1A]">
                      {therapists.find(t => t._id === selectedTherapist)?.name || 'Assigned'}
                    </span>
                  </div>
                )}
                <div className="border-t border-[#E5E5E5] pt-3 flex justify-between items-center">
                  <span className="font-bold text-[#1A1A1A]">Total</span>
                  <span className="text-2xl font-black text-[#C9A84C]">{formatNGN(service.priceNGN)}</span>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                loading={paymentLoading}
                disabled={!paystackReady}
                className="w-full bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2 py-4 text-base font-bold"
              >
                <CreditCard className="w-5 h-5" />
                Pay {formatNGN(service.priceNGN)} via Paystack
              </Button>

              <p className="text-xs text-center text-[#9B9B9B] mt-4">
                Secured by Paystack · Visa, Mastercard &amp; Bank Transfer accepted
              </p>
              <div className="mt-4">
                <Button onClick={prevStep} variant="outline" className="gap-2 w-full">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRMATION ────────────────────────────── */}
        {currentStep === 'confirmation' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl border border-[#E5E5E5] p-8 md:p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2">You&apos;re Booked!</h2>
              <p className="text-[#6B6B6B] mb-8 max-w-md mx-auto">
                Your {service.name.toLowerCase()} is confirmed for{' '}
                <span className="font-semibold text-[#1A1A1A]">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : ''} at {selectedTime}
                </span>.{' '}
                A confirmation email is on its way.
              </p>

              {/* Booking summary */}
              <div className="bg-[#FAFAFA] rounded-2xl p-5 mb-6 text-left space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Service</span>
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Date</span>
                  <span className="font-medium">{selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Time</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Format</span>
                  <span className="font-medium capitalize">{sessionType}</span>
                </div>
                <div className="border-t border-[#E5E5E5] pt-3 flex justify-between font-semibold">
                  <span>Paid</span>
                  <span className="text-[#C9A84C]">{formatNGN(service.priceNGN)}</span>
                </div>
              </div>

              {/* What happens next */}
              <div className="bg-[#C9A84C]/8 rounded-2xl p-5 mb-8 text-left">
                <p className="font-bold text-[#1A1A1A] text-sm mb-3">What happens next</p>
                <div className="space-y-2.5">
                  {(sessionType === 'online' ? [
                    'Check your email for a booking confirmation',
                    'A secure session link will be sent 1 hour before your appointment',
                    'Find a quiet, private space for your session',
                    'Your therapist will call you into the session at the scheduled time',
                  ] : [
                    'Check your email for a booking confirmation',
                    'Arrive at Suite 35, 911 Mall, Usuma Street, Abuja',
                    'Please arrive 5 minutes early to settle in',
                    isTherapy ? 'Your therapist will greet you at reception' : 'Our technician will set up your equipment',
                  ]).map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-[#4B4B4B]">
                      <div className="w-5 h-5 rounded-full bg-[#C9A84C] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {sessionType === 'in-person' && (
                <div className="bg-[#F5F5F0] rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
                  <MapPin className="w-4 h-4 text-[#C9A84C] mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-[#1A1A1A]">Our Location</p>
                    <p className="text-[#6B6B6B]">Suite 35, 911 Mall, Usuma Street, Maitama, Abuja</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/account/bookings">
                  <Button className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2 w-full sm:w-auto font-semibold">
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

function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  );
}

export default BookingPage;
