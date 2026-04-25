'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Calendar, Heart, Settings, MapPin, Mail, Phone, LogOut,
  ChevronRight, Clock, CheckCircle2, Truck, X, ShoppingBag, CreditCard,
  Star, Edit, Plus, Wallet, TrendingUp, Loader2, CheckCircle, AlertCircle,
  Mic, Stethoscope, ArrowRight, User, Shield, Box,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { clearUser, setUser } from '@/store/userSlice';
import { removeAuthToken } from '@/lib/api/client';
import { formatPrice } from '@/lib/utils';

type TabType = 'overview' | 'orders' | 'bookings' | 'wishlist' | 'reviews' | 'settings';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

// ── Status helpers ──────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Pending'    },
  processing: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Processing' },
  shipped:    { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Shipped'    },
  delivered:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Delivered'  },
  cancelled:  { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Cancelled'  },
};

const BOOKING_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
  completed: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
};

function StatusPill({ status, map }: { status: string; map: Record<string, any> }) {
  const cfg = map[status?.toLowerCase()] ?? map['pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label ?? status}
    </span>
  );
}

// ── Order Detail Drawer ────────────────────────────────────────────────────

const ORDER_STEPS = ['pending', 'processing', 'shipped', 'delivered'] as const;

function OrderDrawer({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kentaz_token');
    fetch(`${API}/api/store/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setOrder(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const addr = order?.shippingAddress;
  const addrLine = addr ? [addr.address || addr.street, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ') : null;
  const subtotal = order?.items?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) ?? 0;
  const stepIdx = ORDER_STEPS.indexOf(order?.status);
  const cancelled = order?.status === 'cancelled';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Order Details</p>
            {order && <h2 className="text-lg font-bold text-gray-900 mt-0.5">#{order._id?.slice(-10).toUpperCase()}</h2>}
          </div>
          <div className="flex items-center gap-3">
            {order && <StatusPill status={order.status} map={ORDER_STATUS} />}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : !order || order.error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <AlertCircle className="h-10 w-10" />
            <p className="text-sm">Could not load order details</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Status timeline */}
            {!cancelled ? (
              <div className="px-6 py-5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center">
                  {ORDER_STEPS.map((step, i) => {
                    const done    = stepIdx > i;
                    const current = stepIdx === i;
                    const icons   = [Clock, Package, Truck, CheckCircle2];
                    const Icon    = icons[i];
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            done    ? 'bg-emerald-500 text-white' :
                            current ? 'bg-amber-500 text-white'  :
                                      'bg-gray-200 text-gray-400'
                          }`}>
                            {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                          </div>
                          <p className={`text-[10px] font-medium capitalize whitespace-nowrap ${
                            current ? 'text-amber-600' : done ? 'text-emerald-600' : 'text-gray-400'
                          }`}>
                            {ORDER_STATUS[step]?.label ?? step}
                          </p>
                        </div>
                        {i < ORDER_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1.5 mb-4 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="px-6 py-4 bg-red-50 border-b border-red-100">
                <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                  <X className="h-4 w-4" /> This order was cancelled
                </p>
              </div>
            )}

            <div className="px-6 space-y-6 py-6">

              {/* Items */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Box className="h-3.5 w-3.5" /> Items ({order.items?.length})
                </h3>
                <div className="space-y-3">
                  {order.items?.map((item: any, i: number) => {
                    const name   = item.product?.name || item.name || 'Product';
                    const img    = item.product?.images?.[0]?.url;
                    const variant = [item.variant?.size, item.variant?.color].filter(Boolean).join(' / ');
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                          {img
                            ? <Image src={img} alt={name} width={56} height={56} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5 text-gray-400" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
                          {variant && <p className="text-xs text-gray-400 mt-0.5">{variant}</p>}
                          <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                          <p className="text-xs text-gray-400">{formatPrice(item.price)} each</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span><span className="text-lg">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Shipping address */}
              {addr && addrLine && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Shipping Address
                  </h3>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    {(addr.firstName || addr.lastName) && (
                      <p className="font-semibold text-sm text-gray-900">{[addr.firstName, addr.lastName].filter(Boolean).join(' ')}</p>
                    )}
                    {addr.phone && <p className="text-xs text-gray-500 mt-0.5">{addr.phone}</p>}
                    <p className="text-sm text-gray-600 mt-1">{addrLine}</p>
                    {addr.deliveryMethod && (
                      <span className="inline-block mt-2 text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-500 capitalize">
                        {addr.deliveryMethod === 'express' ? '⚡ Express Delivery' : '📦 Standard Delivery'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Payment */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Payment
                </h3>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-semibold capitalize ${order.paystackStatus === 'success' ? 'text-emerald-600' : 'text-gray-600'}`}>
                      {order.paystackStatus || 'Pending'}
                    </span>
                  </div>
                  {order.paystackRef && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Reference</span>
                      <span className="font-mono text-xs text-gray-600 truncate max-w-[180px]">{order.paystackRef}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="text-xs text-gray-400 pb-4">
                <p>Placed: {new Date(order.createdAt).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

function AccountPageContent() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((s) => s.user);

  const searchParams   = useSearchParams();
  const [activeTab,     setActiveTab]     = useState<TabType>('overview');
  const [orders,        setOrders]        = useState<any[]>([]);
  const [bookings,      setBookings]      = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Reviews
  const [productsToReview, setProductsToReview] = useState<any[]>([]);
  const [selectedProductReview, setSelectedProductReview] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitMsg, setReviewSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Settings
  const [profileName,  setProfileName]  = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  // Change password modal
  const [showPwModal,  setShowPwModal]  = useState(false);
  const [pwCurrent,    setPwCurrent]    = useState('');
  const [pwNew,        setPwNew]        = useState('');
  const [pwConfirm,    setPwConfirm]    = useState('');
  const [pwSaving,     setPwSaving]     = useState(false);
  const [pwMsg,        setPwMsg]        = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login?callbackUrl=/account');
  }, [isAuthenticated, router]);

  // Handle deep links: /account?tab=orders&order=ID
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType | null;
    const orderId = searchParams.get('order');
    if (tab && ['overview', 'orders', 'bookings', 'wishlist', 'reviews', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
    if (orderId) {
      setSelectedOrderId(orderId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setProfileName(user.name || '');
      setProfilePhone((user as any).phone || '');
      fetchData();
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    const token = localStorage.getItem('kentaz_token');
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [oRes, wRes, bRes] = await Promise.all([
        fetch(`${API}/api/store/orders`,   { headers: h }),
        fetch(`${API}/api/store/wishlist`, { headers: h }),
        fetch(`${API}/api/store/bookings`, { headers: h }),
      ]);
      const [oData, wData, bData] = await Promise.all([oRes.json(), wRes.json(), bRes.json()]);
      setOrders(Array.isArray(oData) ? oData : []);
      setWishlistItems(Array.isArray(wData) ? wData : []);
      setBookings(Array.isArray(bData) ? bData : []);
      
      // Extract products from delivered orders that can be reviewed
      const deliveredOrders = (Array.isArray(oData) ? oData : []).filter(
        (o: any) => o.status === 'delivered'
      );
      const products: any[] = [];
      const seenProducts = new Set<string>();
      deliveredOrders.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          const productId = item.product?._id || item.productId;
          if (productId && !seenProducts.has(productId)) {
            seenProducts.add(productId);
            products.push({
              ...item.product,
              orderId: order._id,
              orderDate: order.createdAt,
            });
          }
        });
      });
      setProductsToReview(products);
    } catch {}
    setLoading(false);
  };

  const handleLogout = () => {
    removeAuthToken();
    dispatch(clearUser());
    router.push('/');
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('kentaz_token');
    setSaving(true); setSaveMsg(null);
    try {
      const res  = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      const data = await res.json();
      if (res.ok) { dispatch(setUser(data)); setSaveMsg({ ok: true,  text: 'Profile updated!' }); }
      else          setSaveMsg({ ok: false, text: data.error || 'Failed to save' });
    } catch {
      setSaveMsg({ ok: false, text: 'Network error. Try again.' });
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwMsg({ ok: false, text: 'All fields are required.' }); return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' }); return;
    }
    if (pwNew.length < 6) {
      setPwMsg({ ok: false, text: 'New password must be at least 6 characters.' }); return;
    }
    const token = localStorage.getItem('kentaz_token');
    setPwSaving(true); setPwMsg(null);
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ ok: true, text: 'Password changed successfully!' });
        setPwCurrent(''); setPwNew(''); setPwConfirm('');
        setTimeout(() => { setShowPwModal(false); setPwMsg(null); }, 2000);
      } else {
        setPwMsg({ ok: false, text: data.error || 'Failed to change password.' });
      }
    } catch {
      setPwMsg({ ok: false, text: 'Network error. Try again.' });
    }
    setPwSaving(false);
  };

  const handleSubmitReview = async () => {
    if (!selectedProductReview) return;
    const token = localStorage.getItem('kentaz_token');
    setSubmittingReview(true);
    setReviewSubmitMsg(null);
    try {
      const res = await fetch(`${API}/api/store/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product: selectedProductReview._id || selectedProductReview.productId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewSubmitMsg({ ok: true, text: 'Review submitted! Thank you.' });
        setProductsToReview(productsToReview.filter(p => 
          (p._id || p.productId) !== (selectedProductReview._id || selectedProductReview.productId)
        ));
        setSelectedProductReview(null);
        setReviewRating(5);
        setReviewComment('');
      } else {
        setReviewSubmitMsg({ ok: false, text: data.error || 'Failed to submit review' });
      }
    } catch {
      setReviewSubmitMsg({ ok: false, text: 'Network error. Try again.' });
    }
    setSubmittingReview(false);
    setTimeout(() => setReviewSubmitMsg(null), 4000);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-[#C9A84C] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const totalSpent = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const firstName  = user.name?.split(' ')[0] || 'there';

  const tabs: { id: TabType; label: string; icon: any; count?: number }[] = [
    { id: 'overview',  label: 'Overview',  icon: TrendingUp  },
    { id: 'orders',    label: 'Orders',    icon: ShoppingBag, count: orders.length   },
    { id: 'bookings',  label: 'Bookings',  icon: Calendar,    count: bookings.length },
    { id: 'wishlist',  label: 'Wishlist',  icon: Heart,       count: wishlistItems.length },
    { id: 'reviews',   label: 'Reviews',    icon: Star,        count: productsToReview.length },
    { id: 'settings',  label: 'Settings',   icon: Settings    },
  ];

  return (
    <>
      <AnimatePresence>
        {selectedOrderId && (
          <OrderDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
        )}
      </AnimatePresence>

      {/* ── Change Password Modal ── */}
      <AnimatePresence>
        {showPwModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowPwModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <h2 className="font-bold text-gray-900">Change Password</h2>
                  </div>
                  <button onClick={() => setShowPwModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Current Password</label>
                    <input
                      type="password"
                      value={pwCurrent}
                      onChange={e => setPwCurrent(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={pwNew}
                      onChange={e => setPwNew(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={pwConfirm}
                      onChange={e => setPwConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <AnimatePresence>
                    {pwMsg && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${pwMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                      >
                        {pwMsg.ok ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                        {pwMsg.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowPwModal(false)}
                      className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button onClick={handleChangePassword} disabled={pwSaving}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-semibold rounded-xl text-sm transition-colors"
                    >
                      {pwSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#F8F8F6]">

        {/* ── Hero ───────────────────────────────────────── */}
        <div className="relative bg-slate-950 overflow-hidden">
          {/* decorative blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC4yIiBvcGFjaXR5PSIwLjA0Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-60" />
          </div>

          <div className="relative container mx-auto px-4 py-12 pb-20">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl font-bold text-slate-900 shadow-xl shadow-amber-500/20 ring-4 ring-white/10">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-emerald-400 rounded-full border-2 border-slate-950" />
                </div>

                <div>
                  <p className="text-slate-400 text-sm mb-0.5">Welcome back,</p>
                  <h1 className="text-2xl font-bold text-white">{firstName}!</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-slate-400 text-xs">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
                    {(user as any).phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{(user as any).phone}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">
                  {user.role === 'admin' ? '🛡 Admin' : '⭐ VIP Member'}
                </span>
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white text-xs font-medium transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8"
            >
              {[
                { label: 'Orders',    value: orders.length,                                       icon: ShoppingBag, accent: 'amber'   },
                { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: CheckCircle2, accent: 'emerald' },
                { label: 'Bookings',  value: bookings.length,                                     icon: Calendar,    accent: 'blue'    },
                { label: 'Spent',     value: formatPrice(totalSpent),                             icon: Wallet,      accent: 'purple'  },
              ].map((s) => (
                <div key={s.label} className="bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
                  <p className="text-white/40 text-xs mb-0.5">{s.label}</p>
                  <p className="text-white font-bold text-lg leading-tight">{s.value}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* bottom curve */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#F8F8F6] rounded-t-[2rem]" />
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="container mx-auto px-4 -mt-2 pb-16">

          {/* Tab bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex gap-1.5 overflow-x-auto pb-1 mb-6 scrollbar-hide"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                      : 'bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="font-bold text-gray-900">Recent Orders</h2>
                      <button onClick={() => setActiveTab('orders')} className="text-xs text-amber-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                        View all <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {loading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-16 mx-4 my-2 bg-gray-100 rounded-xl animate-pulse" />)
                      ) : orders.length > 0 ? orders.slice(0, 4).map((order) => {
                        const s = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
                        return (
                          <button key={order._id} onClick={() => setSelectedOrderId(order._id)}
                            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left group"
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                              <ShoppingBag className={`h-4 w-4 ${s.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">#{order._id?.slice(-8).toUpperCase()}</p>
                              <p className="text-xs text-gray-400">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {formatPrice(order.total)}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-medium capitalize ${s.text}`}>{s.label}</span>
                              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </button>
                        );
                      }) : (
                        <div className="px-6 py-10 text-center">
                          <ShoppingBag className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No orders yet</p>
                          <Link href="/products"><button className="mt-3 text-xs text-amber-600 font-semibold hover:underline">Start shopping →</button></Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Bookings */}
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="font-bold text-gray-900">Recent Bookings</h2>
                      <button onClick={() => setActiveTab('bookings')} className="text-xs text-amber-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                        View all <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {loading ? (
                        [...Array(2)].map((_, i) => <div key={i} className="h-16 mx-4 my-2 bg-gray-100 rounded-xl animate-pulse" />)
                      ) : bookings.length > 0 ? bookings.slice(0, 4).map((b) => {
                        const s   = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.pending;
                        const Icon = b.serviceType === 'podcast' ? Mic : Stethoscope;
                        return (
                          <div key={b._id} className="px-6 py-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 capitalize">{b.serviceType}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(b.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {b.timeSlot && ` · ${b.timeSlot}`}
                              </p>
                            </div>
                            <span className={`text-xs font-medium capitalize flex-shrink-0 ${s.text}`}>{b.status}</span>
                          </div>
                        );
                      }) : (
                        <div className="px-6 py-10 text-center">
                          <Calendar className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No bookings yet</p>
                          <Link href="/services"><button className="mt-3 text-xs text-amber-600 font-semibold hover:underline">Browse services →</button></Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wishlist preview */}
                  {wishlistItems.length > 0 && (
                    <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900">Wishlist</h2>
                        <button onClick={() => setActiveTab('wishlist')} className="text-xs text-amber-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                          View all <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-4 p-6 overflow-x-auto scrollbar-hide">
                        {wishlistItems.slice(0, 6).map((item: any) => {
                          const price = item.price ?? item.variants?.[0]?.price ?? 0;
                          return (
                            <Link key={item._id} href={`/products/${item.slug || item._id}`}>
                              <div className="flex-shrink-0 w-36 group">
                                <div className="w-36 h-36 rounded-2xl overflow-hidden bg-gray-100 mb-2 relative">
                                  {item.images?.[0]?.url
                                    ? <Image src={item.images[0].url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                    : <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag className="h-6 w-6" /></div>}
                                </div>
                                <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                                <p className="text-xs text-amber-600 font-bold">{formatPrice(price)}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ORDERS ── */}
              {activeTab === 'orders' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">My Orders <span className="text-gray-400 font-normal text-base">({orders.length})</span></h2>
                    <Link href="/products">
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
                        <Plus className="h-4 w-4" /> Shop Now
                      </button>
                    </Link>
                  </div>

                  {loading ? (
                    <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />)}</div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-3">
                      {orders.map((order) => {
                        const s    = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
                        const addr = order.shippingAddress;
                        const date = new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
                        return (
                          <motion.button key={order._id} onClick={() => setSelectedOrderId(order._id)}
                            whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}
                            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group overflow-hidden"
                          >
                            {/* top accent strip */}
                            <div className={`h-1 w-full ${s.dot.replace('bg-', 'bg-')}`} />
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <p className="text-base font-bold text-gray-900">#{order._id?.slice(-10).toUpperCase()}</p>
                                    <StatusPill status={order.status} map={ORDER_STATUS} />
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                                    <span className="flex items-center gap-1"><Package className="h-3 w-3" />{order.items?.length || 0} items</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{date}</span>
                                    {addr && (addr.address || addr.street) && (
                                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                                        <MapPin className="h-3 w-3 flex-shrink-0" />
                                        {[addr.address || addr.street, addr.city].filter(Boolean).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  {/* item thumbnails */}
                                  <div className="flex gap-1.5">
                                    {order.items?.slice(0, 5).map((item: any, i: number) => (
                                      <div key={i} className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 relative">
                                        {item.product?.images?.[0]?.url
                                          ? <Image src={item.product.images[0].url} alt="" fill className="object-cover" />
                                          : <div className="w-full h-full flex items-center justify-center"><Box className="h-3 w-3 text-gray-300" /></div>}
                                      </div>
                                    ))}
                                    {(order.items?.length || 0) > 5 && (
                                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                                        +{order.items.length - 5}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                  <p className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</p>
                                  <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold group-hover:gap-1.5 transition-all">
                                    View details <ArrowRight className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center">
                      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="h-8 w-8 text-amber-400" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">No orders yet</h3>
                      <p className="text-sm text-gray-500 mb-5">You haven't placed any orders. Start shopping to see them here.</p>
                      <Link href="/products"><button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-xl text-sm transition-colors">Browse Products</button></Link>
                    </div>
                  )}
                </div>
              )}

              {/* ── BOOKINGS ── */}
              {activeTab === 'bookings' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">My Bookings <span className="text-gray-400 font-normal text-base">({bookings.length})</span></h2>
                    <Link href="/services">
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
                        <Plus className="h-4 w-4" /> New Booking
                      </button>
                    </Link>
                  </div>

                  {loading ? (
                    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />)}</div>
                  ) : bookings.length > 0 ? (
                    <div className="space-y-3">
                      {bookings.map((b) => {
                        const s    = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.pending;
                        const Icon = b.serviceType === 'podcast' ? Mic : Stethoscope;
                        return (
                          <div key={b._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-gray-900 capitalize">{b.serviceType} Session</p>
                                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(b.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                      </span>
                                      {b.timeSlot && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.timeSlot}</span>}
                                      {b.duration && <span>{b.duration} mins</span>}
                                    </div>
                                    {b.therapistId?.name && (
                                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                        <User className="h-3 w-3" /> with {b.therapistId.name}
                                      </p>
                                    )}
                                    {b.notes && <p className="text-xs text-gray-400 mt-1 italic">"{b.notes}"</p>}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <StatusPill status={b.status} map={BOOKING_STATUS} />
                                    {b.amount > 0 && <p className="text-sm font-bold text-gray-900 mt-1.5">{formatPrice(b.amount)}</p>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-blue-300" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">No bookings yet</h3>
                      <p className="text-sm text-gray-500 mb-5">Book a therapy session or podcast studio rental.</p>
                      <Link href="/services"><button className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors">View Services</button></Link>
                    </div>
                  )}
                </div>
              )}

              {/* ── WISHLIST ── */}
              {activeTab === 'wishlist' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">Wishlist <span className="text-gray-400 font-normal text-base">({wishlistItems.length})</span></h2>
                  </div>

                  {wishlistItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {wishlistItems.map((item: any) => {
                        const price = item.price ?? item.variants?.[0]?.price ?? 0;
                        return (
                          <motion.div key={item._id} whileHover={{ y: -4 }} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="relative aspect-square bg-gray-100">
                              {item.images?.[0]?.url
                                ? <Image src={item.images[0].url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-400" />
                                : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                              <button className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow hover:bg-red-50 transition-colors">
                                <Heart className="h-4 w-4 text-red-400 fill-red-400" />
                              </button>
                            </div>
                            <div className="p-3">
                              <p className="text-xs font-semibold text-gray-800 line-clamp-1 mb-1">{item.name}</p>
                              <p className="text-sm font-bold text-amber-600 mb-2">{formatPrice(price)}</p>
                              <Link href={`/products/${item.slug || item._id}`}>
                                <button className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">
                                  View
                                </button>
                              </Link>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center">
                      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Heart className="h-8 w-8 text-rose-300" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">Wishlist is empty</h3>
                      <p className="text-sm text-gray-500 mb-5">Save items you love to find them easily later.</p>
                      <Link href="/products"><button className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors">Explore Products</button></Link>
                    </div>
                  )}
                </div>
              )}

              {/* ── REVIEWS ── */}
              {activeTab === 'reviews' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">My Reviews <span className="text-gray-400 font-normal text-base">({productsToReview.length})</span></h2>
                  </div>

                  {productsToReview.length === 0 && !selectedProductReview ? (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center">
                      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Star className="h-8 w-8 text-amber-300" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">No products to review</h3>
                      <p className="text-sm text-gray-500 mb-5">Products from delivered orders will appear here for review.</p>
                      <Link href="/products"><button className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors">Browse Products</button></Link>
                    </div>
                  ) : selectedProductReview ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 max-w-2xl">
                      <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setSelectedProductReview(null)} className="text-gray-400 hover:text-gray-600">
                          <ChevronRight className="h-5 w-5 rotate-180" />
                        </button>
                        <h3 className="font-bold text-gray-900">Write a Review</h3>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                          {selectedProductReview.images?.[0]?.url
                            ? <Image src={selectedProductReview.images[0].url} alt={selectedProductReview.name} width={64} height={64} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-gray-400" /></div>}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{selectedProductReview.name}</p>
                          <p className="text-xs text-gray-400">From order #{selectedProductReview.orderId?.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="p-1 transition-transform hover:scale-110"
                            >
                              <Star className={`h-8 w-8 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {reviewRating === 5 ? 'Excellent' : reviewRating === 4 ? 'Very Good' : reviewRating === 3 ? 'Good' : reviewRating === 2 ? 'Fair' : 'Poor'}
                        </p>
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Your Review (optional)</label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your experience with this product..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors min-h-[120px] resize-none"
                        />
                      </div>

                      {reviewSubmitMsg && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4 ${reviewSubmitMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                        >
                          {reviewSubmitMsg.ok ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                          {reviewSubmitMsg.text}
                        </motion.div>
                      )}

                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-semibold rounded-xl text-sm transition-colors"
                      >
                        {submittingReview ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <><CheckCircle className="h-4 w-4" /> Submit Review</>}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productsToReview.map((product: any) => (
                        <motion.div key={product._id || product.productId} whileHover={{ y: -4 }} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                          <div className="relative aspect-square bg-gray-100">
                            {product.images?.[0]?.url
                              ? <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                          </div>
                          <div className="p-4">
                            <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">{product.name}</p>
                            <p className="text-xs text-gray-400 mb-3">From order #{product.orderId?.slice(-8).toUpperCase()}</p>
                            <button
                              onClick={() => {
                                setSelectedProductReview(product);
                                setReviewRating(5);
                                setReviewComment('');
                              }}
                              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                            >
                              <Star className="h-4 w-4" /> Write Review
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── SETTINGS ── */}
              {activeTab === 'settings' && (
                <div className="max-w-2xl space-y-5">
                  {/* Profile */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                      <User className="h-5 w-5 text-amber-500" />
                      <h2 className="font-bold text-gray-900">Profile</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
                          <input value={profileName} onChange={e => setProfileName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
                          <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)}
                            placeholder="08012345678" type="tel"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                        <input value={user.email} disabled
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                      </div>

                      <AnimatePresence>
                        {saveMsg && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${saveMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                          >
                            {saveMsg.ok ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                            {saveMsg.text}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button onClick={handleSaveProfile} disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-semibold rounded-xl text-sm transition-colors"
                      >
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><CheckCircle className="h-4 w-4" /> Save Changes</>}
                      </button>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-amber-500" />
                        <h2 className="font-bold text-gray-900">Saved Addresses</h2>
                      </div>
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                    <div className="p-6">
                      {(user as any).addresses?.length > 0 ? (
                        <div className="space-y-3">
                          {(user as any).addresses.map((a: any, i: number) => (
                            <div key={i} className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-2xl">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                  <MapPin className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{a.street}</p>
                                  <p className="text-xs text-gray-500">{[a.city, a.state, a.postalCode].filter(Boolean).join(', ')}</p>
                                  <p className="text-xs text-gray-400">{a.country || 'Nigeria'}</p>
                                  {a.isDefault && <span className="text-xs text-amber-600 font-semibold">Default</span>}
                                </div>
                              </div>
                              <button className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors flex-shrink-0">
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <MapPin className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No saved addresses</p>
                          <p className="text-xs text-gray-400 mt-1">Shipping addresses from your orders will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Security */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-amber-500" />
                      <h2 className="font-bold text-gray-900">Security</h2>
                    </div>
                    <div className="p-6">
                      <button onClick={() => { setShowPwModal(true); setPwMsg(null); }} className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">Change Password</p>
                          <p className="text-xs text-gray-400">Update your account password</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <button onClick={handleLogout}
                        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-semibold transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign out of your account
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AccountPageContent />
    </Suspense>
  );
}
