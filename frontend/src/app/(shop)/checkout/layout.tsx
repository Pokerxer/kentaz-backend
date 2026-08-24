import type { Metadata } from 'next';
import { pageAlternates } from '@/lib/seo';

// Checkout is a transactional funnel step — no search value
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: true },
  alternates: pageAlternates('/checkout'),
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
