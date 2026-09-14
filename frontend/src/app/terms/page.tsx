import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  Info, Handshake, BadgeCheck, UserRound, ShoppingBag, Wallet, Truck,
  RotateCcw, HeartPulse, Mic, BadgePercent, Copyright, ShieldAlert,
  TriangleAlert, Power, Scale, PenLine, MessagesSquare, Shield, CheckCircle2,
  ArrowRight, Mail, MessageCircle, MapPin, Store,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BUSINESS } from '@/lib/seo';

const LAST_UPDATED = '14 September 2026';

/* ── Reusable legal-document primitives ────────────────────────────────────── */

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-5">
      <span className={`h-px w-10 ${light ? 'bg-white/30' : 'bg-[#C9A84C]/40'}`} />
      <span className={`text-xs tracking-[0.35em] uppercase font-medium ${light ? 'text-[#E8D48A]' : 'text-[#C9A84C]'}`}>
        {children}
      </span>
      <span className={`h-px w-10 ${light ? 'bg-white/30' : 'bg-[#C9A84C]/40'}`} />
    </div>
  );
}

function Ornament({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 my-8">
      <span className={`h-px w-16 ${light ? 'bg-white/20' : 'bg-[#C9A84C]/30'}`} />
      <span className={`w-1.5 h-1.5 rotate-45 ${light ? 'bg-[#E8D48A]' : 'bg-[#C9A84C]'}`} />
      <span className={`h-px w-16 ${light ? 'bg-white/20' : 'bg-[#C9A84C]/30'}`} />
    </div>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[#6B6B6B] leading-relaxed mb-4">{children}</p>;
}

function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg font-semibold text-[#2D2D2D] mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
      {children}
    </h3>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[#6B6B6B] leading-relaxed">
      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-2 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function SectionShell({
  icon: Icon, number, title, id, children,
}: {
  icon: LucideIcon; number: string; title: string; id: string; children: ReactNode;
}) {
  return (
    <ScrollReveal>
      <section id={id} className="scroll-mt-28 mb-10">
        <div className="group relative bg-white rounded-2xl p-7 md:p-10 border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 hover:shadow-xl hover:shadow-[#2D2D2D]/10 transition-all duration-300 overflow-hidden">
          <span className="absolute -top-6 right-4 text-[7rem] font-bold text-[#C9A84C]/[0.06] select-none pointer-events-none" style={{ fontFamily: 'Playfair Display, serif' }}>
            {number}
          </span>
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#2D2D2D] text-[#C9A84C] flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
              {number}. {title}
            </h2>
          </div>
          <div className="relative">{children}</div>
        </div>
      </section>
    </ScrollReveal>
  );
}

/* ── Table of contents ─────────────────────────────────────────────────────── */

const TOC = [
  { id: 'acceptance', number: '01', label: 'Introduction & Acceptance' },
  { id: 'eligibility', number: '02', label: 'Eligibility' },
  { id: 'accounts', number: '03', label: 'Accounts & Registration' },
  { id: 'products-orders', number: '04', label: 'Products & Orders' },
  { id: 'pricing-payment', number: '05', label: 'Pricing & Payment' },
  { id: 'delivery', number: '06', label: 'Delivery & Dispatch' },
  { id: 'returns', number: '07', label: 'No-Returns & Refunds' },
  { id: 'therapy', number: '08', label: 'Bookings — Mental Health' },
  { id: 'podcast', number: '09', label: 'Bookings — Podcast Studio' },
  { id: 'promotions', number: '10', label: 'Promotions & Flash Sales' },
  { id: 'ip', number: '11', label: 'Intellectual Property' },
  { id: 'acceptable-use', number: '12', label: 'Acceptable Use' },
  { id: 'liability', number: '13', label: 'Disclaimers & Limitation of Liability' },
  { id: 'termination', number: '14', label: 'Suspension & Termination' },
  { id: 'governing-law', number: '15', label: 'Governing Law & Disputes' },
  { id: 'changes', number: '16', label: 'Changes & Contact' },
];

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 md:pt-32 pb-20 md:pb-28 bg-[#2D2D2D] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[#C9A84C]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-[#C9A84C]/10 blur-3xl pointer-events-none" />
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[16rem] md:text-[22rem] leading-none font-bold text-white/[0.04] select-none pointer-events-none" style={{ fontFamily: 'Playfair Display, serif' }}>
          T
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <nav className="flex items-center justify-center gap-2 text-xs tracking-widest uppercase text-white/40 mb-8">
              <Link href="/" className="hover:text-[#E8D48A] transition-colors">Home</Link>
              <span className="text-[#C9A84C]/60">/</span>
              <Link href="/privacy" className="hover:text-[#E8D48A] transition-colors">Privacy Policy</Link>
              <span className="text-[#C9A84C]/60">/</span>
              <span className="text-[#C9A84C]">Terms of Service</span>
            </nav>

            <ScrollReveal>
              <Eyebrow light>Legal &amp; Trust</Eyebrow>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Terms of <span className="italic text-[#E8D48A]">Service</span>
              </h1>
              <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed mb-10">
                The agreement between you and {BUSINESS.legalName} for shopping and booking services —
                orders, payments, delivery, service bookings, and responsible use.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-white/80">
                  <Shield className="w-4 h-4 text-[#E8D48A]" />
                  Last updated: {LAST_UPDATED}
                </span>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-white/80">
                  <Scale className="w-4 h-4 text-[#E8D48A]" />
                  Governing law: Nigeria
                </span>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-[#E8D48A]" />
                  Transparent, customer-first terms
                </span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <Ornament light />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#FAFAFA]">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[280px_1fr] gap-10 max-w-6xl mx-auto">

            {/* ── Sidebar: TOC + quick actions ─────────────────────────── */}
            <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
              <ScrollReveal direction="right">
                <div className="bg-white rounded-2xl border border-[#2D2D2D]/5 p-6">
                  <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold mb-4">
                    On This Page
                  </p>
                  <nav className="space-y-1">
                    {TOC.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="flex items-center gap-3 text-sm text-[#6B6B6B] hover:text-[#2D2D2D] py-1.5 px-2 rounded-lg hover:bg-[#F5F5F0] transition-colors group"
                      >
                        <span className="text-xs font-semibold text-[#C9A84C] w-6 shrink-0">{item.number}</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">{item.label}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </ScrollReveal>

              {/* quick actions card */}
              <ScrollReveal direction="right" delay={0.1}>
                <div className="relative bg-[#2D2D2D] rounded-2xl p-6 overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#C9A84C]/15 blur-2xl pointer-events-none" />
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-[#C9A84C]/15 flex items-center justify-center mb-4">
                      <ShoppingBag className="w-5 h-5 text-[#E8D48A]" />
                    </div>
                    <p className="text-white font-semibold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Get Started
                    </p>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">
                      Shop the collection or ask us anything.
                    </p>
                    <div className="space-y-2">
                      <Link href="/products" className="flex items-center gap-2 text-sm text-white/80 hover:text-[#E8D48A] transition-colors">
                        <Store className="w-4 h-4 text-[#C9A84C]" /> Browse the shop
                      </Link>
                      <Link href="/services" className="flex items-center gap-2 text-sm text-white/80 hover:text-[#E8D48A] transition-colors">
                        <HeartPulse className="w-4 h-4 text-[#C9A84C]" /> Book a service
                      </Link>
                      <a href={`https://wa.me/${BUSINESS.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/80 hover:text-[#E8D48A] transition-colors">
                        <MessageCircle className="w-4 h-4 text-[#C9A84C]" /> Chat with our team
                      </a>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </aside>

            {/* ── Terms content ───────────────────────────────────────── */}
            <div className="min-w-0">

              {/* 01 — Acceptance */}
              <SectionShell icon={Handshake} number="01" title="Introduction & Acceptance" id="acceptance">
                <P>
                  Welcome to {BUSINESS.legalName}. These Terms of Service (&ldquo;Terms&rdquo;) form a binding
                  agreement between you and {BUSINESS.legalName} (&ldquo;Kentaz Emporium&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
                  &ldquo;our&rdquo;), a lifestyle emporium based at {BUSINESS.streetAddress}, {BUSINESS.addressLocality}, Nigeria.
                </P>
                <P>
                  By accessing <span className="text-[#2D2D2D] font-medium">kentazemporium.com</span>, creating an account,
                  placing an order, or booking a service, you accept and agree to be bound by these Terms and
                  by our{' '}
                  <Link href="/privacy" className="text-[#C9A84C] hover:text-[#A68A3D] transition-colors font-medium">
                    Privacy Policy
                  </Link>
                  , which is incorporated into these Terms by reference. Please read both documents carefully.
                </P>
                <P>
                  If you do not agree with any part of these Terms, please do not use our website or services.
                </P>
                <div className="bg-[#F5F5F0] border border-[#C9A84C]/20 rounded-xl px-5 py-4 text-sm text-[#6B6B6B] flex gap-3">
                  <Info className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-[#2D2D2D]">Last updated:</strong> {LAST_UPDATED}. We may update these Terms
                    over time — see <a href="#changes" className="text-[#C9A84C] font-medium">Section 16</a>. The version on this
                    page at the time of your order or booking applies to that transaction.
                  </p>
                </div>
              </SectionShell>

              {/* 02 — Eligibility */}
              <SectionShell icon={BadgeCheck} number="02" title="Eligibility" id="eligibility">
                <ul className="space-y-2">
                  <Bullet>You must be at least <strong className="text-[#2D2D2D]">18 years old</strong>, or have the permission of a parent or guardian, to make a purchase or book a service.</Bullet>
                  <Bullet>You agree to provide true, accurate, current, and complete information when placing orders or creating an account.</Bullet>
                  <Bullet>Our products are for personal, lawful use. Reselling items without our consent is not permitted.</Bullet>
                  <Bullet>If we believe an account or order is used for unlawful, fraudulent, or abusive purposes, we may suspend it.</Bullet>
                </ul>
              </SectionShell>

              {/* 03 — Accounts */}
              <SectionShell icon={UserRound} number="03" title="Accounts & Registration" id="accounts">
                <P>
                  To shop faster or book services, you may create an account. You are responsible for
                  maintaining the confidentiality of your login credentials and for all activity under your
                  account.
                </P>
                <ul className="space-y-2">
                  <Bullet>Keep your password secure — never share it with anyone.</Bullet>
                  <Bullet>Notify us immediately if you suspect unauthorised use of your account via{' '}
                    <a href={`mailto:${BUSINESS.email}`} className="text-[#C9A84C] hover:text-[#A68A3D] font-medium transition-colors">{BUSINESS.email}</a>.</Bullet>
                  <Bullet>You are responsible for keeping your contact and delivery details up to date so your orders are not delayed or lost.</Bullet>
                  <Bullet>Create one account per person; do not create accounts on behalf of others without their consent.</Bullet>
                </ul>
                <P>
                  We may close or suspend accounts that breach these Terms, and we reserve the right to refuse
                  service at any time.
                </P>
              </SectionShell>

              {/* 04 — Products & Orders */}
              <SectionShell icon={ShoppingBag} number="04" title="Products & Orders" id="products-orders">
                <H3>How orders are formed</H3>
                <P>
                  When you place an order, you are making an <span className="text-[#2D2D2D] font-medium">offer</span> to purchase
                  the items in your cart at the price shown at checkout. A binding contract is formed only when
                  we confirm your order by issuing an order confirmation and payment reference through our
                  secure checkout.
                </P>
                <H3>Order acceptance</H3>
                <ul className="space-y-2">
                  <Bullet>All orders are subject to <strong className="text-[#2D2D2D]">product availability</strong> and our final confirmation of the price.</Bullet>
                  <Bullet>We may refuse or cancel an order for legitimate reasons — for example, suspected fraud, stock unavailability, pricing errors, or violation of these Terms — and we will refund any amount paid in such cases.</Bullet>
                  <Bullet>We may limit quantities on any product, particularly during sales or flash-sale events.</Bullet>
                  <Bullet>Features, specifications, and availability of products may change without notice.</Bullet>
                </ul>
                <H3>Product information</H3>
                <P>
                  We work hard to describe and photograph our products accurately. Please note that screen
                  colours may vary, sizes may differ slightly from measurements shown, and some images are
                  illustrative. Product descriptions are provided in good faith and do not form a warranty
                  beyond what Nigerian consumer law requires.
                </P>
              </SectionShell>

              {/* 05 — Pricing & Payment */}
              <SectionShell icon={Wallet} number="05" title="Pricing & Payment" id="pricing-payment">
                <ul className="space-y-2 mb-5">
                  <Bullet>All prices are listed in <strong className="text-[#2D2D2D]">Nigerian Naira (₦)</strong> and include applicable taxes where shown, unless stated otherwise.</Bullet>
                  <Bullet>Delivery fees and any service charges are displayed at checkout before you confirm the order.</Bullet>
                  <Bullet>Payments are processed securely by <strong className="text-[#2D2D2D]">Paystack</strong>, supporting cards, bank transfer, and USSD. Card details are handled by Paystack and never stored on our servers.</Bullet>
                  <Bullet>Payment must be received before we dispatch your order or confirm a booking.</Bullet>
                  <Bullet>If a product is incorrectly priced (for example, a clear error), we may cancel the order and offer a full refund or an alternative at the correct price.</Bullet>
                </ul>
                <div className="bg-[#F5F5F0] border border-[#C9A84C]/20 rounded-xl px-5 py-4 text-sm text-[#6B6B6B] flex gap-3">
                  <Wallet className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-[#2D2D2D]">A note on pricing errors.</strong> We rarely make mistakes, but if an
                    order is obviously mispriced we will contact you before charging, or refund you in full if you have
                    already paid.
                  </p>
                </div>
              </SectionShell>

              {/* 06 — Delivery */}
              <SectionShell icon={Truck} number="06" title="Delivery & Dispatch" id="delivery">
                <H3>Same-day dispatch</H3>
                <P>
                  For orders placed before our daily cut-off, we dispatch the same day. Delivery timeframes
                  depend on your location within Abuja FCT or elsewhere in Nigeria, and are estimates rather
                  than guarantees.
                </P>
                <H3>Delivery responsibilities</H3>
                <ul className="space-y-2">
                  <Bullet>Please provide an accurate delivery address and a reachable phone number (WhatsApp preferred) for delivery coordination.</Bullet>
                  <Bullet>Ownership and risk of loss pass to you once the items are delivered to your address (or collected by an authorised person).</Bullet>
                  <Bullet>We are not liable for delays caused by events outside our reasonable control — for example, extreme weather, security incidents, or carrier disruptions.</Bullet>
                  <Bullet>If you refuse delivery or provide an incorrect address, you may be responsible for re-dispatch or storage costs.</Bullet>
                </ul>
              </SectionShell>

              {/* 07 — No-Returns & Refunds */}
              <SectionShell icon={RotateCcw} number="07" title="No-Returns Policy & Refunds" id="returns">
                <H3>All product sales are final</H3>
                <P>
                  All product purchases are <strong className="text-[#2D2D2D]">final sale</strong>. We do not accept returns
                  or exchanges, and we do not offer refunds for a change of mind — including choosing the wrong size or
                  colour, or if an item does not match your expectation of the photographs. Please review product
                  images, size guides, and descriptions carefully before completing your order.
                </P>
                <ul className="space-y-2 mb-5">
                  <Bullet><strong className="text-[#2D2D2D]">No returns or exchanges</strong> — once a purchase is made, items cannot be returned or exchanged for change of mind.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Health & hygiene</strong> — for reasons of health and hygiene, items such as skincare and beauty products, perfumes, and human hair and wigs can never be returned once dispatched.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Faulty, damaged, or not as described</strong> — if an item arrives faulty, damaged in transit, or materially different from its description, contact us within <strong className="text-[#2D2D2D]">7 days of delivery</strong> with your order number and clear photographs. We will replace the item or refund it at our discretion.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Orders we cannot fulfil</strong> — if we cancel or refuse an order because the item is out of stock, mispriced, or for another legitimate reason described in these Terms, we will refund any amount paid.</Bullet>
                </ul>
                <div className="rounded-xl border border-[#C9A84C]/30 bg-[#F5F5F0] px-5 py-4 mb-5">
                  <p className="text-sm text-[#2D2D2D]">
                    <strong className="font-semibold">Please choose carefully.</strong> As a boutique,
                    all product sales are final and we are unable to accept returns or offer exchanges.
                  </p>
                </div>
                <H3>Refunds</H3>
                <P>
                  Refunds are issued only in the limited circumstances described above — a faulty, damaged, or
                  misdescribed item, or an order we are unable to fulfil. Approved refunds are returned to your
                  original payment method via Paystack, usually within
                  <strong className="text-[#2D2D2D]"> 3–5 business days</strong> of approval.
                </P>
                <P>
                  To report a faulty or damaged item, email{' '}
                  <a href={`mailto:${BUSINESS.email}?subject=Faulty%2FDamaged%20Item%20Report`} className="text-[#C9A84C] hover:text-[#A68A3D] font-medium transition-colors">
                    {BUSINESS.email}
                  </a>{' '}
                  with your order number and photographs. Our team will guide you through resolution.
                </P>
              </SectionShell>

              {/* 08 — Mental health bookings */}
              <SectionShell icon={HeartPulse} number="08" title="Service Bookings — Mental Health Consultation & Therapy" id="therapy">
                <P>
                  Our mental-health consultations and therapy sessions are confidential support services.
                  When you book, you choose a session type (in-person at {BUSINESS.streetAddress} or virtual),
                  a therapist, and a time slot. Session fees are confirmed at checkout and paid via Paystack.
                </P>
                <ul className="space-y-2 mb-5">
                  <Bullet><strong className="text-[#2D2D2D]">Rescheduling:</strong> you may reschedule for free up to 24 hours before your session, subject to availability.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Cancellations:</strong> cancellations made at least 24 hours before the session are entitled to a reschedule or refund at our discretion; late cancellations or no-shows may forfeit the session fee.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Confidentiality:</strong> everything you share stays between you and your therapist, subject to the limits described in our{' '}
                    <Link href="/privacy#sensitive" className="text-[#C9A84C] hover:text-[#A68A3D] transition-colors font-medium">Privacy Policy</Link>.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Punctuality:</strong> sessions start and end on time. Arriving late reduces your session time unless we can extend.</Bullet>
                </ul>
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-[#6B6B6B] flex gap-3">
                  <TriangleAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-[#2D2D2D]">Not an emergency service.</strong> Our wellbeing services are not a
                    replacement for emergency medical care and do not constitute a medical diagnosis. If you are in
                    crisis or immediate danger, please contact emergency services in your area right away.
                  </p>
                </div>
              </SectionShell>

              {/* 09 — Podcast studio */}
              <SectionShell icon={Mic} number="09" title="Service Bookings — Podcast Studio Rental" id="podcast">
                <P>
                  Our professional podcast studio is available for hourly rental by the slot. Bookings are
                  confirmed once the studio fee is paid through Paystack.
                </P>
                <ul className="space-y-2">
                  <Bullet><strong className="text-[#2D2D2D]">Whats&apos;s included:</strong> the studio, listed equipment, and the booked time slot. Our equipment list is published for each studio.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Rescheduling & cancellations:</strong> free reschedule up to 24 hours before your slot, subject to availability; later cancellations or no-shows may forfeit the fee.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Overtime:</strong> sessions that run past the booked slot may be billed in per-hour increments at the standard rate.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Care of equipment:</strong> please handle studio equipment with care. You are responsible for damage caused by misuse beyond normal wear and tear.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Content:</strong> you are responsible for the content you record and for ensuring it complies with Nigerian law — we do not monitor your recordings but may decline bookings for unlawful purposes.</Bullet>
                </ul>
              </SectionShell>

              {/* 10 — Promotions */}
              <SectionShell icon={BadgePercent} number="10" title="Promotions & Flash Sales" id="promotions">
                <ul className="space-y-2 mb-5">
                  <Bullet>Promotional and flash-sale prices apply for the stated period only, while stock lasts, and may be changed or withdrawn at any time.</Bullet>
                  <Bullet>Discounts and promo codes cannot normally be combined unless the promotion states otherwise.</Bullet>
                  <Bullet>Sale prices apply to new orders placed during the sale — we cannot apply them retroactively to earlier purchases.</Bullet>
                  <Bullet>We may limit quantities on promotional items, and promotions void where found to be misused or fraudulent.</Bullet>
                  <Bullet>Items purchased at a discount are final sale and remain subject to our no-returns policy.</Bullet>
                </ul>
                <P>
                  See the {' '}
                  <Link href="/flash-sale" className="text-[#C9A84C] hover:text-[#A68A3D] transition-colors font-medium">
                    current flash sale
                  </Link>{' '}
                  for terms specific to any live promotion.
                </P>
              </SectionShell>

              {/* 11 — Intellectual property */}
              <SectionShell icon={Copyright} number="11" title="Intellectual Property" id="ip">
                <P>
                  All content on our website — including text, images, photographs, graphics, logos, brand
                  names, designs, and code — is owned by or licensed to {BUSINESS.legalName} and protected by
                  Nigerian and international intellectual-property laws.
                </P>
                <ul className="space-y-2">
                  <Bullet>You may view and use our content for personal, non-commercial purposes only.</Bullet>
                  <Bullet>You may not copy, reproduce, distribute, republish, or resell our content or products without our prior written consent.</Bullet>
                  <Bullet>&ldquo;Kentaz Emporium&rdquo;, our logo, and our tagline &ldquo;Luxury. Lifestyle. Wellness.&rdquo; are our brand assets and may not be used without permission.</Bullet>
                  <Bullet>If you believe content on our site infringes your rights, please contact us and we will address it in line with applicable law.</Bullet>
                </ul>
              </SectionShell>

              {/* 12 — Acceptable use */}
              <SectionShell icon={ShieldAlert} number="12" title="Acceptable Use" id="acceptable-use">
                <P>When using our website and services, you agree not to:</P>
                <ul className="space-y-2">
                  <Bullet>Interfere with, disrupt, or overload the website or its infrastructure.</Bullet>
                  <Bullet>Attempt to gain unauthorised access to accounts, systems, or data — including by hacking, scraping, or credential abuse.</Bullet>
                  <Bullet>Use automated bots or scripts to place orders, bypass restrictions, or manipulate inventory or pricing.</Bullet>
                  <Bullet>Post or transmit unlawful, defamatory, or fraudulent content, or content that infringes others&apos; rights.</Bullet>
                  <Bullet>Use our services to commit or facilitate fraud, money laundering, or any criminal offence.</Bullet>
                  <Bullet>Introspect on, or misuse, promotional codes, referral systems, or payment workflows for unintended benefit.</Bullet>
                </ul>
              </SectionShell>

              {/* 13 — Liability */}
              <SectionShell icon={Scale} number="13" title="Disclaimers & Limitation of Liability" id="liability">
                <P>
                  To the fullest extent permitted by Nigerian law — including the Federal Competition and
                  Consumer Protection Act 2019 — our website and services are provided &ldquo;as is&rdquo; and &ldquo;as
                  available&rdquo;. We do not warrant that the site will be uninterrupted, error-free, or free of
                  harmful components.
                </P>
                <ul className="space-y-2 mb-5">
                  <Bullet>To the extent permitted by law, {BUSINESS.legalName} will not be liable for indirect, incidental, special, or consequential damages arising from your use of our website or services.</Bullet>
                  <Bullet>Our total liability for any claim relating to an order is limited to the amount you paid for that order; for services, to the fee you paid for that booking.</Bullet>
                  <Bullet>Nothing in these Terms limits or excludes liability that cannot lawfully be limited — for example, liability for fraud, death, or personal injury caused by our negligence.</Bullet>
                  <Bullet>You remain responsible for how you use products purchased, and for the content you publish using our studio or services.</Bullet>
                </ul>
                <P>
                  We aim to describe and deliver products accurately, but we encourage you to review items on
                  delivery and contact us promptly if anything is wrong.
                </P>
              </SectionShell>

              {/* 14 — Termination */}
              <SectionShell icon={Power} number="14" title="Suspension & Termination" id="termination">
                <P>
                  We may suspend or terminate your access to our website and services at any time if you
                  breach these Terms, engage in fraud, or act in a way that harms our customers, staff, or
                  business.
                </P>
                <P>
                  You may close your account at any time by contacting us. On termination, sections that by
                  their nature should survive — including liability limits, the Intellectual Property and
                  Acceptable Use provisions, and Governing Law — remain in force.
                </P>
                <P>
                  Any paid orders or bookings already confirmed at the time of termination will still be
                  honoured, or refunded where we are unable to fulfil them.
                </P>
              </SectionShell>

              {/* 15 — Governing law */}
              <SectionShell icon={Scale} number="15" title="Governing Law & Disputes" id="governing-law">
                <P>
                  These Terms are governed by the laws of the <strong className="text-[#2D2D2D]">Federal Republic of Nigeria</strong>,
                  without regard to conflict-of-law principles.
                </P>
                <ul className="space-y-2 mb-5">
                  <Bullet><strong className="text-[#2D2D2D]">First, talk to us.</strong> We aim to resolve any issue quickly and fairly — most can be sorted over email or WhatsApp.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Then, courts.</strong> Any dispute that cannot be resolved amicably shall be subject to the exclusive jurisdiction of the courts of the Federal Capital Territory, Abuja.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Regulators.</strong> You may also raise consumer concerns with the Federal Competition and Consumer Protection Commission (FCCPC) or other appropriate authorities.</Bullet>
                </ul>
              </SectionShell>

              {/* 16 — Changes & contact */}
              <SectionShell icon={PenLine} number="16" title="Changes & Contact" id="changes">
                <H3>Changes to these Terms</H3>
                <P>
                  We may revise these Terms from time to time. The current version will always be available on
                  this page with the date of the last update shown at the top. For material changes, we will
                  make reasonable efforts to notify you in advance, for example by email or a notice on our
                  website. Continued use of our services after changes take effect constitutes acceptance.
                </P>
                <H3>Contact us</H3>
                <P>If you have questions about these Terms, an order, a booking, or a refund, please reach us here:</P>
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  {[
                    { icon: Mail, label: 'Email', value: BUSINESS.email, href: `mailto:${BUSINESS.email}` },
                    { icon: MessageCircle, label: 'WhatsApp', value: BUSINESS.phoneDisplay, href: `https://wa.me/${BUSINESS.whatsapp}` },
                    { icon: MapPin, label: 'Address', value: `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, Nigeria` },
                    { icon: MessagesSquare, label: 'Returns & Support', value: `${BUSINESS.email} (subject: “Return Request”)`, href: `mailto:${BUSINESS.email}?subject=Return%20Request` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-4 bg-[#FAFAFA] rounded-xl p-5 border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-[#C9A84C]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs tracking-widest uppercase text-[#6B6B6B] mb-1">{item.label}</p>
                        {item.href ? (
                          <a href={item.href} className="text-[#2D2D2D] font-medium text-sm break-words hover:text-[#C9A84C] transition-colors" target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-[#2D2D2D] font-medium text-sm break-words">{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#6B6B6B]">
                  Office hours: {BUSINESS.openingHours[0].days} {BUSINESS.openingHours[0].opens}–{BUSINESS.openingHours[0].closes}, {BUSINESS.openingHours[1].days} {BUSINESS.openingHours[1].opens}–{BUSINESS.openingHours[1].closes} (WAT).
                </p>
              </SectionShell>

              {/* final sign-off */}
              <ScrollReveal>
                <Ornament />
                <p className="text-center text-sm text-[#6B6B6B]">
                  These Terms work alongside our{' '}
                  <Link href="/privacy" className="text-[#C9A84C] hover:text-[#A68A3D] transition-colors font-medium">
                    Privacy Policy
                  </Link>
                  , which explains how we handle your personal information.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 bg-[#2D2D2D] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[#C9A84C]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-[#C9A84C]/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <ScrollReveal>
            <Eyebrow light>Questions?</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              We&apos;re here to <span className="italic text-[#E8D48A]">help</span>
            </h2>
            <p className="text-white/70 mb-10 text-lg leading-relaxed">
              Whether it&apos;s an order, a booking, or a refund, our team is happy to assist — typically
              within 24 hours on business days.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <a
                href={`mailto:${BUSINESS.email}`}
                className="inline-flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A1A] px-10 py-4 rounded-full hover:bg-[#E8D48A] hover:shadow-lg hover:shadow-[#C9A84C]/30 transition-all duration-300 font-semibold group"
              >
                <Mail className="w-5 h-5" /> Email Our Team <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
              <a
                href={`https://wa.me/${BUSINESS.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-10 py-4 rounded-full hover:border-[#C9A84C] hover:text-[#E8D48A] transition-colors duration-300 font-medium"
              >
                <MessageCircle className="w-5 h-5" /> WhatsApp Us
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}