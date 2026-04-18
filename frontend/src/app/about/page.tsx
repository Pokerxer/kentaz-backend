"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Award, Users, Heart, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const stats = [
  { value: "500+", label: "Happy Customers" },
  { value: "100+", label: "Curated Products" },
  { value: "Abuja", label: "Location" },
  { value: "4.9", label: "Average Rating" },
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
    description: "We source only genuine, premium products from trusted brands and suppliers.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Building lasting relationships with our customers through trust and transparency.",
  },
];

const timeline = [
  {
    year: "2020",
    title: "The Beginning",
    description: "Kentaz Emporium was founded in Abuja with a vision to bring global luxury to Nigeria.",
  },
  {
    year: "2022",
    title: "Expanding Horizons",
    description: "Expanded our collection to include skincare, beauty, and lifestyle products.",
  },
  {
    year: "2024",
    title: "Services Launch",
    description: "Added Mental Health Consultation and Podcast Studio services to our portfolio.",
  },
  {
    year: "2025",
    title: "Today",
    description: "Serving hundreds of satisfied customers across Nigeria with premium products and services.",
  },
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
            <p className="text-lg md:text-xl text-[#6B6B6B] max-w-2xl mx-auto">
              Luxury. Lifestyle. Wellness. — Elevating every aspect of your life with premium products and exceptional services.
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
                  <Image
                    src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800"
                    alt="Kentaz Emporium Store"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-[#C9A84C] text-white p-6 rounded-xl">
                  <p className="text-3xl font-bold">5+</p>
                  <p className="text-sm">Years of Excellence</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Our Story
                </h2>
                <p className="text-[#6B6B6B] mb-6 leading-relaxed">
                  Founded in Abuja, Kentaz Emporium began as a small boutique with a big dream — to make luxury accessible to discerning customers across Nigeria. What started as a passion for fashion has evolved into a comprehensive lifestyle destination.
                </p>
                <p className="text-[#6B6B6B] mb-8 leading-relaxed">
                  Today, we curate the finest selection of fashion, beauty, and lifestyle products from around the world, while also offering unique services like mental health consultation and professional podcast studio rental.
                </p>
                <div className="flex gap-4">
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
              Key milestones that have shaped who we are today
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
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Premium Fashion & Accessories
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Luxury Skincare & Beauty
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Human Hair & Wigs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Designer Bags & Shoes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Fine Perfumes
                  </li>
                </ul>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="bg-[#FAFAFA] rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-2xl font-semibold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Services
                </h3>
                <ul className="space-y-3 text-[#6B6B6B]">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Mental Health Consultation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Professional Podcast Studio
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Personal Shopping
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Gift Wrapping
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#C9A84C] rounded-full" />
                    Nationwide Delivery
                  </li>
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
            Whether you're looking for premium products or our professional services, we'd love to hear from you.
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

      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-[#FAFAFA] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-[#2D2D2D] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Get in Touch
              </h3>
              <p className="text-[#6B6B6B]">
                Have questions? We'd love to hear from you.
              </p>
            </div>
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center gap-2 bg-[#2D2D2D] text-white px-8 py-3 rounded-full hover:bg-[#C9A84C] transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
