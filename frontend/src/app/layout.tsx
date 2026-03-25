import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { CartProvider } from '@/contexts/CartContext';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/ui/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kentaz | Quality Products & Services',
  description: 'Your destination for quality products and services',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <CartProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <CartSidebar />
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
