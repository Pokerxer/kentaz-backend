import type { Metadata } from 'next';
import { pageAlternates } from '@/lib/seo';

// Booking checkout is a transactional funnel step — no search value
export const metadata: Metadata = {
  title: 'Book a Session',
  description: 'Book therapy sessions or podcast studio time with Kentaz Emporium.',
  robots: { index: false, follow: true },
  alternates: pageAlternates('/services/booking'),
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
