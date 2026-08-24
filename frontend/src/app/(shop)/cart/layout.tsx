import type { Metadata } from 'next';
import { pageAlternates } from '@/lib/seo';

// Cart is a transient UI state — no search value
export const metadata: Metadata = {
  title: 'Your Cart',
  robots: { index: false, follow: true },
  alternates: pageAlternates('/cart'),
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
