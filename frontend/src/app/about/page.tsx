"use client";

import Link from "next/link";
import SafeImage from '@/components/ui/SafeImage';
import {
  ArrowRight, Star, Award, Users, Heart, Sparkles,
  MapPin, Phone, MessageCircle, Instagram, Clock, Mail, Check,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { BUSINESS } from "@/lib/seo";

// Real store photography — uploaded to Cloudinary (folder: kentaz/about)
const STORE_IMAGES = {
  brandedStaircase:
    "https://res.cloudinary.com/dpydlvp2h/image/upload/v1785870188/kentaz/about/sepxbqynvare4drlzvua.jpg",
  boutiqueFashionBeauty:
    "https://res.cloudinary.com/dpydlvp2h/image/upload/v1785870110/kentaz/about/t30dpknhzfllz3osxb7d.jpg",
  menswearShoes:
    "https://res.cloudinary.com/dpydlvp2h/image/upload/v1785870129/kentaz/about/nkdyukui5uhuszznitrl.jpg",
  dressesSkincare:
    "https://res.cloudinary.com/dpydlvp2h/image/upload/v1785870138/kentaz/about/i5z9sa6xbnisvaxpspqd.jpg",
  casualWear:
    "https://res.cloudinary.com/dpydlvp2h/image/upload/v1785870156/kentaz/about/c6tomsebw15p3krdlbwi.jpg",
  wigsAccessories:
    "https://res.cloudinary.com/dpydlvp2h/image/upload/v1785870168/kentaz/about/a0hnablreg4b20iugq5q.jpg",
  walkway:
    "https://res.cloudinary.com/dpydlvp2h/image/upload/v1785870181/kentaz/about/ud7syip9k9pcyl1azqyn.jpg",
};

const gallery = [
  { src: STORE_IMAGES.boutiqueFashionBeauty, alt: "Kentaz Emporium lifestyle boutique — fashion, beauty and shoes", caption: "Curated Fashion & Beauty" },
  { src: STORE_IMAGES.menswearShoes, alt: "Menswear and dress shoes display at Kentaz Emporium", caption: "Menswear & Footwear" },
  { src: STORE_IMAGES.dressesSkincare, alt: "Occasion dresses and skincare shelves at Kentaz Emporium", caption: "Occasion Wear & Skincare" },
  { src: STORE_IMAGES.casualWear, alt: "Casual fashion collections at Kentaz Emporium", caption: "Everyday Luxury" },
  { src: STORE_IMAGES.wigsAccessories, alt: "Luxury human hair wigs and accessories at Kentaz Emporium", caption: "Luxury Human Hair" },
  { src: STORE_IMAGES.walkway, alt: "Kentaz Emporium upper-level walkway", caption: "A Destination in Maitama" },
];

const stats = [
  { value: "1.5K+", label: "Instagram Followers" },
  { value: "8", label: "Product Categories" },
  { value: "2", label: "Signature Services" },
  { value: "Same-Day", label: "Delivery in Abuja" },
];

const values = [
  {
    icon: Sparkles,
    number: "01",
    title: "Quality First",
    description: "Every product is carefully curated to meet our exacting standards of excellence.",
  },
  {
    icon: Heart,
    number: "02",
    title: "Customer-Centric",
    description: "Your satisfaction is our priority. We go above and beyond to exceed expectations.",
  },
  {
    icon: Award,
    number: "03",
    title: "Authentic Luxury",
    description: "Elegant, luxury, classy and refined — we source only genuine, premium products from trusted brands and suppliers.",
  },
  {
    icon: Users,
    number: "04",
    title: "Community",
    description: "Building lasting relationships with our customers through trust and transparency.",
  },
];

const timeline = [
  {
    year: "The Vision",
    title: "A Dream of Luxury & Wellness",
    description:
      "Kentaz Emporium began with a founder's vision: to bring world-class luxury and wellness to Abuja — a place where elegance meets care under one roof.",
  },
  {
    year: "The Launch",
    title: "Doors Open at 911 Mall, Maitama",
    description:
      "Kentaz Emporium officially launched at 911 Mall, 70 Usuma Street, Maitama — unveiling a curated world of premium fashion, luxury human hair, and skincare.",
  },
  {
    year: "Wellness",
    title: "Beyond Retail",
    description:
      "We expanded beyond products with in-person and virtual mental health consultation and therapy, plus a professional podcast studio available for hourly rental.",
  },
  {
    year: "Today",
    title: "The Modern Individual's Destination",
    description:
      "From same-day delivery across Abuja to #AffluentLifestyleNG experiences, we serve customers who expect elegance, luxury, class, and refinement in everything they do.",
  },
];

const productOffers = [
  "Male, Female & Kiddies Fashion",
  "Luxury Skincare & Beauty",
  "Human Hair & Wigs",
  "Bags & Purses",
  "Shoes",
  "Accessories",
  "Fine Perfumes",
  "Gift Items",
];

const serviceOffers = [
  "Mental Health Consultation & Therapy",
  "Professional Podcast Studio Rental",
  "Personal Shopping",
  "Gift Wrapping",
  "Same-Day Delivery in Abuja",
];

/** Small-caps gold eyebrow label with flanking rules — the site's luxury motif. */
function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-5">
      <span className={`h-px w-10 ${light ? "bg-white/30" : "bg-[#C9A84C]/40"}`} />
      <span className={`text-xs tracking-[0.35em] uppercase font-medium ${light ? "text-[#E8D48A]" : "text-[#C9A84C]"}`}>
        {children}
      </span>
      <span className={`h-px w-10 ${light ? "bg-white/30" : "bg-[#C9A84C]/40"}`} />
    </div>
  );
}

/** Ornamental gold diamond divider. */
function Ornament({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 my-8">
      <span className={`h-px w-16 ${light ? "bg-white/20" : "bg-[#C9A84C]/30"}`} />
      <span className={`w-1.5 h-1.5 rotate-45 ${light ? "bg-[#E8D48A]" : "bg-[#C9A84C]"}`} />
      <span className={`h-px w-16 ${light ? "bg-white/20" : "bg-[#C9A84C]/30"}`} />
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-36 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAFA] via-[#F5F5F0] to-[#FAFAFA]" />
        {/* subtle oversized serif watermark */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[16rem] md:text-[22rem] leading-none font-bold text-[#2D2D2D]/[0.03] select-none pointer-events-none" style={{ fontFamily: 'Playfair Display, serif' }}>
          K
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <ScrollReveal>
              <Eyebrow>Est. Abuja</Eyebrow>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#2D2D2D] mb-6 leading-[1.1]" style={{ fontFamily: 'Playfair Display, serif' }}>
                About <span className="text-[#C9A84C]">Kentaz</span>{" "}
                <span className="italic font-medium">Emporium</span>
              </h1>
              <p className="text-lg md:text-xl text-[#6B6B6B] max-w-3xl mx-auto leading-relaxed">
                Elegant. Luxury. Classy. Refined. — Discover premium fashion, luxury hair, skincare, and
                wellness services curated for the modern individual in Abuja, Nigeria.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <Ornament />
              <div className="flex items-center justify-center gap-2 text-[#C9A84C]">
                <Star className="w-4 h-4 fill-[#C9A84C]" />
                <Star className="w-4 h-4 fill-[#C9A84C]" />
                <Star className="w-4 h-4 fill-[#C9A84C]" />
                <Star className="w-4 h-4 fill-[#C9A84C]" />
                <Star className="w-4 h-4 fill-[#C9A84C]" />
                <span className="ml-2 text-sm text-[#6B6B6B]">Loved by our customers across Abuja</span>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Our Story ────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#FAFAFA] overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <ScrollReveal direction="left">
              <div className="relative max-w-md mx-auto lg:mx-0">
                {/* offset gold frame behind the photo */}
                <div className="absolute -top-5 -left-5 w-full h-full rounded-2xl border-2 border-[#C9A84C]/40" />
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-xl shadow-[#2D2D2D]/10">
                  <SafeImage
                    src={STORE_IMAGES.brandedStaircase}
                    alt="Kentaz Emporium branded staircase at 911 Mall, Maitama"
                    fill
                    className="object-cover"
                  />
                  {/* bottom gradient + address plate */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1A1A1A]/80 via-[#1A1A1A]/30 to-transparent pt-16 pb-6 px-6">
                    <p className="text-white text-sm tracking-[0.25em] uppercase mb-1">Our Home</p>
                    <p className="text-white/90 font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                      911 Mall, Maitama, Abuja
                    </p>
                  </div>
                </div>
                {/* floating gold badge */}
                <div className="absolute -bottom-7 -right-5 bg-[#C9A84C] text-white px-6 py-5 rounded-xl shadow-lg shadow-[#C9A84C]/30 rotate-2">
                  <p className="text-3xl font-bold leading-none">911</p>
                  <p className="text-xs mt-1 tracking-widest uppercase">Mall · Maitama</p>
                </div>
                {/* small secondary photo */}
                <div className="absolute -top-10 -right-6 w-32 md:w-40 aspect-[3/4] rounded-xl overflow-hidden border-4 border-[#FAFAFA] shadow-lg hidden sm:block">
                  <SafeImage
                    src={STORE_IMAGES.walkway}
                    alt="Inside Kentaz Emporium"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.1}>
              <div>
                <Eyebrow>Our Story</Eyebrow>
                <h2 className="text-3xl md:text-5xl font-bold text-[#2D2D2D] mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Where Elegance Meets <span className="italic text-[#C9A84C]">Care</span>
                </h2>
                <p className="text-[#6B6B6B] mb-6 leading-relaxed text-lg">
                  Kentaz Emporium was born in Abuja with one standard: elegant, luxury, classy, refined.
                  What began as a founder&apos;s passion for premium fashion and beauty has grown into a
                  complete lifestyle destination — a place where luxury retail meets wellness.
                </p>
                <p className="text-[#6B6B6B] mb-8 leading-relaxed">
                  Today, we curate the finest fashion, luxury human hair, skincare, and lifestyle essentials
                  for the modern individual — and we go further. Under one roof at 911 Mall, Maitama, we also
                  offer mental health consultation and therapy, and a professional podcast studio, because we
                  believe true luxury includes how you feel and what you create.
                </p>
                <blockquote className="relative border-l-2 border-[#C9A84C] pl-6 py-2 mb-10">
                  <span className="absolute -top-4 left-4 text-6xl text-[#C9A84C]/25 leading-none select-none" style={{ fontFamily: 'Playfair Display, serif' }}>
                    &ldquo;
                  </span>
                  <p className="text-[#2D2D2D] italic text-lg leading-relaxed">
                    Discover premium fashion, luxury hair, skincare, and wellness services curated for the
                    modern individual in Abuja, Nigeria.
                  </p>
                </blockquote>
                {/* stats — separated by gold rules */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center sm:text-left">
                      <p className="text-2xl md:text-3xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {stat.value}
                      </p>
                      <div className="w-8 h-px bg-[#C9A84C]/50 my-2 mx-auto sm:mx-0" />
                      <p className="text-xs text-[#6B6B6B] uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Inside Kentaz Emporium gallery ───────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#F5F5F0]">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <Eyebrow>The Experience</Eyebrow>
              <h2 className="text-3xl md:text-5xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Inside <span className="italic text-[#C9A84C]">Kentaz Emporium</span>
              </h2>
              <p className="text-[#6B6B6B] max-w-2xl mx-auto">
                Step inside 911 Mall, Maitama — curated fashion, luxury hair, skincare, and more under one roof
              </p>
            </div>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {gallery.map((img, index) => (
              <ScrollReveal key={index} delay={index * 0.08} direction="scale">
                <div className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-white shadow-md shadow-[#2D2D2D]/5 hover:shadow-2xl hover:shadow-[#2D2D2D]/15 transition-all duration-500">
                  <SafeImage
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/85 via-[#1A1A1A]/10 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />
                  <div className="absolute inset-x-0 bottom-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="w-10 h-px bg-[#C9A84C] mb-3" />
                    <p className="text-white font-semibold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {img.caption}
                    </p>
                  </div>
                  {/* gold corner ring on hover */}
                  <div className="absolute inset-3 rounded-xl border border-[#C9A84C]/0 group-hover:border-[#C9A84C]/60 transition-colors duration-500 pointer-events-none" />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Values ───────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <Eyebrow>What We Stand For</Eyebrow>
              <h2 className="text-3xl md:text-5xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Our <span className="italic text-[#C9A84C]">Values</span>
              </h2>
              <p className="text-[#6B6B6B] max-w-2xl mx-auto">
                The principles that guide everything we do
              </p>
            </div>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="group relative h-full bg-[#FAFAFA] rounded-2xl p-7 pt-10 overflow-hidden hover:bg-white hover:shadow-xl hover:shadow-[#2D2D2D]/10 hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-[#C9A84C]/30">
                  {/* top gold line */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C9A84C] to-[#E8D48A] opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* watermark number */}
                  <span className="absolute -top-3 right-3 text-7xl font-bold text-[#C9A84C]/10 select-none" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {value.number}
                  </span>
                  <div className="w-14 h-14 bg-[#C9A84C]/10 group-hover:bg-[#C9A84C] rounded-full flex items-center justify-center mb-5 transition-colors duration-300">
                    <value.icon className="w-7 h-7 text-[#C9A84C] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#2D2D2D] mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {value.title}
                  </h3>
                  <p className="text-[#6B6B6B] text-sm leading-relaxed">{value.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Journey ──────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#F5F5F0]">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <Eyebrow>Milestones</Eyebrow>
              <h2 className="text-3xl md:text-5xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Our <span className="italic text-[#C9A84C]">Journey</span>
              </h2>
              <p className="text-[#6B6B6B] max-w-2xl mx-auto">
                From vision to reality — the milestones that define us
              </p>
            </div>
          </ScrollReveal>
          <div className="relative max-w-3xl mx-auto">
            {/* vertical gold line */}
            <div className="absolute left-[19px] md:left-1/2 top-2 bottom-2 w-px bg-[#C9A84C]/30 md:-translate-x-px" />
            <div className="space-y-10">
              {timeline.map((item, index) => {
                const left = index % 2 === 0;
                return (
                  <ScrollReveal key={index} delay={index * 0.1} direction={left ? "left" : "right"}>
                    <div className="relative md:grid md:grid-cols-2 md:gap-x-14 md:items-center">
                      {/* node */}
                      <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 top-1 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-[#F5F5F0] border-2 border-[#C9A84C]">
                        <span className="w-3 h-3 rounded-full bg-[#C9A84C]" />
                      </div>
                      {/* card — sits in the correct grid column, never under the node */}
                      <div className={`pl-16 md:pl-0 ${left ? "md:col-start-1" : "md:col-start-2"}`}>
                        <div className="bg-white rounded-2xl p-7 shadow-md shadow-[#2D2D2D]/5 hover:shadow-xl hover:shadow-[#2D2D2D]/10 transition-shadow duration-300 border-l-4 border-[#C9A84C]">
                          <span className="inline-block text-[11px] tracking-[0.3em] uppercase text-[#C9A84C] font-semibold bg-[#C9A84C]/10 px-3 py-1 rounded-full mb-3">
                            {item.year}
                          </span>
                          <h3 className="text-xl font-semibold text-[#2D2D2D] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                            {item.title}
                          </h3>
                          <p className="text-[#6B6B6B] text-sm leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Offer ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <Eyebrow>Discover</Eyebrow>
              <h2 className="text-3xl md:text-5xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                What We <span className="italic text-[#C9A84C]">Offer</span>
              </h2>
              <p className="text-[#6B6B6B] max-w-2xl mx-auto">
                Premium products and services for the discerning individual
              </p>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <ScrollReveal direction="left">
              <div className="relative h-full bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F0] rounded-3xl p-8 md:p-10 border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 transition-colors duration-300 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#C9A84C]/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-[#2D2D2D] text-[#C9A84C] flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-semibold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Products
                    </h3>
                  </div>
                  <ul className="space-y-4">
                    {productOffers.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-[#6B6B6B] group/item">
                        <span className="w-6 h-6 rounded-full bg-[#C9A84C]/15 flex items-center justify-center shrink-0 group-hover/item:bg-[#C9A84C] transition-colors duration-300">
                          <Check className="w-3.5 h-3.5 text-[#C9A84C] group-hover/item:text-white transition-colors duration-300" />
                        </span>
                        <span className="group-hover/item:text-[#2D2D2D] transition-colors duration-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={0.1}>
              <div className="relative h-full bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F0] rounded-3xl p-8 md:p-10 border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 transition-colors duration-300 overflow-hidden">
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#C9A84C]/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-[#2D2D2D] text-[#C9A84C] flex items-center justify-center">
                      <Heart className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-semibold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Services
                    </h3>
                  </div>
                  <ul className="space-y-4">
                    {serviceOffers.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-[#6B6B6B] group/item">
                        <span className="w-6 h-6 rounded-full bg-[#C9A84C]/15 flex items-center justify-center shrink-0 group-hover/item:bg-[#C9A84C] transition-colors duration-300">
                          <Check className="w-3.5 h-3.5 text-[#C9A84C] group-hover/item:text-white transition-colors duration-300" />
                        </span>
                        <span className="group-hover/item:text-[#2D2D2D] transition-colors duration-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-32 bg-[#2D2D2D] text-center overflow-hidden">
        {/* gold glow accents */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[#C9A84C]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-[#C9A84C]/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <Eyebrow light>Begin Your Journey</Eyebrow>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Ready to Experience <span className="italic text-[#E8D48A]">Luxury?</span>
            </h2>
            <p className="text-white/70 mb-12 max-w-2xl mx-auto text-lg leading-relaxed">
              Whether you&apos;re looking for premium products or our professional services, we&apos;d love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A1A] px-10 py-4 rounded-full hover:bg-[#E8D48A] hover:shadow-lg hover:shadow-[#C9A84C]/30 transition-all duration-300 font-semibold group"
              >
                Browse Products <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-10 py-4 rounded-full hover:border-[#C9A84C] hover:text-[#E8D48A] transition-colors duration-300 font-medium"
              >
                Our Services
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Visit Us ─────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#FAFAFA]">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-14">
              <Eyebrow>Find Us</Eyebrow>
              <h2 className="text-3xl md:text-5xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Visit <span className="italic text-[#C9A84C]">Us</span>
              </h2>
              <p className="text-[#6B6B6B] max-w-2xl mx-auto">
                Experience Kentaz Emporium at 911 Mall, Maitama — or reach us wherever you are.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="group bg-white rounded-2xl p-7 text-center h-full border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 hover:shadow-xl hover:shadow-[#2D2D2D]/10 hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-[#C9A84C]/10 group-hover:bg-[#C9A84C] rounded-full flex items-center justify-center mx-auto mb-5 transition-colors duration-300">
                  <MapPin className="w-6 h-6 text-[#C9A84C] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-semibold text-[#2D2D2D] mb-2 text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>Address</h3>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">
                  Suite 35, 911 Mall, 70 Usuma Street, Off Gana Street, Maitama, Abuja
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="group bg-white rounded-2xl p-7 text-center h-full border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 hover:shadow-xl hover:shadow-[#2D2D2D]/10 hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-[#C9A84C]/10 group-hover:bg-[#C9A84C] rounded-full flex items-center justify-center mx-auto mb-5 transition-colors duration-300">
                  <Phone className="w-6 h-6 text-[#C9A84C] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-semibold text-[#2D2D2D] mb-2 text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>Call Us</h3>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">
                  {BUSINESS.phoneDisplay}
                  <br />
                  09135001200
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="group bg-white rounded-2xl p-7 text-center h-full border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 hover:shadow-xl hover:shadow-[#2D2D2D]/10 hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-[#C9A84C]/10 group-hover:bg-[#C9A84C] rounded-full flex items-center justify-center mx-auto mb-5 transition-colors duration-300">
                  <MessageCircle className="w-6 h-6 text-[#C9A84C] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-semibold text-[#2D2D2D] mb-2 text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>WhatsApp</h3>
                <a
                  href={`https://wa.me/${BUSINESS.whatsapp}`}
                  className="text-[#6B6B6B] text-sm hover:text-[#C9A84C] transition-colors"
                >
                  Chat with us on WhatsApp
                </a>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="group bg-white rounded-2xl p-7 text-center h-full border border-[#2D2D2D]/5 hover:border-[#C9A84C]/40 hover:shadow-xl hover:shadow-[#2D2D2D]/10 hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-[#C9A84C]/10 group-hover:bg-[#C9A84C] rounded-full flex items-center justify-center mx-auto mb-5 transition-colors duration-300">
                  <Instagram className="w-6 h-6 text-[#C9A84C] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-semibold text-[#2D2D2D] mb-2 text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>Follow Us</h3>
                <a
                  href="https://instagram.com/kentaz.emporium"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6B6B6B] text-sm hover:text-[#C9A84C] transition-colors"
                >
                  @kentaz.emporium
                </a>
              </div>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={0.2}>
            <div className="mt-10 bg-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-center gap-x-12 gap-y-4 text-[#6B6B6B] text-sm max-w-4xl mx-auto border border-[#2D2D2D]/5">
              <span className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#C9A84C]" />
                </span>
                Open daily · Closes 8 PM
              </span>
              <span className="hidden md:block w-px h-6 bg-[#2D2D2D]/10" />
              <span className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-[#C9A84C]" />
                </span>
                Rated by our customers on Google
              </span>
              <span className="hidden md:block w-px h-6 bg-[#2D2D2D]/10" />
              <span className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#C9A84C]" />
                </span>
                {BUSINESS.email}
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
