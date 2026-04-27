import type { Metadata } from 'next';

// Account pages are private — do not index them
export const metadata: Metadata = {
  title: 'My Account',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
