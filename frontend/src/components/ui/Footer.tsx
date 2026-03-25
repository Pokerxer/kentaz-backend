'use client';

import Link from 'next/link';
import { MessageCircle, MapPin, Instagram, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A]">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
          <div className="lg:col-span-2">
            <h3 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent">
              KENTAZ EMPORIUM
            </h3>
            <p className="text-[#888888] text-sm mb-4">Luxury. Lifestyle. Wellness.</p>
            <p className="text-[#888888] text-sm mb-6 max-w-md">Discover premium fashion, luxury hair, skincare, and wellness services curated for the modern individual in Abuja, Nigeria.</p>
            <div className="flex flex-col gap-3 text-sm text-[#888888]">
              <a href="https://wa.me/2347081856411" className="flex items-center gap-3 hover:text-[#C9A84C] transition-colors">
                <MessageCircle className="h-4 w-4" />
                07081856411
              </a>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4" />
                Suite 35, 911 Mall Usuma Street, Abuja
              </div>
              <a href="https://instagram.com/kentazemporium" className="flex items-center gap-3 hover:text-[#C9A84C] transition-colors">
                <Instagram className="h-4 w-4" />
                @KENTAZ EMPORIUM
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm text-[#888888]">
              <li><Link href="/products" className="hover:text-[#C9A84C] transition-colors">Shop All</Link></li>
              <li><Link href="/services" className="hover:text-[#C9A84C] transition-colors">Services</Link></li>
              <li><Link href="/about" className="hover:text-[#C9A84C] transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#C9A84C] transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-[#C9A84C] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#C9A84C] transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Newsletter</h4>
            <p className="text-[#888888] text-sm mb-4">Subscribe for exclusive offers and updates.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder:text-[#666666] focus:outline-none focus:border-[#C9A84C]/50"
              />
              <Button size="md" className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#1A1A1A] px-4">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 text-center">
          <p className="text-[#666666] text-sm">&copy; 2024 Kentaz Emporium. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
