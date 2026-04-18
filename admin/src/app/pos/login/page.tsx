'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { posApi, savePosSession, getPosUser } from '@/lib/posApi';
import { LayoutGrid, Delete, Loader2, ChevronLeft, AlertCircle } from 'lucide-react';

type Staff = { _id: string; name: string; role: string; avatar: string | null; initials: string };
type Screen = 'select' | 'pin';

export default function PosLoginPage() {
  const router = useRouter();
  const [screen, setScreen]         = useState<Screen>('select');
  const [staff, setStaff]           = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selected, setSelected]     = useState<Staff | null>(null);
  const [pin, setPin]               = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const submitRef = useRef(false);

  // Redirect if already logged in
  useEffect(() => {
    if (getPosUser()) router.replace('/pos/dashboard');
  }, [router]);

  // Load staff list
  useEffect(() => {
    posApi.getStaffList()
      .then(setStaff)
      .catch(() => setStaff([]))
      .finally(() => setLoadingStaff(false));
  }, []);

  function selectStaff(s: Staff) {
    setSelected(s);
    setPin('');
    setError('');
    setScreen('pin');
  }

  function pressKey(k: string) {
    if (pin.length >= 20) return;
    setPin(p => p + k);
    setError('');
  }

  function backspace() {
    setPin(p => p.slice(0, -1));
    setError('');
  }

  async function submitPin() {
    if (!selected || !pin || submitting || submitRef.current) return;
    submitRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const { user, token } = await posApi.loginById(selected._id, pin);
      savePosSession(user, token);
      router.push('/pos/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid password');
      setPin('');
    } finally {
      setSubmitting(false);
      submitRef.current = false;
    }
  }

  // Auto-submit when pin reaches a reasonable length (if user presses enter via pad)
  // Handled by the ✓ button instead

  const now = new Date();
  const timeStr  = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  const dateStr  = now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });

  const PAD_KEYS = ['1','2','3','4','5','6','7','8','9','0'];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none">

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C9A84C] flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Kentaz POS</p>
            <p className="text-gray-500 text-xs mt-0.5">Point of Sale</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white text-lg font-semibold leading-none">{timeStr}</p>
          <p className="text-gray-500 text-xs mt-0.5">{dateStr}</p>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">

        {/* ── STAFF SELECTOR ── */}
        {screen === 'select' && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">Who's working today?</h1>
              <p className="text-gray-500 text-sm mt-1">Select your name to sign in</p>
            </div>

            {loadingStaff ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No staff accounts found.</p>
                <p className="text-gray-600 text-xs mt-1">Contact your admin to add staff users.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {staff.map(s => (
                  <button
                    key={s._id}
                    onClick={() => selectStaff(s)}
                    className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#C9A84C]/50 rounded-2xl transition-all duration-150 active:scale-95"
                  >
                    {/* Avatar */}
                    {s.avatar ? (
                      <img src={s.avatar} alt={s.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[#C9A84C]/50" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C9A84C] to-amber-600 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-[#C9A84C]/50">
                        <span className="text-white font-bold text-xl">{s.initials}</span>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm leading-tight">{s.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5 capitalize">{s.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PIN PAD ── */}
        {screen === 'pin' && selected && (
          <div className="w-full max-w-xs">

            {/* Back + staff name */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => { setScreen('select'); setPin(''); setError(''); }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                {selected.avatar ? (
                  <img src={selected.avatar} alt={selected.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-amber-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{selected.initials}</span>
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold text-sm leading-none">{selected.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5 capitalize">{selected.role}</p>
                </div>
              </div>
            </div>

            <p className="text-center text-gray-400 text-sm mb-5">Enter your password</p>

            {/* PIN dots */}
            <div className="flex items-center justify-center gap-2 mb-6 min-h-[20px]">
              {pin.length === 0 ? (
                <div className="flex gap-2">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  ))}
                </div>
              ) : (
                Array.from({ length: pin.length }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#C9A84C]" />
                ))
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-center gap-2 p-3 bg-red-500/15 border border-red-500/25 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {PAD_KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => pressKey(k)}
                  className="h-14 rounded-2xl bg-white/8 hover:bg-white/15 active:bg-white/20 text-white text-xl font-semibold transition-all active:scale-95 border border-white/5"
                >
                  {k}
                </button>
              ))}

              {/* Bottom row: backspace | 0 | submit */}
              <button
                onClick={backspace}
                disabled={pin.length === 0}
                className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-gray-400 hover:text-white transition-all active:scale-95 border border-white/5 flex items-center justify-center disabled:opacity-30"
              >
                <Delete className="w-5 h-5" />
              </button>

              <button
                onClick={() => pressKey('0')}
                className="h-14 rounded-2xl bg-white/8 hover:bg-white/15 active:bg-white/20 text-white text-xl font-semibold transition-all active:scale-95 border border-white/5"
              >
                0
              </button>

              <button
                onClick={submitPin}
                disabled={pin.length === 0 || submitting}
                className="h-14 rounded-2xl bg-[#C9A84C] hover:bg-[#b8933e] active:bg-[#a8832e] text-white font-bold transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center"
              >
                {submitting
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <span className="text-lg">✓</span>
                }
              </button>
            </div>

            <p className="text-center text-gray-600 text-xs mt-6">Use your account password</p>
          </div>
        )}

      </div>
    </div>
  );
}
