'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Eye, EyeOff, Loader2, LayoutGrid } from 'lucide-react';
import { posApi, savePosSession, getPosUser } from '@/lib/posApi';

export default function PosLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getPosUser()) router.replace('/pos/dashboard');
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await posApi.login(email, password);
      savePosSession(user, token);
      router.push('/pos/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* POS Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-lg border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C9A84C] flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">Kentaz POS</p>
            <p className="text-gray-400 text-xs">{new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500">Staff Login</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C9A84C] mb-4 shadow-lg">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kentaz POS</h1>
          <p className="text-gray-400 text-sm mt-1">Point of Sale — Staff Login</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="staff@kentaz.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C9A84C] hover:bg-[#b8973e] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Contact your admin if you can't log in.
        </p>
      </div>
      </div>
    </div>
  );
}
