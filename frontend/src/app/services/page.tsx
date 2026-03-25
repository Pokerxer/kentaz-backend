import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Mic, Heart, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const services = [
  {
    id: 'therapy',
    name: 'Therapy Sessions',
    slug: 'therapy',
    description: 'Professional therapy sessions with licensed counselors. Take the first step towards mental wellness.',
    type: 'therapy',
    price: 150,
    duration: 60,
    icon: Heart,
    image: '/placeholder.jpg',
    features: ['Licensed professionals', 'Confidential sessions', 'Flexible scheduling', 'Online or in-person'],
  },
  {
    id: 'podcast',
    name: 'Podcast Studio',
    slug: 'podcast',
    description: 'Professional podcast recording studio with state-of-the-art equipment. Record your next episode today.',
    type: 'podcast',
    price: 75,
    duration: 120,
    icon: Mic,
    image: '/placeholder.jpg',
    features: ['Professional mics', 'Soundproof room', 'Editing included', 'Live streaming ready'],
  },
];

export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Our Services</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Book professional services tailored to your needs. From mental health support to creative production.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {services.map((service) => (
          <Card key={service.id} className="overflow-hidden">
            <div className="relative h-48 bg-muted">
              <Image
                src={service.image}
                alt={service.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge variant="secondary" className="mb-2">
                  {service.type}
                </Badge>
                <h3 className="text-2xl font-bold text-white">{service.name}</h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-muted-foreground mb-6">{service.description}</p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration} min</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span>From ${service.price}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/services/${service.slug}`}>
                <Button className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Now
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
