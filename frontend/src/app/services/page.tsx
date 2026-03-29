import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Mic, Heart, Users, Sparkles, Shield, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const services = [
  {
    id: 'therapy',
    name: 'Therapy Sessions',
    slug: 'therapy',
    shortDescription: 'Take the first step towards mental wellness',
    description: 'Professional therapy sessions with licensed counselors. Confidential, compassionate support for your mental health journey.',
    type: 'wellness',
    category: 'Wellness',
    price: 150,
    duration: 60,
    icon: Heart,
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80',
    features: ['Licensed professionals', 'Confidential sessions', 'Flexible scheduling', 'Online or in-person'],
    rating: 4.9,
    reviews: 127,
  },
  {
    id: 'podcast',
    name: 'Podcast Studio',
    slug: 'podcast',
    shortDescription: 'Record your next episode in style',
    description: 'Professional podcast recording studio with state-of-the-art equipment. Soundproof room, editing included.',
    type: 'creative',
    category: 'Creative',
    price: 75,
    duration: 120,
    icon: Mic,
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80',
    features: ['Professional mics', 'Soundproof room', 'Editing included', 'Live streaming ready'],
    rating: 4.8,
    reviews: 64,
  },
];

const trustStats = [
  { value: '500+', label: 'Sessions Completed' },
  { value: '98%', label: 'Client Satisfaction' },
  { value: '15+', label: 'Expert Professionals' },
  { value: '4.9', label: 'Average Rating' },
];

const whyChooseUs = [
  {
    icon: Shield,
    title: 'Licensed Professionals',
    description: 'All therapists and practitioners are fully certified and licensed.',
  },
  {
    icon: Sparkles,
    title: 'Premium Experience',
    description: 'Luxury amenities and personalized attention in every session.',
  },
  {
    icon: Clock,
    title: 'Flexible Scheduling',
    description: 'Book sessions that fit your schedule with ease.',
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=1920&q=80)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.3)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
              <span className="text-[#C9A84C] text-xs font-medium tracking-widest uppercase">Premium Services</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Elevate Your <span className="animate-gold-shimmer bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-[length:200%_100%] bg-clip-text text-transparent">Wellness</span>
              <br />& Lifestyle
            </h1>

            <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              From mental health support to creative production, discover professional services tailored to your needs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#services">
                <Button size="lg" className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] font-semibold gap-2 px-8">
                  Explore Services
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:border-[#C9A84C] px-8">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
      </section>

      {/* Trust Stats */}
      <section className="bg-[#FAFAFA] py-12 border-y border-[#E5E5E5]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustStats.map((stat, index) => (
              <ScrollReveal key={stat.label} delay={index * 100}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#C9A84C] mb-1">{stat.value}</div>
                  <div className="text-sm text-[#6B6B6B]">{stat.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="bg-[#FAFAFA] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">Our Services</h2>
              <p className="text-[#6B6B6B] max-w-2xl mx-auto">
                Discover our range of professional services designed to enhance your wellbeing and creative expression.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {services.map((service, index) => (
              <ScrollReveal key={service.id} delay={index * 150} direction="up">
                <div className="group bg-white rounded-2xl overflow-hidden border border-[#E5E5E5] hover:border-[#C9A84C]/50 transition-all duration-500 hover:shadow-xl hover:shadow-[#C9A84C]/10">
                  {/* Image */}
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Category Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium tracking-wide">
                        {service.category}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                      <Star className="w-3.5 h-3.5 text-[#C9A84C] fill-[#C9A84C]" />
                      <span className="text-white text-xs font-medium">{service.rating}</span>
                      <span className="text-white/60 text-xs">({service.reviews})</span>
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl font-bold text-white mb-1">{service.name}</h3>
                      <p className="text-white/80 text-sm">{service.shortDescription}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-[#6B6B6B] text-sm mb-6 leading-relaxed">{service.description}</p>

                    {/* Meta info */}
                    <div className="flex items-center gap-6 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-[#C9A84C]" />
                        <span className="text-[#1A1A1A]">{service.duration} min</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <service.icon className="w-4 h-4 text-[#C9A84C]" />
                        <span className="text-[#1A1A1A]">1-on-1 Session</span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                          <svg className="w-4 h-4 text-[#C9A84C] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
                      <div>
                        <span className="text-[#6B6B6B] text-sm">From </span>
                        <span className="text-2xl font-bold text-[#1A1A1A]">${service.price}</span>
                        <span className="text-[#6B6B6B] text-sm">/session</span>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/services/${service.slug}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            Details
                          </Button>
                        </Link>
                        <Link href={`/services/booking?type=${service.slug}`}>
                          <Button size="sm" className="bg-[#C9A84C] hover:bg-[#E8D48A] text-[#0a0a0a] gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Book
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-[#1A1A1A] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Choose Kentaz</h2>
              <p className="text-white/60 max-w-2xl mx-auto">
                Experience the difference of premium service delivery.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {whyChooseUs.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 150} direction="up">
                <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#C9A84C]/30 transition-colors">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-[#C9A84C]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-white/60 text-sm">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-[#0a0a0a]/70 text-lg mb-8 max-w-2xl mx-auto">
                Book your first session today and take the first step towards a better you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/services/booking">
                  <Button size="lg" className="bg-[#0a0a0a] hover:bg-[#1A1A1A] text-white gap-2 px-8">
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-[#0a0a0a]/30 text-[#0a0a0a] hover:bg-[#0a0a0a]/10 px-8">
                    Speak to Us
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
