import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  Info, Database, ShieldCheck, Sparkles, Scale, Cookie, Share2, Globe2,
  Hourglass, Lock, UserCheck, Baby, BellRing, Link2, PenLine, MessageSquare,
  Shield, CheckCircle2, ArrowRight, Mail, MessageCircle, MapPin, Eye,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BUSINESS } from '@/lib/seo';

const LAST_UPDATED = '14 September 2026';

/* ── Reusable legal-document primitives ────────────────────────────────────── */

/** Small-caps gold eyebrow label with flanking rules — the site's luxury motif. */
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

/** Ornamental gold diamond divider. */
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

/** Numbered section wrapper — gold icon tile, Playfair title, white card. */
function SectionShell({
  icon: Icon, number, title, id, children,
}: {
  icon: LucideIcon; number: string; title: string; id: string; children: ReactNode;
}) {
  return (
    <ScrollReveal>
      <section id={id} className="scroll-mt-28 mb-10">
        <div className="group relative bg-white rounded-2xl p-7 md:p-10 border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 hover:shadow-xl hover:shadow-[#2D2D2D]/10 transition-all duration-300 overflow-hidden">
          {/* watermark number */}
          <span className="absolute -top-6 right-4 text-[7rem] font-bold text-[#C9A84C]/[0.06] select-none pointer-events-none" style={{ fontFamily: 'Playfair Display, serif' }}>
            {number}
          </span>
          {/* gold top hairline */}
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
  { id: 'scope', number: '01', label: 'Introduction & Scope' },
  { id: 'collect', number: '02', label: 'Information We Collect' },
  { id: 'sensitive', number: '03', label: 'Health & Sensitive Data' },
  { id: 'use', number: '04', label: 'How We Use Your Information' },
  { id: 'legal-basis', number: '05', label: 'Legal Bases for Processing' },
  { id: 'cookies', number: '06', label: 'Cookies & Technologies' },
  { id: 'sharing', number: '07', label: 'Sharing & Processors' },
  { id: 'transfers', number: '08', label: 'Cross-Border Transfers' },
  { id: 'retention', number: '09', label: 'Data Retention' },
  { id: 'security', number: '10', label: 'Data Security' },
  { id: 'rights', number: '11', label: 'Your Rights' },
  { id: 'children', number: '12', label: "Children's Privacy" },
  { id: 'breach', number: '13', label: 'Data Breach Response' },
  { id: 'links', number: '14', label: 'Third-Party Links' },
  { id: 'changes', number: '15', label: 'Changes to This Policy' },
  { id: 'contact', number: '16', label: 'Contact Us' },
];

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 md:pt-32 pb-20 md:pb-28 bg-[#2D2D2D] overflow-hidden">
        {/* gold glow accents */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[#C9A84C]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-[#C9A84C]/10 blur-3xl pointer-events-none" />
        {/* oversized serif watermark */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[16rem] md:text-[22rem] leading-none font-bold text-white/[0.04] select-none pointer-events-none" style={{ fontFamily: 'Playfair Display, serif' }}>
          P
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* breadcrumb */}
            <nav className="flex items-center justify-center gap-2 text-xs tracking-widest uppercase text-white/40 mb-8">
              <Link href="/" className="hover:text-[#E8D48A] transition-colors">Home</Link>
              <span className="text-[#C9A84C]/60">/</span>
              <span className="text-[#C9A84C]">Privacy Policy</span>
            </nav>

            <ScrollReveal>
              <Eyebrow light>Legal &amp; Trust</Eyebrow>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Privacy <span className="italic text-[#E8D48A]">Policy</span>
              </h1>
              <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed mb-10">
                How {BUSINESS.legalName} collects, uses, protects, and handles your personal
                information — in line with Nigeria&apos;s data protection laws.
              </p>
            </ScrollReveal>

            {/* meta chips */}
            <ScrollReveal delay={0.15}>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-white/80">
                  <Shield className="w-4 h-4 text-[#E8D48A]" />
                  Last updated: {LAST_UPDATED}
                </span>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-white/80">
                  <Scale className="w-4 h-4 text-[#E8D48A]" />
                  Nigeria Data Protection Act 2023
                </span>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-[#E8D48A]" />
                  We never sell your data
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
                      <Eye className="w-5 h-5 text-[#E8D48A]" />
                    </div>
                    <p className="text-white font-semibold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Quick Actions
                    </p>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">
                      Exercise your data rights in one click.
                    </p>
                    <div className="space-y-2">
                      <a href={`mailto:${BUSINESS.email}?subject=Privacy%20Request%20%E2%80%94%20Access`} className="flex items-center gap-2 text-sm text-white/80 hover:text-[#E8D48A] transition-colors">
                        <UserCheck className="w-4 h-4 text-[#C9A84C]" /> Request my data
                      </a>
                      <a href={`mailto:${BUSINESS.email}?subject=Privacy%20Request%20%E2%80%94%20Erasure`} className="flex items-center gap-2 text-sm text-white/80 hover:text-[#E8D48A] transition-colors">
                        <ShieldCheck className="w-4 h-4 text-[#C9A84C]" /> Ask to erase data
                      </a>
                      <a href={`https://wa.me/${BUSINESS.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/80 hover:text-[#E8D48A] transition-colors">
                        <MessageCircle className="w-4 h-4 text-[#C9A84C]" /> Chat with our team
                      </a>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </aside>

            {/* ── Policy content ───────────────────────────────────────── */}
            <div className="min-w-0">

              {/* 01 — Scope */}
              <SectionShell icon={Info} number="01" title="Introduction & Scope" id="scope">
                <P>
                  {BUSINESS.legalName} (&ldquo;Kentaz Emporium&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is a
                  lifestyle emporium based at {BUSINESS.streetAddress}, {BUSINESS.addressLocality}, Nigeria.
                  This Privacy Policy explains how we collect, use, share, store, and protect personal
                  information when you visit <span className="text-[#2D2D2D] font-medium">kentazemporium.com</span>,
                  place an order, book a service, or otherwise interact with us.
                </P>
                <P>
                  It applies to our website visitors, customers, and users of our services — including
                  mental-health consultations and therapy sessions, and hourly podcast-studio rentals.
                  Where this Policy refers to processing personal data, we do so as a <span className="text-[#2D2D2D] font-medium">data controller</span> under
                  the Nigeria Data Protection Act 2023 (&ldquo;NDPA&rdquo;) and the Nigeria Data Protection
                  Regulation 2019 (&ldquo;NDPR&rdquo;), issued by the Nigeria Data Protection Commission (&ldquo;NDPC&rdquo;).
                </P>
                <P>
                  By using our website or services, you agree to the collection and use of information in
                  accordance with this Policy. If you do not agree, please discontinue using our services.
                </P>
                <div className="bg-[#F5F5F0] border border-[#C9A84C]/20 rounded-xl px-5 py-4 text-sm text-[#6B6B6B] flex gap-3">
                  <Scale className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-[#2D2D2D]">Governing law.</strong> This Policy is governed by Nigerian law,
                    principally the NDPA 2023 and the NDPR 2019, and any subsidiary regulations or guidance issued
                    by the Nigeria Data Protection Commission.
                  </p>
                </div>
              </SectionShell>

              {/* 02 — Information We Collect */}
              <SectionShell icon={Database} number="02" title="Information We Collect" id="collect">
                <P>We collect information in three ways: what you give us directly, what we gather automatically when you use the site, and what we receive from trusted partners.</P>

                <H3>A. Information you provide directly</H3>
                <ul className="space-y-2 mb-6">
                  <Bullet><strong className="text-[#2D2D2D]">Account details</strong> — your name, email address, password (stored as a secure hash), phone number, and any delivery addresses when you create an account.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Order details</strong> — the products you purchase, chosen sizes and colours, quantities, delivery address, order notes, and payment reference numbers.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Booking details</strong> — for therapy or consultations: the service selected, preferred date/time, session type (in-person or virtual), and any information you share about your needs; for studio rental: your booking schedule and requirements.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Communications</strong> — messages you send through our contact form, WhatsApp, Instagram, or email, including any attachments.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Newsletter</strong> — your email address when you subscribe to receive updates.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Payment data</strong> — we do <em>not</em> store your card numbers. Card details are processed directly by our payment partner, Paystack, whose own privacy and security practices apply.</Bullet>
                </ul>

                <H3>B. Information we collect automatically</H3>
                <ul className="space-y-2 mb-6">
                  <Bullet>Device and browser information, such as browser type and version, operating system, and screen size.</Bullet>
                  <Bullet>IP address and approximate location, to protect our services and improve localisation.</Bullet>
                  <Bullet>Pages visited, referral sources, time spent, and interactions (clicks, items added to cart) used in aggregate to improve the experience.</Bullet>
                  <Bullet>Cookies and local storage — see <a href="#cookies" className="text-[#C9A84C] hover:text-[#A68A3D] transition-colors font-medium">Section 06</a> below.</Bullet>
                </ul>

                <H3>C. Information from third parties</H3>
                <ul className="space-y-2">
                  <Bullet><strong className="text-[#2D2D2D]">Google</strong> — your name, email address, and profile picture when you sign in using Google OAuth.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Paystack</strong> — payment status and a payment reference so we can confirm and reconcile your order.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Delivery partners</strong> — delivery confirmation or status information for your orders.</Bullet>
                </ul>
              </SectionShell>

              {/* 03 — Sensitive Data */}
              <SectionShell icon={ShieldCheck} number="03" title="Health & Sensitive Data" id="sensitive">
                <P>
                  Some of our services — in particular <span className="text-[#2D2D2D] font-medium">mental-health consultation and therapy</span> —
                  may involve information about your health or wellbeing. Under the NDPA 2023, health-related
                  information is <span className="text-[#2D2D2D] font-medium">sensitive personal data</span> and receives additional protection.
                </P>
                <ul className="space-y-2 mb-5">
                  <Bullet>We only process health-related data where it is necessary to deliver the service you requested, and only with your explicit consent.</Bullet>
                  <Bullet>Access is restricted to your therapist and authorised staff on a strict need-to-know basis.</Bullet>
                  <Bullet>This information is never used for marketing, profiling, or shared with third parties except where required by law or with your express permission.</Bullet>
                  <Bullet>Session notes and clinical details are stored securely and kept in line with professional and legal record-keeping standards.</Bullet>
                </ul>
                <div className="bg-[#F5F5F0] border border-[#C9A84C]/20 rounded-xl px-5 py-4 text-sm text-[#6B6B6B] flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-[#2D2D2D]">A note on confidentiality.</strong> Whatever you share in a
                    therapy or consultation session stays between you and your therapist. We follow strict
                    confidentiality protocols and data-handling standards for all sensitive information.
                  </p>
                </div>
              </SectionShell>

              {/* 04 — How We Use Your Information */}
              <SectionShell icon={Sparkles} number="04" title="How We Use Your Information" id="use">
                <ul className="space-y-2 mb-5">
                  <Bullet>To process, fulfil, and deliver your <strong className="text-[#2D2D2D]">orders</strong>, including coordinating same-day delivery across Abuja with our logistics partners.</Bullet>
                  <Bullet>To process <strong className="text-[#2D2D2D]">payments and refunds</strong> through Paystack.</Bullet>
                  <Bullet>To create and manage your <strong className="text-[#2D2D2D]">account</strong>, verify your identity, and keep you signed in securely.</Bullet>
                  <Bullet>To schedule, manage, and deliver <strong className="text-[#2D2D2D]">bookings</strong> for therapy sessions and podcast-studio rentals.</Bullet>
                  <Bullet>To provide <strong className="text-[#2D2D2D]">customer support</strong> by email, phone, WhatsApp, or Instagram.</Bullet>
                  <Bullet>To send <strong className="text-[#2D2D2D]">transactional messages</strong> — order confirmations, dispatch notices, and booking reminders.</Bullet>
                  <Bullet>To send <strong className="text-[#2D2D2D]">marketing updates and newsletters</strong>, but only where you have consented and you can unsubscribe at any time.</Bullet>
                  <Bullet>To <strong className="text-[#2D2D2D]">improve our website</strong>, analyse usage trends, and personalise your experience.</Bullet>
                  <Bullet>To <strong className="text-[#2D2D2D]">protect our business and customers</strong> — preventing fraud, resolving disputes, and enforcing our Terms of Service.</Bullet>
                  <Bullet>To comply with <strong className="text-[#2D2D2D]">legal and regulatory obligations</strong>, including tax, accounting, and records requirements.</Bullet>
                </ul>
                <p className="text-sm text-[#6B6B6B]">
                  We do <strong className="text-[#2D2D2D]">not</strong> sell, rent, or trade your personal information to third parties for their own marketing purposes.
                </p>
              </SectionShell>

              {/* 05 — Legal Bases */}
              <SectionShell icon={Scale} number="05" title="Legal Bases for Processing" id="legal-basis">
                <P>Under the NDPA 2023, we must have a lawful basis to process your personal information. We rely on the following:</P>
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  {[
                    { t: 'Consent', d: 'Marketing, newsletters, cookies that are not strictly necessary, and processing of health/sensitive data for therapy services.' },
                    { t: 'Contract', d: 'Fulfilling orders, processing payments, managing bookings, and providing the services you request.' },
                    { t: 'Legal obligation', d: 'Tax records, accounting, consumer-protection duties, and compliance with lawful requests from authorities.' },
                    { t: 'Legitimate interests', d: 'Improving our website, fraud prevention, and protecting the security of our services — balanced against your rights and interests.' },
                  ].map((item) => (
                    <div key={item.t} className="bg-[#FAFAFA] border border-[#2D2D2D]/5 rounded-xl p-5 hover:border-[#C9A84C]/40 transition-colors">
                      <p className="text-[#C9A84C] font-semibold mb-1 text-sm tracking-wide uppercase">{item.t}</p>
                      <p className="text-[#6B6B6B] text-sm leading-relaxed">{item.d}</p>
                    </div>
                  ))}
                </div>
                <P>
                  Where we rely on consent, you may withdraw it at any time without affecting the lawfulness
                  of processing that took place before the withdrawal. To withdraw consent, email{' '}
                  <a href={`mailto:${BUSINESS.email}`} className="text-[#C9A84C] hover:text-[#A68A3D] font-medium transition-colors">{BUSINESS.email}</a>.
                </P>
              </SectionShell>

              {/* 06 — Cookies */}
              <SectionShell icon={Cookie} number="06" title="Cookies & Similar Technologies" id="cookies">
                <P>
                  Our website uses cookies, local storage, and similar technologies to keep you signed in,
                  remember your cart, and understand how the site is used. Cookies are small files placed on
                  your device that we and our service providers use.
                </P>
                <div className="overflow-x-auto -mx-2 px-2 mb-5">
                  <table className="w-full text-sm border-collapse min-w-[480px]">
                    <thead>
                      <tr className="text-left text-[#C9A84C] text-xs tracking-widest uppercase">
                        <th className="py-3 pr-4 border-b border-[#C9A84C]/20">Type</th>
                        <th className="py-3 pr-4 border-b border-[#C9A84C]/20">Examples</th>
                        <th className="py-3 border-b border-[#C9A84C]/20">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#6B6B6B]">
                      {[
                        ['Essential', 'Authentication session, shopping cart', 'Required so the site functions — sign-in, cart, checkout. Cannot be disabled.'],
                        ['Functional', 'Wishlist, preferences, saved addresses', 'Remembers your choices for a smoother experience.'],
                        ['Analytics', 'Page views, usage patterns', 'Helps us understand how visitors use the site so we can improve it.'],
                        ['Marketing', 'Ad-related consent cookies', 'Only set where you have given consent for personalisation and remarketing.'],
                      ].map((row) => (
                        <tr key={row[1]}>
                          <td className="py-3 pr-4 border-b border-[#2D2D2D]/5 align-top font-medium text-[#2D2D2D]">{row[0]}</td>
                          <td className="py-3 pr-4 border-b border-[#2D2D2D]/5 align-top">{row[1]}</td>
                          <td className="py-3 border-b border-[#2D2D2D]/5 align-top">{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <P>
                  You can control cookies through your browser settings — most browsers let you block or delete
                  cookies. Please note that disabling essential cookies may prevent you from using parts of our
                  site, including shopping and signing in.
                </P>
              </SectionShell>

              {/* 07 — Sharing & Processors */}
              <SectionShell icon={Share2} number="07" title="Sharing & Third-Party Processors" id="sharing">
                <P>
                  We share personal information only with the people and partners needed to run our business,
                  and only to the extent necessary. These partners process data on our instructions and are
                  bound by data-processing agreements.
                </P>
                <div className="overflow-x-auto -mx-2 px-2 mb-5">
                  <table className="w-full text-sm border-collapse min-w-[560px]">
                    <thead>
                      <tr className="text-left text-[#C9A84C] text-xs tracking-widest uppercase">
                        <th className="py-3 pr-4 border-b border-[#C9A84C]/20">Processor</th>
                        <th className="py-3 pr-4 border-b border-[#C9A84C]/20">Purpose</th>
                        <th className="py-3 border-b border-[#C9A84C]/20">What we share</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#6B6B6B]">
                      {[
                        ['Paystack', 'Secure payments & refunds', 'Name, email, order total, payment reference (no card details stored by us).'],
                        ['Cloudinary', 'Image & media hosting', 'Product, gallery, and profile images'],
                        ['Google', 'Social sign-in', 'Name, email, avatar (only when you sign in with Google).'],
                        ['Logistics / delivery partners', 'Shipment of your orders', 'Name, delivery address, phone number.'],
                        ['Hosting & infrastructure providers', 'Hosting, backups, CDN', 'Technical data needed to operate the site.'],
                      ].map((row) => (
                        <tr key={row[0]}>
                          <td className="py-3 pr-4 border-b border-[#2D2D2D]/5 align-top font-medium text-[#2D2D2D]">{row[0]}</td>
                          <td className="py-3 pr-4 border-b border-[#2D2D2D]/5 align-top">{row[1]}</td>
                          <td className="py-3 border-b border-[#2D2D2D]/5 align-top">{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <P>
                  We may also disclose personal information where required by law, regulation, legal process,
                  or governmental request, or where necessary to protect the rights, property, or safety of
                  Kentaz Emporium, its customers, or others.
                </P>
              </SectionShell>

              {/* 08 — Transfers */}
              <SectionShell icon={Globe2} number="08" title="Cross-Border Transfers" id="transfers">
                <P>
                  Some of our service providers — for example cloud-hosting and payment infrastructure — may
                  store or process data on servers located outside Nigeria. When we transfer personal
                  information across borders, we ensure the transfer is subject to appropriate safeguards
                  consistent with the requirements of the NDPA 2023, such as data-processing agreements,
                  standard contractual clauses, or equivalent protections.
                </P>
                <P>
                  For residents of other countries (including the UK or the European Union), we take reasonable
                  steps to respect applicable data-protection standards and provide the rights described below.
                </P>
              </SectionShell>

              {/* 09 — Retention */}
              <SectionShell icon={Hourglass} number="09" title="Data Retention" id="retention">
                <P>We keep personal information only for as long as necessary for the purposes described in this Policy, or as required by law. Our retention periods include:</P>
                <ul className="space-y-2">
                  <Bullet><strong className="text-[#2D2D2D]">Account data</strong> — kept while your account is active, and for a reasonable period afterwards to honour rights or handle disputes.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Order records</strong> — retained in line with applicable tax and commercial record-keeping obligations.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Clinical / therapy records</strong> — retained in accordance with professional and legal standards, and access-restricted at all times.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Marketing data</strong> — kept until you unsubscribe or withdraw consent, after which we stop using it.</Bullet>
                  <Bullet><strong className="text-[#2D2D2D]">Cookies & analytics</strong> — session cookies for the life of your visit; persistent preferences for up to 12 months.</Bullet>
                </ul>
                <P>
                  When information is no longer needed, we delete or anonymise it in a secure manner.
                </P>
              </SectionShell>

              {/* 10 — Security */}
              <SectionShell icon={Lock} number="10" title="Data Security" id="security">
                <P>We implement appropriate technical and organisational measures to protect your personal information, including:</P>
                <ul className="space-y-2">
                  <Bullet>Encryption of data in transit (TLS/HTTPS) and at rest where applicable.</Bullet>
                  <Bullet>Password hashing — plaintext passwords are never stored or visible to us.</Bullet>
                  <Bullet>Role-based access controls, so only authorised staff can reach the data they need.</Bullet>
                  <Bullet>Restricted, audited access to health and clinical records.</Bullet>
                  <Bullet>Payment card data handled by Paystack, a PCI-DSS compliant processor — card details never touch our servers.</Bullet>
                  <Bullet>Regular review of our security practices and staff training on data handling.</Bullet>
                </ul>
                <P>
                  No method of transmission or storage is 100% secure. While we work hard to protect your data,
                  we cannot guarantee absolute security. If you believe your account has been compromised,
                  please contact us immediately.
                </P>
              </SectionShell>

              {/* 11 — Your Rights */}
              <SectionShell icon={UserCheck} number="11" title="Your Rights" id="rights">
                <P>Under the NDPA 2023 and NDPR 2019, you have the following rights regarding your personal information:</P>
                <div className="grid sm:grid-cols-2 gap-3 mb-5">
                  {[
                    { t: 'Right to be informed', d: 'Clear information about how your data is processed.' },
                    { t: 'Right of access', d: 'Request a copy of the personal data we hold about you.' },
                    { t: 'Right to rectification', d: 'Correct inaccurate or incomplete information.' },
                    { t: 'Right to erasure', d: 'Ask us to delete your personal data in certain circumstances.' },
                    { t: 'Right to restrict processing', d: 'Limit how we use your data in certain situations.' },
                    { t: 'Right to data portability', d: 'Receive your data in a structured, machine-readable format.' },
                    { t: 'Right to object', d: 'Object to processing based on legitimate interests or marketing.' },
                    { t: 'Right to withdraw consent', d: 'Opt out of any processing based on your consent.' },
                    { t: 'Right not to be subject to automated decision-making', d: 'Meaningful human involvement where decisions have legal effects.' },
                    { t: 'Right to complain', d: 'Lodge a complaint with the Nigeria Data Protection Commission.' },
                  ].map((item) => (
                    <div key={item.t} className="flex items-start gap-3 bg-[#FAFAFA] rounded-xl p-4 border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 transition-colors">
                      <ShieldCheck className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#2D2D2D] font-semibold text-sm mb-0.5">{item.t}</p>
                        <p className="text-[#6B6B6B] text-sm leading-relaxed">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <P>
                  To exercise any of these rights, email{' '}
                  <a href={`mailto:${BUSINESS.email}`} className="text-[#C9A84C] hover:text-[#A68A3D] font-medium transition-colors">
                    {BUSINESS.email}
                  </a>{' '}
                  with the subject line <span className="text-[#2D2D2D] font-medium">&ldquo;Privacy Request&rdquo;</span> and clearly
                  state the right you wish to exercise. We respond to verified requests as soon as possible,
                  typically within 30 days, free of charge.
                </P>
                <P>
                  If you are not satisfied with our response, you may raise a complaint with the{' '}
                  <strong className="text-[#2D2D2D]">Nigeria Data Protection Commission (NDPC)</strong> —{' '}
                  <a href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer" className="text-[#C9A84C] hover:text-[#A68A3D] font-medium transition-colors">
                    ndpc.gov.ng
                  </a>.
                </P>
              </SectionShell>

              {/* 12 — Children */}
              <SectionShell icon={Baby} number="12" title="Children's Privacy" id="children">
                <P>
                  Our e-commerce site sells fashion for children (&ldquo;kiddies fashion&rdquo;), but we understand
                  that such purchases are made by adults. Under the NDPA 2023, where we process the personal
                  data of a child under the age of <strong className="text-[#2D2D2D]">16</strong>, we require consent given or
                  authorised by the child&apos;s parent or guardian.
                </P>
                <P>
                  We do not knowingly collect personal information directly from children under 16. If you
                  believe a child under 16 has provided us with personal information, please contact us so we
                  can delete it.
                </P>
              </SectionShell>

              {/* 13 — Breach Response */}
              <SectionShell icon={BellRing} number="13" title="Data Breach Response" id="breach">
                <P>
                  Should a data breach occur, we follow a documented response plan: we contain and investigate
                  the incident, take steps to mitigate any harm, and — where the law requires it — notify
                  affected individuals and the Nigeria Data Protection Commission without undue delay.
                </P>
                <P>
                  If we hold your contact details and a breach is likely to result in a risk to your rights or
                  freedoms (for example, involving sensitive data), we will inform you directly and clearly set
                  out the steps you can take to protect yourself.
                </P>
              </SectionShell>

              {/* 14 — Third-party links */}
              <SectionShell icon={Link2} number="14" title="Third-Party Links" id="links">
                <P>
                  Our website and communications may link to third-party services such as Instagram, WhatsApp,
                  Google Maps, or payment providers. These services operate under their own privacy policies,
                  and we are not responsible for their privacy practices. We encourage you to review the
                  privacy policy of any third party you visit.
                </P>
              </SectionShell>

              {/* 15 — Changes */}
              <SectionShell icon={PenLine} number="15" title="Changes to This Policy" id="changes">
                <P>
                  We may update this Privacy Policy from time to time to reflect changes in our services,
                  technology, or legal requirements. The current version will always be posted on this page,
                  with the date of the last update shown at the top.
                </P>
                <P>
                  If we make changes that materially affect your rights, we will make reasonable efforts to
                  notify you — for example, by email or a prominent notice on our website — before the changes
                  take effect.
                </P>
              </SectionShell>

              {/* 16 — Contact */}
              <SectionShell icon={MessageSquare} number="16" title="Contact Us" id="contact">
                <P>If you have any questions about this Privacy Policy, or wish to exercise any of your rights, please reach us here:</P>
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  {[
                    { icon: Mail, label: 'Email', value: BUSINESS.email, href: `mailto:${BUSINESS.email}` },
                    { icon: MessageCircle, label: 'WhatsApp', value: BUSINESS.phoneDisplay, href: `https://wa.me/${BUSINESS.whatsapp}` },
                    { icon: MapPin, label: 'Address', value: `${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, Nigeria` },
                    { icon: UserCheck, label: 'Data Protection', value: `${BUSINESS.email} (subject: “Privacy Request”)`, href: `mailto:${BUSINESS.email}?subject=Privacy%20Request` },
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
                  This Privacy Policy is part of the{' '}
                  <Link href="/terms" className="text-[#C9A84C] hover:text-[#A68A3D] transition-colors font-medium">
                    Terms of Service
                  </Link>.
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
            <Eyebrow light>Your Data, Your Control</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Your privacy matters <span className="italic text-[#E8D48A]">to us</span>
            </h2>
            <p className="text-white/70 mb-10 text-lg leading-relaxed">
              Have a question about your data, or want to exercise your rights? Our team is happy to help —
              typically within 24 hours on business days.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <a
                href={`mailto:${BUSINESS.email}?subject=Privacy%20Request`}
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