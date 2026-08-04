"use client";

import Link from "next/link";
import SafeImage from '@/components/ui/SafeImage';
import {
  ArrowRight, Star, Award, Users, Heart, Sparkles,
  MapPin, Phone, MessageCircle, Instagram, Clock, Mail,
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
  { src: STORE_IMAGES.boutiqueFashionBeauty, alt: "Kentaz Emporium lifestyle boutique — fashion, beauty and shoes" },
  { src: STORE_IMAGES.menswearShoes, alt: "Menswear and dress shoes display at Kentaz Emporium" },
  { src: STORE_IMAGES.dressesSkincare, alt: "Occasion dresses and skincare shelves at Kentaz Emporium" },
  { src: STORE_IMAGES.casualWear, alt: "Casual fashion collections at Kentaz Emporium" },
  { src: STORE_IMAGES.wigsAccessories, alt: "Luxury human hair wigs and accessories at Kentaz Emporium" },
  { src: STORE_IMAGES.walkway, alt: "Kentaz Emporium upper-level walkway" },
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
    title: "Quality First",
    description: "Every product is carefully curated to meet our exacting standards of excellence.",
  },
  {
    icon: Heart,
    title: "Customer-Centric",
    description: "Your satisfaction is our priority. We go above and beyond to exceed expectations.",
  },
  {
    icon: Award,
    title: "Authentic Luxury",
    description: "Elegant, luxury, classy and refined — we source only genuine, premium products from trusted brands and suppliers.",
  },
  {
    icon: Users,
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

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <section className="relative py-20 md:py-32 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAFA] via-[#F5F5F0] to-[#FAFAFA]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-[#2D2D2D] mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              About <span className="text-[#C9A84C]">Kentaz</span> Emporium
            </h1>
            <p className="text-lg md:text-xl text-[#6B6B6B] max-w-3xl mx-auto">
              Elegant. Luxury. Classy. Refined. — Discover premium fashion, luxury hair, skincare, and wellness services curated for the modern individual in Abuja, Nigeria.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#FAFAFA]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <div className="relative">
                <div className="aspect-[4/5] relative rounded-2xl overflow-hidden">
                  <SafeImage
                    src={STORE_IMAGES.brandedStaircase}
                    alt="Kentaz Emporium branded staircase at 911 Mall, Maitama"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-[#C9A84C] text-white p-6 rounded-xl">
                  <p className="text-3xl font-bold">911</p>
                  <p className="text-sm">Mall, Maitama, Abuja</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Our Story
                </h2>
                <p className="text-[#6B6B6B] mb-6 leading-relaxed">
                  Kentaz Emporium was born in Abuja with one standard: elegant, luxury, classy, refined. What began as a founder&apos;s passion for premium fashion and beauty has grown into a complete lifestyle destination — a place where luxury retail meets wellness.
                </p>
                <p className="text-[#6B6B6B] mb-8 leading-relaxed">
                  Today, we curate the finest fashion, luxury human hair, skincare, and lifestyle essentials for the modern individual — and we go further. Under one roof at 911 Mall, Maitama, we also offer mental health consultation and therapy, and a professional podcast studio, because we believe true luxury includes how you feel and what you create.
                </p>
                <blockquote className="border-l-4 border-[#C9A84C] pl-4 text-[#2D2D2D] italic mb-8">
                  &ldquo;Discover premium fashion, luxury hair, skincare, and wellness services curated for the modern individual in Abuja, Nigeria.&rdquo;
                </blockquote>
                <div className="flex flex-wrap gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <p className="text-2xl font-bold text-[#C9A84C]">{stat.value}</p>
                      <p className="text-xs text-[#6B6B6B]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#F5F5F0]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Inside Kentaz Emporium
            </h2>
            <p className="text-[#6B6B6B] max-w-2xl mx-auto">
              Step inside 911 Mall, Maitama — curated fashion, luxury hair, skincare, and more under one roof
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {gallery.map((img, index) => (
              <ScrollReveal key={index} delay={index * 0.08}>
                <div className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-shadow duration-300">
                  <SafeImage
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Our Values
            </h2>
            <p className="text-[#6B6B6B] max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="bg-[#FAFAFA] p-6 rounded-2xl text-center hover:shadow-lg transition-shadow duration-300">
                  <div className="w-14 h-14 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-[#C9A84C]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#2D2D2D] mb-2">{value.title}</h3>
                  <p className="text-[#6B6B6B] text-sm">{value.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#F5F5F0]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Our Journey
            </h2>
            <p className="text-[#6B6B6B] max-w-2xl mx-auto">
              From vision to reality — the milestones that define us
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-8">
            {timeline.map((item, index) => (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 bg-[#C9A84C] rounded-full" />
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 h-24 bg-[#C9A84C]/30" />
                    )}
                  </div>
                  <div className="flex-1 bg-white p-6 rounded-xl">
                    <span className="text-[#C9A84C] font-bold">{item.year}</span>
                    <h3 className="text-lg font-semibold text-[#2D2D2D] mt-1">{item.title}</h3>
                    <p className="text-[#6B6B6B] mt-2">{item.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              What We Offer
            </h2>
            <p className="text-[#6B6B6B] max-w-2xl mx-auto">
              Premium products and services for the discerning individual
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="bg-[#FAFAFA] rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-2xl font-semibold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Products
                </h3>
                <ul className="space-y-3 text-[#6B6B6B]">
                  {productOffers.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="bg-[#FAFAFA] rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-2xl font-semibold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Services
                </h3>
                <ul className="space-y-3 text-[#6B6B6B]">
                  {serviceOffers.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#2D2D2D] text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            Ready to Experience Luxury?
          </h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re looking for premium products or our professional services, we&apos;d love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-[#C9A84C] text-white px-8 py-4 rounded-full hover:bg-[#E8D48A] transition-colors font-medium"
            >
              Browse Products <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full hover:bg-white hover:text-[#2D2D2D] transition-colors font-medium"
            >
              Our Services
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Visit Us
            </h2>
            <p className="text-[#6B6B6B] max-w-2xl mx-auto">
              Experience Kentaz Emporium at 911 Mall, Maitama — or reach us wherever you are.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="bg-[#FAFAFA] rounded-2xl p-6 text-center h-full">
                <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <h3 className="font-semibold text-[#2D2D2D] mb-2">Address</h3>
                <p className="text-[#6B6B6B] text-sm">
                  Suite 35, 911 Mall, 70 Usuma Street, Off Gana Street, Maitama, Abuja
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="bg-[#FAFAFA] rounded-2xl p-6 text-center h-full">
                <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <h3 className="font-semibold text-[#2D2D2D] mb-2">Call Us</h3>
                <p className="text-[#6B6B6B] text-sm">
                  {BUSINESS.phoneDisplay}
                  <br />
                  09135001200
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="bg-[#FAFAFA] rounded-2xl p-6 text-center h-full">
                <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <h3 className="font-semibold text-[#2D2D2D] mb-2">WhatsApp</h3>
                <a
                  href={`https://wa.me/${BUSINESS.whatsapp}`}
                  className="text-[#6B6B6B] text-sm hover:text-[#C9A84C] transition-colors"
                >
                  Chat with us on WhatsApp
                </a>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="bg-[#FAFAFA] rounded-2xl p-6 text-center h-full">
                <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Instagram className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <h3 className="font-semibold text-[#2D2D2D] mb-2">Follow Us</h3>
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
          <div className="mt-8 bg-[#FAFAFA] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-center gap-x-10 gap-y-3 text-[#6B6B6B] text-sm max-w-3xl mx-auto">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C9A84C]" />
              Open daily · Closes 8 PM
            </span>
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#C9A84C]" />
              Rated by our customers on Google
            </span>
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#C9A84C]" />
              {BUSINESS.email}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
