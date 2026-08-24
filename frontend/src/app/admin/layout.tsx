import type { Metadata } from 'next';
import { pageAlternates } from '@/lib/seo';

// Admin pages are private — do not index them
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
  alternates: pageAlternates('/admin'),
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
