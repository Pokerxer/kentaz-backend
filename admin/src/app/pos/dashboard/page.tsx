'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart, TrendingUp, Package, Users, LogOut,
  LayoutGrid, Clock, CheckCircle, XCircle, Loader2,
  Banknote, CreditCard, ArrowLeftRight, RotateCcw,
  ChevronRight, Play, Lock, ArrowDownCircle, ArrowUpCircle,
  Receipt, DollarSign, BarChart3, RefreshCw, UserCog,
  ArrowLeft, AlertCircle, X,
} from 'lucide-react';
import { posApi, getPosUser, clearPosSession } from '@/lib/posApi';
import type { PosUser, SalesSummary, Sale, RegisterSession } from '@/lib/posApi';
import { formatPrice } from '@/lib/utils';

function StatCard({
  label, value, sub, icon, color, loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        {loading ? (
          <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse mt-1" />
        ) : (
          <p className="text-xl font-black text-gray-900 mt-0.5 truncate">{value}</p>
        )}
        {sub && !loading && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onContinue,
  onClose,
  onOpen,
  isCurrentSession,
}: {
  session?: RegisterSession | null;
  onContinue?: () => void;
  onClose?: () => void;
  onOpen?: () => void;
  isCurrentSession?: boolean;
}) {
  if (!session) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-700 mb-3">Register</p>
        <div className="flex flex-col items-center py-4 text-gray-400">
          <DollarSign className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm font-medium">No open session</p>
          <p className="text-xs mt-0.5">Open a register to start selling</p>
        </div>
        <button
          onClick={onOpen}
          className="w-full mt-3 py-2.5 bg-[#C9A84C] hover:bg-[#b8963e] text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" /> Open Register
        </button>
      </div>
    );
  }

  const isOpen = session.status === 'open';
  const revenue = isOpen ? (session.liveTotalRevenue ?? 0) : session.totalRevenue;
  const salesCount = isOpen ? (session.liveTotalSales ?? 0) : session.totalSales;
  const openedAt = new Date(session.openedAt);
  const closedAt = session.closedAt ? new Date(session.closedAt) : null;

  // Duration
  const endTime = closedAt ?? new Date();
  const durationMs = endTime.getTime() - openedAt.getTime();
  const hours = Math.floor(durationMs / 3_600_000);
  const mins = Math.floor((durationMs % 3_600_000) / 60_000);
  const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isOpen ? 'border-green-200' : 'border-gray-200'}`}>
      {/* Status strip */}
      <div className={`px-5 py-3 flex items-center justify-between ${isOpen ? 'bg-green-50 border-b border-green-100' : 'bg-gray-50 border-b border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className={`text-xs font-bold ${isOpen ? 'text-green-700' : 'text-gray-500'}`}>
            {isOpen ? 'Open' : 'Closed'}
          </span>
          {isCurrentSession && isOpen && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Current</span>
          )}
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {duration}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-sm font-bold text-gray-900">{session.cashierName}</p>
          <p className="text-xs text-gray-400">
            {openedAt.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {closedAt && ` → ${closedAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-xl py-2 px-1">
            <p className="text-base font-black text-gray-900">{salesCount}</p>
            <p className="text-[10px] text-gray-400">Orders</p>
          </div>
          <div className="bg-gray-50 rounded-xl py-2 px-1">
            <p className="text-base font-black text-[#C9A84C] truncate">{formatPrice(revenue)}</p>
            <p className="text-[10px] text-gray-400">Revenue</p>
          </div>
          <div className="bg-gray-50 rounded-xl py-2 px-1">
            <p className="text-base font-black text-gray-900">{formatPrice(session.openingBalance)}</p>
            <p className="text-[10px] text-gray-400">Opening</p>
          </div>
        </div>

        {!isOpen && session.difference !== undefined && (
          <div className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-between ${
            session.difference === 0 ? 'bg-green-50 text-green-700' :
            session.difference > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'
          }`}>
            <span>Cash difference</span>
            <span>{session.difference >= 0 ? '+' : ''}{formatPrice(session.difference)}</span>
          </div>
        )}

        {isOpen && (
          <div className="flex gap-2">
            <button
              onClick={onContinue}
              className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Sell
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PosDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<PosUser | null>(null);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [currentSession, setCurrentSession] = useState<RegisterSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Open register state
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openRegisterError, setOpenRegisterError] = useState('');
  const [openRegisterLoading, setOpenRegisterLoading] = useState(false);

  // Close register state
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [closeStep, setCloseStep] = useState<'summary' | 'count' | 'done'>('summary');
  const [registerReport, setRegisterReport] = useState<Awaited<ReturnType<typeof posApi.getRegisterReport>> | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState('');

  useEffect(() => {
    const u = getPosUser();
    if (!u) { router.replace('/pos/login'); return; }
    setUser(u);
  }, [router]);

  const loadAll = useCallback(async () => {
    try {
      const [summaryData, salesData, sessionsData, currentReg] = await Promise.all([
        posApi.getSummary(),
        posApi.getSales({ limit: 8 }),
        posApi.getRegisterSessions(10),
        posApi.getCurrentRegister(),
      ]);
      setSummary(summaryData);
      setRecentSales(salesData.sales);
      setSessions(sessionsData);
      if (currentReg) {
        const live = sessionsData.find(s => s._id === currentReg._id) ?? currentReg as RegisterSession;
        setCurrentSession(live);
      } else {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAll();
  }

  async function handleOpenRegister() {
    setOpenRegisterError('');
    setOpenRegisterLoading(true);
    try {
      const reg = await posApi.openRegister(parseFloat(openingBalance) || 0);
      setCurrentSession(reg as RegisterSession);
      setSessions(prev => [reg as RegisterSession, ...prev]);
      setShowOpenRegister(false);
      setOpeningBalance('');
    } catch (err: any) {
      setOpenRegisterError(err.message);
    } finally {
      setOpenRegisterLoading(false);
    }
  }

  async function handleInitiateClose() {
    if (!currentSession) return;
    setCloseError('');
    setCloseStep('summary');
    setCountedCash('');
    try {
      const report = await posApi.getRegisterReport(currentSession._id);
      setRegisterReport(report);
      setShowCloseRegister(true);
    } catch (err: any) {
      setCloseError(err.message);
    }
  }

  async function handleCloseRegister() {
    if (!currentSession || !registerReport) return;
    setCloseError('');
    setCloseLoading(true);
    try {
      await posApi.closeRegister({
        registerId: currentSession._id,
        closingBalance: parseFloat(countedCash) || registerReport.expectedCash,
      });
      setCurrentSession(null);
      setCloseStep('done');
      await loadAll();
    } catch (err: any) {
      setCloseError(err.message);
    } finally {
      setCloseLoading(false);
    }
  }

  const avgOrder = summary && summary.totalCount > 0
    ? summary.totalRevenue / summary.totalCount
    : 0;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C9A84C] flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-base leading-none">Kentaz POS</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-[#C9A84C] flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{user.name}</span>
          </div>
          <button
            onClick={() => { clearPosSession(); router.push('/pos/login'); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Quick action bar */}
        <div className="flex flex-wrap gap-3">
          {currentSession ? (
            <Link
              href="/pos/sell"
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Play className="w-4 h-4" /> Continue Selling
            </Link>
          ) : (
            <button
              onClick={() => setShowOpenRegister(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] hover:bg-[#b8963e] text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Play className="w-4 h-4" /> Open Register & Sell
            </button>
          )}
          <Link href="/pos/sales" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-semibold transition shadow-sm">
            <Receipt className="w-4 h-4" /> Orders
          </Link>
          {currentSession && (
            <>
              <button
                onClick={handleInitiateClose}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <Lock className="w-4 h-4" /> Close Register
              </button>
            </>
          )}
          {user.role === 'admin' && (
            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-semibold transition shadow-sm">
              <BarChart3 className="w-4 h-4" /> Admin Panel
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Revenue Today"
            value={summary ? formatPrice(summary.totalRevenue) : '—'}
            sub="Net after refunds"
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            color="bg-[#C9A84C]"
            loading={loading}
          />
          <StatCard
            label="Orders Today"
            value={summary ? String(summary.totalCount) : '—'}
            sub={summary?.totalRefunds ? `${summary.totalRefunds} refund${summary.totalRefunds !== 1 ? 's' : ''}` : 'No refunds'}
            icon={<ShoppingCart className="w-5 h-5 text-white" />}
            color="bg-blue-500"
            loading={loading}
          />
          <StatCard
            label="Avg. Order Value"
            value={summary ? formatPrice(avgOrder) : '—'}
            sub="Today"
            icon={<BarChart3 className="w-5 h-5 text-white" />}
            color="bg-purple-500"
            loading={loading}
          />
          <StatCard
            label="Items Sold"
            value={summary ? String(summary.totalItems) : '—'}
            sub="Today"
            icon={<Package className="w-5 h-5 text-white" />}
            color="bg-green-500"
            loading={loading}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent transactions */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Recent Transactions</h2>
              <Link href="/pos/sales" className="text-xs text-[#C9A84C] font-semibold flex items-center gap-1 hover:underline">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            ) : recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Receipt className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-sm">No transactions yet today</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentSales.map(sale => {
                  const isRefund = sale.type === 'refund';
                  const isVoided = sale.status === 'voided';
                  return (
                    <Link
                      key={sale._id}
                      href="/pos/sales"
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isRefund ? 'bg-orange-100' : isVoided ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        {isRefund
                          ? <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
                          : isVoided
                            ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                            : <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold font-mono truncate ${isRefund ? 'text-orange-700' : 'text-gray-900'}`}>
                          {sale.receiptNumber}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {sale.customerName || 'Walk-in'} · {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-black ${
                          isRefund ? 'text-red-500' : isVoided ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}>
                          {sale.total < 0 ? '-' : ''}{formatPrice(Math.abs(sale.total))}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(sale.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Current session */}
            <SessionCard
              session={currentSession}
              isCurrentSession
              onContinue={() => router.push('/pos/sell')}
              onClose={handleInitiateClose}
              onOpen={() => setShowOpenRegister(true)}
            />

            {/* Payment breakdown */}
            {summary && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-900 text-sm">Payment Breakdown</h3>
                {[
                  { label: 'Cash', value: summary.byMethod.cash, icon: <Banknote className="w-3.5 h-3.5" />, color: 'text-green-600 bg-green-100' },
                  { label: 'Card', value: summary.byMethod.card, icon: <CreditCard className="w-3.5 h-3.5" />, color: 'text-blue-600 bg-blue-100' },
                  { label: 'Transfer', value: summary.byMethod.transfer, icon: <ArrowLeftRight className="w-3.5 h-3.5" />, color: 'text-purple-600 bg-purple-100' },
                ].map(({ label, value, icon, color }) => {
                  const total = Math.abs(summary.byMethod.cash) + Math.abs(summary.byMethod.card) + Math.abs(summary.byMethod.transfer);
                  const pct = total > 0 ? (Math.abs(value) / total) * 100 : 0;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>{icon}</span>
                          <span className="text-sm text-gray-600">{label}</span>
                        </div>
                        <span className={`text-sm font-bold ${value < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                          {value < 0 ? '-' : ''}{formatPrice(Math.abs(value))}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-[#C9A84C] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sessions history */}
        {sessions.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Session History</h2>
              <p className="text-xs text-gray-400 mt-0.5">Past {sessions.length} sessions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Cashier', 'Opened', 'Closed', 'Orders', 'Revenue', 'Opening', 'Difference', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map(session => {
                    const isOpen = session.status === 'open';
                    const revenue = isOpen ? (session.liveTotalRevenue ?? 0) : session.totalRevenue;
                    const salesCount = isOpen ? (session.liveTotalSales ?? 0) : session.totalSales;
                    const isCurrent = currentSession?._id === session._id;
                    return (
                      <tr
                        key={session._id}
                        onClick={() => router.push(`/pos/sessions/${session._id}`)}
                        className={`cursor-pointer hover:bg-amber-50/60 transition-colors ${isCurrent ? 'bg-green-50/50' : ''}`}
                      >
                        <td className="px-5 py-3 font-medium text-gray-900">{session.cashierName}</td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(session.openedAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                          {session.closedAt
                            ? new Date(session.closedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-900">{salesCount}</td>
                        <td className="px-5 py-3 font-bold text-[#C9A84C]">{formatPrice(revenue)}</td>
                        <td className="px-5 py-3 text-gray-500">{formatPrice(session.openingBalance)}</td>
                        <td className="px-5 py-3">
                          {isOpen ? <span className="text-gray-400 text-xs">—</span> : (
                            <span className={`text-xs font-semibold ${
                              (session.difference ?? 0) === 0 ? 'text-green-600' :
                              (session.difference ?? 0) > 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {(session.difference ?? 0) >= 0 ? '+' : ''}{formatPrice(session.difference ?? 0)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {isOpen ? 'Open' : 'Closed'}
                            {isCurrent && ' (You)'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Open Register Modal ── */}
      {showOpenRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowOpenRegister(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#C9A84C]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Open Register</h3>
                  <p className="text-xs text-gray-400">Start your POS session</p>
                </div>
              </div>
              <button onClick={() => setShowOpenRegister(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {openRegisterError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {openRegisterError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Opening Cash Balance (₦)</label>
                <input
                  type="number" min="0"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xl font-bold focus:outline-none focus:border-[#C9A84C]"
                />
                <p className="text-xs text-gray-400 mt-1">Enter the cash amount currently in the drawer.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowOpenRegister(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleOpenRegister}
                  disabled={openRegisterLoading}
                  className="flex-1 py-2.5 bg-[#C9A84C] hover:bg-[#b8963e] disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  {openRegisterLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Open & Start Selling
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Close Register Modal ── */}
      {showCloseRegister && registerReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Close Register</h3>
                <p className="text-xs text-gray-400">
                  {closeStep === 'summary' ? 'Session Summary' : closeStep === 'count' ? 'Count Cash' : 'Closed'}
                </p>
              </div>
              {closeStep !== 'done' && (
                <button onClick={() => setShowCloseRegister(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {closeStep === 'summary' && (
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Orders', value: registerReport.totalSales, money: false },
                    { label: 'Net Revenue', value: registerReport.totalRevenue, money: true },
                    { label: 'Cash Sales', value: registerReport.totalCash, money: true },
                    { label: 'Card Sales', value: registerReport.totalCard, money: true },
                    { label: 'Transfer', value: registerReport.totalTransfer, money: true },
                    { label: 'Expected Cash', value: registerReport.expectedCash, money: true },
                  ].map(({ label, value, money }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="font-bold text-gray-900 mt-0.5">{money ? formatPrice(value as number) : value}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setCountedCash(String(registerReport.expectedCash)); setCloseStep('count'); }}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm"
                >
                  Next: Count Cash
                </button>
              </div>
            )}

            {closeStep === 'count' && (
              <div className="p-5 space-y-4">
                {closeError && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{closeError}</p>}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800">Expected in drawer</p>
                  <p className="text-2xl font-black text-amber-700 mt-1">{formatPrice(registerReport.expectedCash)}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Counted Cash (₦)</label>
                  <input
                    type="number" min="0"
                    value={countedCash}
                    onChange={e => setCountedCash(e.target.value)}
                    autoFocus
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xl font-bold focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
                {countedCash !== '' && (
                  <div className={`rounded-xl p-3 text-sm font-semibold ${
                    parseFloat(countedCash) === registerReport.expectedCash ? 'bg-green-50 text-green-700' :
                    parseFloat(countedCash) > registerReport.expectedCash ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {parseFloat(countedCash) === registerReport.expectedCash ? 'Balanced' :
                     parseFloat(countedCash) > registerReport.expectedCash
                       ? `Over by ${formatPrice(parseFloat(countedCash) - registerReport.expectedCash)}`
                       : `Short by ${formatPrice(registerReport.expectedCash - parseFloat(countedCash))}`}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setCloseStep('summary')} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Back</button>
                  <button
                    onClick={handleCloseRegister}
                    disabled={closeLoading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {closeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Close Register
                  </button>
                </div>
              </div>
            )}

            {closeStep === 'done' && (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Register Closed</h4>
                  <p className="text-sm text-gray-500 mt-1">Session has ended. Have a great day!</p>
                </div>
                <button
                  onClick={() => setShowCloseRegister(false)}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
