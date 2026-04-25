'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Something went wrong</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          An unexpected error occurred. Please try again — if the problem persists, contact our support team.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C9A84C] hover:bg-[#b8963e] text-[#0a0a0a] font-semibold rounded-xl text-sm transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:border-gray-300 transition-colors"
          >
            Go Home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-gray-300 font-mono">Error ID: {error.digest}</p>
        )}

        <p className="mt-4 text-xs text-gray-300 font-semibold tracking-widest uppercase">
          Kentaz Emporium
        </p>
      </div>
    </div>
  );
}
