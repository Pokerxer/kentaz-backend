'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Calendar, Heart, Settings, MapPin, Mail, Phone, LogOut,
  ChevronRight, Clock, Check, Truck, X, ShoppingBag, CreditCard, Star,
  Edit, Plus, Wallet, TrendingUp, Loader2, CheckCircle, AlertCircle,
  Mic, Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { clearUser, setUser } from '@/store/userSlice';
import { removeAuthToken } from '@/lib/api/client';
import { formatPrice } from '@/lib/utils';

type TabType = 'overview' | 'orders' | 'bookings' | 'wishlist' | 'settings';

const tabs = [
  { id: 'overview',  label: 'Overview',  icon: TrendingUp  },
  { id: 'orders',    label: 'Orders',    icon: ShoppingBag },
  { id: 'bookings',  label: 'Bookings',  icon: Calendar    },
  { id: 'wishlist',  label: 'Wishlist',  icon: Heart       },
  { id: 'settings',  label: 'Settings',  icon: Settings    },
];

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0  },
};

function getOrderStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'pending':    return { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400'   };
    case 'processing': return { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-400'    };
    case 'shipped':    return { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-400'  };
    case 'delivered':  return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' };
    case 'cancelled':  return { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-400'     };
    default:           return { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-200',    dot: 'bg-gray-400'    };
  }
}

function getBookingStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'confirmed':  return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'pending':    return { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   };
    case 'cancelled':  return { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200'     };
    case 'completed':  return { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'    };
    default:           return { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-200'    };
  }
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function AccountPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((s) => s.user);

  const [activeTab,     setActiveTab]     = useState<TabType>('overview');
  const [orders,        setOrders]        = useState<any[]>([]);
  const [bookings,      setBookings]      = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [isLoaded,      setIsLoaded]      = useState(false);

  // Settings form state
  const [profileName,   setProfileName]   = useState('');
  const [profilePhone,  setProfilePhone]  = useState('');
  const [saving,        setSaving]        = useState(false);
  const [saveMsg,       setSaveMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login?callbackUrl=/account');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setProfileName(user.name  || '');
      setProfilePhone((user as any).phone || '');
      fetchData();
    }
    setTimeout(() => setIsLoaded(true), 100);
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    const token = localStorage.getItem('kentaz_token');
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [ordersRes, wishlistRes, bookingsRes] = await Promise.all([
        fetch(`${API}/api/store/orders`,   { headers: h }),
        fetch(`${API}/api/store/wishlist`, { headers: h }),
        fetch(`${API}/api/store/bookings`, { headers: h }),
      ]);
      const [ordersData, wishlistData, bookingsData] = await Promise.all([
        ordersRes.json(), wishlistRes.json(), bookingsRes.json(),
      ]);
      setOrders(Array.isArray(ordersData)   ? ordersData   : []);
      setWishlistItems(Array.isArray(wishlistData) ? wishlistData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (err) {
      console.error('Error fetching account data:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    removeAuthToken();
    dispatch(clearUser());
    router.push('/');
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('kentaz_token');
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(setUser(data));
        setSaveMsg({ ok: true, text: 'Profile updated successfully' });
      } else {
        setSaveMsg({ ok: false, text: data.error || 'Failed to save changes' });
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Network error. Please try again.' });
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-[#C9A84C] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s: number, o: any) => s + (o.total || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.12, 0.08] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full blur-3xl"
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative container mx-auto px-4 py-14">
          <motion.div
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row items-center justify-between gap-8"
          >
            <div className="flex items-center gap-6">
              <motion.div whileHover={{ scale: 1.05 }} className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-4xl font-bold text-slate-900 shadow-2xl shadow-amber-500/30">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-2 -right-2 w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <Star className="h-4 w-4 text-slate-900 fill-slate-900" />
                </motion.div>
              </motion.div>

              <div className="text-white">
                <h1 className="text-3xl font-bold mb-1">{user.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-slate-400 text-sm">
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span>
                  {(user as any).phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{(user as any).phone}</span>}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 text-xs font-semibold rounded-full shadow-lg shadow-amber-500/25">
                    {user.role === 'admin' ? 'Administrator' : 'VIP Member'}
                  </span>
                  <span className="text-slate-500 text-xs">
                    Member since {new Date((user as any).createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <Button onClick={handleLogout} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H0Z" fill="#FAFAFA" />
          </svg>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="container mx-auto px-4 -mt-2">
        <motion.div
          variants={containerVariants} initial="hidden" animate={isLoaded ? 'visible' : 'hidden'}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Orders',   value: orders.length,                                        icon: ShoppingBag, color: 'from-amber-500 to-amber-600'   },
            { label: 'Delivered',      value: orders.filter(o => o.status === 'delivered').length,  icon: Check,       color: 'from-emerald-500 to-emerald-600' },
            { label: 'Bookings',       value: bookings.length,                                      icon: Calendar,    color: 'from-blue-500 to-blue-600'       },
            { label: 'Total Spent',    value: formatPrice(totalSpent),                              icon: Wallet,      color: 'from-violet-500 to-violet-600'   },
          ].map((stat) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <Card className="border-0 shadow-xl shadow-black/5 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-13 h-13 w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold truncate">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex overflow-x-auto gap-2 pb-4 border-b border-gray-200"
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 shadow-lg shadow-amber-500/25'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'orders'   && orders.length   > 0 && <span className="ml-1 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{orders.length}</span>}
              {tab.id === 'bookings' && bookings.length > 0 && <span className="ml-1 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{bookings.length}</span>}
            </motion.button>
          ))}
        </motion.div>

        {/* ── Tab content ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="py-8"
          >

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="border-0 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl">Recent Orders</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')} className="text-amber-600">
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                    ) : orders.length > 0 ? (
                      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                        {orders.slice(0, 3).map((order) => {
                          const c = getOrderStatusStyle(order.status);
                          return (
                            <motion.div key={order._id} variants={itemVariants} whileHover={{ x: 4 }}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <div>
                                <p className="font-semibold text-sm">Order #{order._id?.slice(-6).toUpperCase()}</p>
                                <p className="text-xs text-gray-500">{order.items?.length || 0} items · {formatPrice(order.total)}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${c.bg} ${c.text} ${c.border} border`}>{order.status}</span>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4 text-sm">No orders yet</p>
                        <Link href="/products"><Button className="bg-amber-500 hover:bg-amber-400 text-slate-900">Start Shopping</Button></Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl">Recent Bookings</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('bookings')} className="text-amber-600">
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                    ) : bookings.length > 0 ? (
                      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                        {bookings.slice(0, 3).map((b) => {
                          const c = getBookingStatusStyle(b.status);
                          const Icon = b.serviceType === 'podcast' ? Mic : Stethoscope;
                          return (
                            <motion.div key={b._id} variants={itemVariants} whileHover={{ x: 4 }}
                              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm capitalize">{b.serviceType} Session</p>
                                <p className="text-xs text-gray-500">{new Date(b.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${c.bg} ${c.text} ${c.border} border flex-shrink-0`}>{b.status}</span>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4 text-sm">No bookings yet</p>
                        <Link href="/services"><Button variant="outline">View Services</Button></Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ORDERS */}
            {activeTab === 'orders' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">My Orders</h2>
                  <Link href="/products">
                    <Button className="bg-amber-500 hover:bg-amber-400 text-slate-900">
                      <Plus className="h-4 w-4 mr-2" /> New Order
                    </Button>
                  </Link>
                </div>

                {orders.length > 0 ? (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
                    {orders.map((order) => {
                      const c = getOrderStatusStyle(order.status);
                      const addr = order.shippingAddress;
                      return (
                        <motion.div key={order._id} variants={itemVariants}>
                          <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                                    <span className="text-xl font-bold">#{order._id?.slice(-8).toUpperCase()}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1.5 ${c.bg} ${c.text} ${c.border} border`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                      {order.status}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                    <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />{order.items?.length || 0} items</span>
                                    <span className="flex items-center gap-1.5 font-semibold text-gray-900"><CreditCard className="h-3.5 w-3.5" />{formatPrice(order.total)}</span>
                                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />
                                      {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                  </div>

                                  {addr && (addr.address || addr.street) && (
                                    <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
                                      <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                      <span>{[(addr.address || addr.street), addr.city, addr.state].filter(Boolean).join(', ')}</span>
                                    </div>
                                  )}

                                  <div className="flex gap-2 overflow-x-auto pb-1">
                                    {order.items?.slice(0, 4).map((item: any, idx: number) => (
                                      <div key={idx} className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden relative border border-gray-200">
                                        {item.product?.images?.[0]?.url
                                          ? <Image src={item.product.images[0].url} alt={item.name} fill className="object-cover" />
                                          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>}
                                      </div>
                                    ))}
                                    {(order.items?.length || 0) > 4 && (
                                      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 border border-gray-200">
                                        +{order.items.length - 4}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                  {order.status === 'delivered' && (
                                    <Button variant="outline" size="sm">
                                      <Star className="h-3.5 w-3.5 mr-1.5" /> Review
                                    </Button>
                                  )}
                                  {order.status === 'shipped' && (
                                    <Button variant="outline" size="sm">
                                      <Truck className="h-3.5 w-3.5 mr-1.5" /> Track
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <Card className="border-2 border-dashed border-gray-200">
                    <CardContent className="p-16 text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <ShoppingBag className="h-12 w-12 text-amber-400" />
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-2">No Orders Yet</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">You haven't placed any orders yet. Start shopping to see your orders here.</p>
                      <Link href="/products"><Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-900">Browse Products</Button></Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* BOOKINGS */}
            {activeTab === 'bookings' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">My Bookings</h2>
                  <Link href="/services">
                    <Button className="bg-amber-500 hover:bg-amber-400 text-slate-900">
                      <Plus className="h-4 w-4 mr-2" /> New Booking
                    </Button>
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
                ) : bookings.length > 0 ? (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
                    {bookings.map((b) => {
                      const c = getBookingStatusStyle(b.status);
                      const Icon = b.serviceType === 'podcast' ? Mic : Stethoscope;
                      return (
                        <motion.div key={b._id} variants={itemVariants}>
                          <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                            <CardContent className="p-6">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Icon className="h-7 w-7 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-lg capitalize">{b.serviceType} Session</p>
                                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                                      <span className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {new Date(b.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                      </span>
                                      {b.timeSlot && (
                                        <span className="flex items-center gap-1.5">
                                          <Clock className="h-3.5 w-3.5" /> {b.timeSlot}
                                        </span>
                                      )}
                                      {b.duration && (
                                        <span>{b.duration} mins</span>
                                      )}
                                    </div>
                                    {b.therapistId?.name && (
                                      <p className="text-xs text-gray-400 mt-1">with {b.therapistId.name}</p>
                                    )}
                                    {b.notes && <p className="text-xs text-gray-400 mt-1 italic">"{b.notes}"</p>}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${c.bg} ${c.text} ${c.border} border`}>{b.status}</span>
                                  {b.amount && <p className="text-sm font-bold text-gray-900">{formatPrice(b.amount)}</p>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <Card className="border-2 border-dashed border-gray-200">
                    <CardContent className="p-16 text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <Calendar className="h-12 w-12 text-blue-300" />
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-2">No Bookings Yet</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">Book a therapy session or podcast studio rental to get started.</p>
                      <Link href="/services"><Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">View Services</Button></Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* WISHLIST */}
            {activeTab === 'wishlist' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">My Wishlist</h2>
                  <span className="text-sm text-gray-500">{wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''}</span>
                </div>

                {wishlistItems.length > 0 ? (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible"
                    className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  >
                    {wishlistItems.map((item: any) => {
                      const price = item.price ?? item.variants?.[0]?.price ?? 0;
                      return (
                        <motion.div key={item._id} variants={itemVariants}>
                          <Card className="border-0 shadow-lg hover:shadow-2xl transition-all group overflow-hidden">
                            <div className="relative aspect-square bg-gray-100">
                              {item.images?.[0]?.url
                                ? <Image src={item.images[0].url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                : <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>}
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-md hover:bg-red-50 transition-colors"
                              >
                                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                              </motion.button>
                            </div>
                            <CardContent className="p-4">
                              <p className="font-semibold mb-1 line-clamp-1">{item.name}</p>
                              <p className="text-amber-600 font-bold text-lg mb-3">{formatPrice(price)}</p>
                              <Link href={`/products/${item.slug || item._id}`}>
                                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">View Product</Button>
                              </Link>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <Card className="border-2 border-dashed border-gray-200">
                    <CardContent className="p-16 text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <Heart className="h-12 w-12 text-rose-300" />
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-2">Your Wishlist is Empty</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">Save your favorite items to your wishlist to easily find them later.</p>
                      <Link href="/products"><Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">Explore Products</Button></Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Profile */}
                <Card className="border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-amber-500" /> Profile Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="e.g. 08012345678"
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      />
                    </div>

                    {saveMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${saveMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                      >
                        {saveMsg.ok ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                        {saveMsg.text}
                      </motion.div>
                    )}

                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900"
                    >
                      {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Saved Addresses */}
                <Card className="border-0 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-amber-500" /> Saved Addresses
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Add New
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {(user as any).addresses?.length > 0 ? (
                      <div className="space-y-3">
                        {(user as any).addresses.map((address: any, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}
                            className="p-4 bg-gray-50 rounded-xl flex items-start justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">{address.street}</p>
                                <p className="text-xs text-gray-500">{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
                                <p className="text-xs text-gray-500">{address.country || 'Nigeria'}</p>
                                {address.isDefault && (
                                  <span className="text-xs text-amber-600 font-medium">Default</span>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-4">No saved addresses yet</p>
                        <p className="text-xs text-gray-400 mb-4">Your shipping addresses from orders will appear here once you check out.</p>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" /> Add Address
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
