import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Decorative number */}
        <div className="relative inline-block mb-6">
          <p className="text-[9rem] font-black text-gray-100 leading-none select-none">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-[#C9A84C]/10 flex items-center justify-center">
              <SearchX className="h-10 w-10 text-[#C9A84C]" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Page not found</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          The page you're looking for doesn't exist or may have been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white font-semibold rounded-xl text-sm hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:border-[#C9A84C]/50 hover:text-[#C9A84C] transition-colors"
          >
            Browse Products
          </Link>
        </div>

        {/* Brand watermark */}
        <p className="mt-12 text-xs text-gray-300 font-semibold tracking-widest uppercase">
          Kentaz Emporium
        </p>
      </div>
    </div>
  );
}
