'use client';

import { useState } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/ui/SafeImage';
import {
  Calendar, Clock, Mic, Heart, Users, Sparkles, Shield, Star,
  ArrowRight, CheckCircle, ChevronDown, Video, MapPin, Phone,
  Brain, Lock, Award, Smile, MessageCircle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const trustStats = [
  { value: '500+', label: 'Sessions Completed' },
  { value: '98%', label: 'Client Satisfaction' },
  { value: '15+', label: 'Expert Professionals' },
  { value: '4.9★', label: 'Average Rating' },
];

const therapyProcess = [
  {
    step: '01',
    title: 'Book Your Session',
    description: 'Choose your preferred date, time, and session format. In-person at our Abuja studio or secure video call — your choice.',
    icon: Calendar,
  },
  {
    step: '02',
    title: 'Connect & Share',
    description: 'Meet your licensed therapist in a safe, confidential space. There are no judgements here — only support.',
    icon: MessageCircle,
  },
  {
    step: '03',
    title: 'Grow & Heal',
    description: 'Gain practical tools and insights tailored to your goals. Progress at your own pace with ongoing support.',
    icon: Heart,
  },
];

const therapyApproaches = [
  { name: 'Cognitive Behavioural', short: 'CBT', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { name: 'Talk Therapy', short: 'Talk', color: 'bg-green-50 text-green-700 border-green-100' },
  { name: 'Trauma-Informed', short: 'Trauma', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { name: 'Mindfulness', short: 'Mindful', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  { name: 'Holistic Wellness', short: 'Holistic', color: 'bg-rose-50 text-rose-700 border-rose-100' },
];

const sessionTypes = [
  {
    type: 'In-Person',
    icon: MapPin,
    price: '₦25,000',
    priceNote: 'per 60-min session',
    features: [
      'Private, comfortable therapy room',
      'In-person connection with your therapist',
      'Relaxing, distraction-free environment',
      'Suite 35, 911 Mall, Usuma St., Abuja',
    ],
    cta: '/services/booking?type=therapy',
    badge: null,
  },
  {
    type: 'Online',
    icon: Video,
    price: '₦20,000',
    priceNote: 'per 60-min session',
    features: [
      'Secure, end-to-end encrypted video call',
      'Attend from anywhere in Nigeria',
      'Same licensed therapists, same quality',
      'Appointment link sent to your email',
    ],
    cta: '/services/booking?type=therapy',
    badge: 'Most Popular',
  },
];

const whyChoose = [
  { icon: Lock, title: 'Fully Confidential', desc: 'Everything shared in your session stays between you and your therapist. We follow strict privacy protocols.' },
  { icon: Award, title: 'Licensed Professionals', desc: 'All therapists hold recognised certifications and undergo regular supervision and training.' },
  { icon: Smile, title: 'Non-Judgemental', desc: 'A safe, warm space where you can speak freely without fear of judgement or criticism.' },
  { icon: Clock, title: 'Flexible Scheduling', desc: 'Sessions available from 9 AM – 6 PM, Monday to Saturday. Rescheduling is hassle-free.' },
  { icon: Shield, title: 'Vetted & Supervised', desc: 'Every therapist on our platform is background-checked and continuously supervised.' },
  { icon: Brain, title: 'Tailored to You', desc: 'No cookie-cutter sessions. Your therapist adapts their approach to your unique needs and goals.' },
];

const concerns = [
  { label: 'Anxiety & Stress', icon: '😰' },
  { label: 'Depression', icon: '🌧️' },
  { label: 'Relationships', icon: '💔' },
  { label: 'Trauma & PTSD', icon: '🩹' },
  { label: 'Grief & Loss', icon: '🕯️' },
  { label: 'Self-Esteem', icon: '🪞' },
  { label: 'Work Burnout', icon: '🔥' },
  { label: 'Family Issues', icon: '🏡' },
];

const faqs = [
  {
    q: 'Is everything I share in therapy confidential?',
    a: 'Yes, absolutely. All sessions are strictly confidential. The only exceptions are legally mandated situations where there is an imminent risk of harm to yourself or others — and your therapist will explain this clearly in your first session.',
  },
  {
    q: 'How do I know which therapist is right for me?',
    a: 'You can browse therapist profiles and filter by specialisation, approach, and experience. You can also choose "Best Match" and we will pair you with the most suitable therapist based on your intake answers.',
  },
  {
    q: 'What happens in the first session?',
    a: 'The first session is mainly about getting to know each other. Your therapist will ask questions to understand your background and what brings you in. There is no pressure to share more than you are comfortable with.',
  },
  {
    q: 'Can I switch therapists if I am not comfortable?',
    a: 'Yes. Therapeutic fit is important. If after a session you feel the match is not right, you can easily switch to another therapist at no extra charge.',
  },
  {
    q: 'How many sessions will I need?',
    a: 'This varies greatly depending on your goals and what you are working through. Some people find 4–6 sessions helpful; others benefit from longer-term support. Your therapist will discuss this with you openly.',
  },
  {
    q: 'Do you offer couples or family therapy?',
    a: 'Yes. We offer sessions for individuals, couples, and family groups. Please mention this when booking and select a session duration of 90 minutes for couples or family sessions.',
  },
];

const podcastFeatures = [
  'Professional condenser microphones',
  'Acoustically treated soundproof room',
  'Mixing board & audio interface',
  'Multi-track recording capability',
  'Live streaming ready (YouTube, Spotify, etc.)',
  'Post-production editing included',
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left border border-[#E5E5E5] rounded-2xl overflow-hidden hover:border-[#C9A84C]/40 transition-colors"
    >
      <div className="flex items-center justify-between p-5 md:p-6">
        <span className="font-semibold text-[#1A1A1A] text-sm md:text-base pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-[#C9A84C] flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="px-5 pb-5 md:px-6 md:pb-6 text-[#6B6B6B] text-sm leading-relaxed border-t border-[#E5E5E5] pt-4">
          {a}
        </div>
      )}
    </button>
  );
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-[#0a0a0a] overflow-hidden min-h-[60vh] flex items-center">
        <div className="absolute inset-0">
          <SafeImage
            src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1920&q=80"
            alt="Therapy session"
            fill
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/50 to-[#0a0a0a]" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span className="text-[#C9A84C] text-xs font-medium tracking-widest uppercase">Wellness & Creative Services</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Elevate Your <span className="bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent">Wellbeing</span>
            </h1>
            <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Professional therapy for mental health. Premium podcast studios for creative minds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#therapy">
                <Button size="lg" className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] font-semibold gap-2 px-8">
                  Mental Health Therapy
                  <Heart className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#studio">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:border-[#C9A84C] px-8">
                  Podcast Studio
                  <Mic className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── TRUST STATS ─────────────────────────────────────── */}
      <section className="bg-white py-10 border-b border-[#F0F0F0]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {trustStats.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 80}>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#C9A84C] mb-1">{stat.value}</div>
                  <div className="text-xs md:text-sm text-[#6B6B6B]">{stat.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── THERAPY SECTION ──────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      <section id="therapy" className="scroll-mt-20 bg-white pt-20 md:pt-28">
        <div className="container mx-auto px-4">

          {/* Header */}
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-600 text-sm font-medium mb-5 border border-rose-100">
                <Heart className="w-4 h-4" />
                Mental Health Therapy
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-5 leading-tight">
                Your Mind Deserves<br />
                <span className="bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] bg-clip-text text-transparent">Professional Care</span>
              </h2>
              <p className="text-[#6B6B6B] text-base md:text-lg leading-relaxed">
                We provide a confidential, non-judgemental space for you to explore challenges, build resilience,
                and move towards the life you want — with licensed therapists who genuinely care.
              </p>
            </div>
          </ScrollReveal>

          {/* What We Help With */}
          <ScrollReveal>
            <div className="mb-16 md:mb-20">
              <p className="text-center text-xs font-semibold tracking-widest uppercase text-[#9B9B9B] mb-6">Areas we support</p>
              <div className="flex flex-wrap justify-center gap-3">
                {concerns.map(c => (
                  <span key={c.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] text-sm text-[#1A1A1A] hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-colors cursor-default">
                    <span>{c.icon}</span>
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* How It Works */}
          <div className="mb-20 md:mb-28">
            <ScrollReveal>
              <div className="text-center mb-12">
                <p className="text-[#C9A84C] text-xs font-semibold tracking-widest uppercase mb-3">The Process</p>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">How Therapy Works at Kentaz</h3>
              </div>
            </ScrollReveal>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              {therapyProcess.map((step, i) => (
                <ScrollReveal key={step.step} delay={i * 120} direction="up">
                  <div className="relative group">
                    {/* Connector line */}
                    {i < therapyProcess.length - 1 && (
                      <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-[#C9A84C]/40 to-transparent z-10 translate-x-4" />
                    )}
                    <div className="bg-white border border-[#E5E5E5] rounded-3xl p-8 hover:border-[#C9A84C]/40 hover:shadow-xl hover:shadow-[#C9A84C]/5 transition-all duration-500 h-full">
                      <div className="flex items-start gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#C9A84C]/20 transition-colors">
                          <step.icon className="w-7 h-7 text-[#C9A84C]" />
                        </div>
                        <span className="text-5xl font-black text-[#F0F0F0] leading-none mt-1">{step.step}</span>
                      </div>
                      <h4 className="text-lg font-bold text-[#1A1A1A] mb-3">{step.title}</h4>
                      <p className="text-[#6B6B6B] text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Session Types / Pricing */}
          <div className="mb-20 md:mb-28">
            <ScrollReveal>
              <div className="text-center mb-12">
                <p className="text-[#C9A84C] text-xs font-semibold tracking-widest uppercase mb-3">Session Formats</p>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3">Choose How You&apos;d Like to Meet</h3>
                <p className="text-[#6B6B6B] max-w-xl mx-auto text-sm">Both formats offer the same quality of care. Choose what feels right for you.</p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {sessionTypes.map((s, i) => (
                <ScrollReveal key={s.type} delay={i * 120} direction="up">
                  <div className={`relative rounded-3xl border-2 p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-[#C9A84C]/10 ${
                    s.badge ? 'border-[#C9A84C] bg-gradient-to-br from-[#C9A84C]/5 via-white to-[#E8D48A]/5' : 'border-[#E5E5E5] bg-white hover:border-[#C9A84C]/50'
                  }`}>
                    {s.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#C9A84C] text-[#0a0a0a] text-xs font-bold tracking-wide">
                        {s.badge}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center">
                        <s.icon className="w-6 h-6 text-[#C9A84C]" />
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1A1A] text-lg">{s.type}</div>
                        <div className="text-[#6B6B6B] text-xs">{s.priceNote}</div>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-[#1A1A1A] mb-6">{s.price}</div>
                    <ul className="space-y-3 mb-8">
                      {s.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-[#4B4B4B]">
                          <CheckCircle className="w-4 h-4 text-[#C9A84C] mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href={s.cta}>
                      <Button className={`w-full gap-2 ${s.badge ? 'bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a]' : 'bg-[#1A1A1A] hover:bg-[#333] text-white'}`}>
                        <Calendar className="w-4 h-4" />
                        Book {s.type} Session
                      </Button>
                    </Link>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Therapy approaches */}
            <ScrollReveal delay={200}>
              <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                <span className="text-xs text-[#9B9B9B] self-center mr-1">Approaches offered:</span>
                {therapyApproaches.map(a => (
                  <span key={a.name} className={`px-3 py-1 rounded-full border text-xs font-medium ${a.color}`}>{a.name}</span>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Why Choose Us */}
          <div className="mb-20 md:mb-28">
            <ScrollReveal>
              <div className="text-center mb-12">
                <p className="text-[#C9A84C] text-xs font-semibold tracking-widest uppercase mb-3">Our Commitment</p>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">Why People Trust Kentaz Wellness</h3>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {whyChoose.map((item, i) => (
                <ScrollReveal key={item.title} delay={i * 80} direction="up">
                  <div className="p-6 rounded-2xl bg-[#FAFAFA] border border-[#F0F0F0] hover:border-[#C9A84C]/30 hover:bg-white hover:shadow-lg transition-all duration-400 group">
                    <div className="w-11 h-11 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center mb-4 group-hover:bg-[#C9A84C]/20 transition-colors">
                      <item.icon className="w-5 h-5 text-[#C9A84C]" />
                    </div>
                    <h4 className="font-bold text-[#1A1A1A] mb-2 text-sm">{item.title}</h4>
                    <p className="text-[#6B6B6B] text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-20 md:mb-28 max-w-3xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <p className="text-[#C9A84C] text-xs font-semibold tracking-widest uppercase mb-3">Common Questions</p>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">Frequently Asked Questions</h3>
              </div>
            </ScrollReveal>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <ScrollReveal key={faq.q} delay={i * 60}>
                  <FAQItem q={faq.q} a={faq.a} />
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Therapy CTA */}
          <ScrollReveal>
            <div className="relative rounded-3xl overflow-hidden mb-20 md:mb-28">
              <div className="absolute inset-0">
                <SafeImage
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80"
                  alt="Ready to begin"
                  fill
                  className="object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C] via-[#B8922A] to-[#8B6914]" />
              </div>
              <div className="relative z-10 text-center py-16 md:py-20 px-6">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
                  Ready to Take the First Step?
                </h3>
                <p className="text-white/80 text-base md:text-lg max-w-xl mx-auto mb-8">
                  Booking a session is simple, confidential, and can be done in under 3 minutes.
                  You don&apos;t have to have it all figured out before you begin.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/services/booking?type=therapy">
                    <Button size="lg" className="bg-white text-[#C9A84C] hover:bg-[#FAFAFA] font-bold gap-2 px-8 shadow-xl">
                      <Calendar className="w-5 h-5" />
                      Book a Session
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 px-8">
                      <Phone className="w-4 h-4 mr-2" />
                      Talk to Us First
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── PODCAST STUDIO SECTION ───────────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      <section id="studio" className="scroll-mt-20 bg-[#0a0a0a] py-20 md:py-28">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-white/70 text-sm font-medium mb-5 border border-white/10">
                <Mic className="w-4 h-4 text-[#C9A84C]" />
                Podcast Studio
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
                Record Your Voice.<br />
                <span className="bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] bg-clip-text text-transparent">Tell Your Story.</span>
              </h2>
              <p className="text-white/50 text-base md:text-lg leading-relaxed">
                State-of-the-art recording studio in Abuja. Professional sound, minimal setup, and post-production editing — all included.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-10 max-w-5xl mx-auto items-center mb-16">
            <ScrollReveal direction="left">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3]">
                <SafeImage
                  src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80"
                  alt="Podcast studio"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-5 left-5 flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A84C] text-black text-sm font-bold">
                  <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                  Live Studio Ready
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-black text-white">₦15,000</span>
                  <span className="text-white/40 text-sm">/hour</span>
                </div>
                <p className="text-white/50 text-sm mb-8">Minimum 2-hour booking. Editing included.</p>
                <ul className="space-y-3 mb-8">
                  {podcastFeatures.map(f => (
                    <li key={f} className="flex items-center gap-3 text-white/70 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <Link href="/services/booking?type=podcast">
                    <Button className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-2 font-semibold">
                      <Calendar className="w-4 h-4" />
                      Book Studio Time
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      Enquire
                    </Button>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ─────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#C9A84C] via-[#D4AE54] to-[#B8922A] py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-4">
                Invest in Yourself Today
              </h2>
              <p className="text-[#0a0a0a]/70 text-lg mb-8 max-w-xl mx-auto">
                Whether you need mental health support or a professional creative space — we have you covered.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/services/booking?type=therapy">
                  <Button size="lg" className="bg-[#0a0a0a] hover:bg-[#1A1A1A] text-white gap-2 px-8">
                    <Heart className="w-4 h-4" />
                    Book Therapy
                  </Button>
                </Link>
                <Link href="/services/booking?type=podcast">
                  <Button size="lg" variant="outline" className="border-[#0a0a0a]/30 text-[#0a0a0a] hover:bg-[#0a0a0a]/10 px-8 gap-2">
                    <Mic className="w-4 h-4" />
                    Book Studio
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

    </div>
  );
}
