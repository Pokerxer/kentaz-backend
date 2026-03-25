'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Calendar, Heart, Settings, MapPin, Mail, Phone, LogOut, ChevronRight, Clock, Check, Truck, X, ShoppingBag, CreditCard, Star, Trash2, Edit, Plus, Bell, Wallet, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { clearUser } from '@/store/userSlice';
import { removeAuthToken } from '@/lib/api/client';
import { formatPrice } from '@/lib/utils';

type TabType = 'overview' | 'orders' | 'bookings' | 'wishlist' | 'settings';

const tabs = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AccountPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?callbackUrl=/account');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
    }
    setTimeout(() => setIsLoaded(true), 100);
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    const token = localStorage.getItem('kentaz_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [ordersRes, wishlistRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/orders`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/store/wishlist`, { headers })
      ]);
      
      const [ordersData, wishlistData] = await Promise.all([ordersRes.json(), wishlistRes.json()]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setWishlistItems(Array.isArray(wishlistData) ? wishlistData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    removeAuthToken();
    dispatch(clearUser());
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
      case 'processing': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'shipped': return { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' };
      case 'delivered': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#C9A84C] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50"
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.08, 0.12, 0.08]
            }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full blur-3xl"
          />
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row items-center justify-between gap-8"
          >
            {/* User Info */}
            <div className="flex items-center gap-6">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-4xl font-bold text-slate-900 shadow-2xl shadow-amber-500/30">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <Star className="h-5 w-5 text-slate-900 fill-slate-900" />
                </motion.div>
              </motion.div>
              
              <div className="text-white">
                <motion.h1 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold mb-2"
                >
                  {user.name}
                </motion.h1>
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap items-center gap-3 text-slate-400"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {user.phone}
                    </span>
                  )}
                </motion.div>
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3 mt-3"
                >
                  <span className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 text-sm font-semibold rounded-full shadow-lg shadow-amber-500/25">
                    {user.role === 'admin' ? 'Administrator' : 'VIP Member'}
                  </span>
                  <span className="text-slate-500 text-sm">
                    Member since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Actions */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3"
            >
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#FAFAFA"/>
          </svg>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-4">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate={isLoaded ? "visible" : "hidden"}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'from-amber-500 to-amber-600' },
            { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: Check, color: 'from-emerald-500 to-emerald-600' },
            { label: 'Wishlist', value: wishlistItems.length, icon: Heart, color: 'from-rose-500 to-rose-600' },
            { label: 'Addresses', value: user.addresses?.length || 0, icon: MapPin, color: 'from-blue-500 to-blue-600' },
          ].map((stat, index) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <Card className="border-0 shadow-xl shadow-black/5 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-8">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex overflow-x-auto gap-2 pb-4 border-b border-gray-200"
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 shadow-lg shadow-amber-500/25'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="py-8"
          >
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Recent Orders */}
                <Card className="border-0 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl">Recent Orders</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')} className="text-amber-600">
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
                        ))}
                      </div>
                    ) : orders.length > 0 ? (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                      >
                        {orders.slice(0, 3).map((order) => {
                          const colors = getStatusColor(order.status);
                          return (
                            <motion.div 
                              key={order._id}
                              variants={itemVariants}
                              whileHover={{ x: 4 }}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <div>
                                <p className="font-semibold">Order #{order._id?.slice(-6).toUpperCase()}</p>
                                <p className="text-sm text-gray-500">{order.items?.length || 0} items • {formatPrice(order.total)}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${colors.bg} ${colors.text} ${colors.border} border`}>
                                {order.status}
                              </span>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">No orders yet</p>
                        <Link href="/products">
                          <Button className="bg-amber-500 hover:bg-amber-400 text-slate-900">Start Shopping</Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Wishlist */}
                <Card className="border-0 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl">Wishlist</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('wishlist')} className="text-amber-600">
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
                        ))}
                      </div>
                    ) : wishlistItems.length > 0 ? (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                      >
                        {wishlistItems.slice(0, 3).map((item: any) => (
                          <motion.div 
                            key={item._id}
                            variants={itemVariants}
                            whileHover={{ x: 4 }}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative">
                              {item.images?.[0]?.url && (
                                <Image src={item.images[0].url} alt={item.name} fill className="object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-amber-600 font-semibold">{formatPrice(item.variants?.[0]?.price || 0)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <div className="text-center py-8">
                        <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">Your wishlist is empty</p>
                        <Link href="/products">
                          <Button variant="outline">Explore Products</Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

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
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {orders.map((order) => {
                      const colors = getStatusColor(order.status);
                      return (
                        <motion.div key={order._id} variants={itemVariants}>
                          <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl font-bold">#{order._id?.slice(-6).toUpperCase()}</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${colors.bg} ${colors.text} ${colors.border} border`}>
                                      {order.status}
                                    </span>
                                    {order.paystackRef && (
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        Ref: {order.paystackRef.slice(0, 12)}...
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                                    <span className="flex items-center gap-2">
                                      <Package className="h-4 w-4" />
                                      {order.items?.length || 0} items
                                    </span>
                                    <span className="flex items-center gap-2">
                                      <CreditCard className="h-4 w-4" />
                                      {formatPrice(order.total)}
                                    </span>
                                    <span className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      {new Date(order.createdAt).toLocaleDateString('en-US', { 
                                        day: 'numeric', month: 'long', year: 'numeric'
                                      })}
                                    </span>
                                  </div>

                                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                                    {order.items?.slice(0, 4).map((item: any, idx: number) => (
                                      <div key={idx} className="flex-shrink-0 w-14 h-14 bg-gray-100 rounded-lg overflow-hidden relative border">
                                        {item.product?.images?.[0]?.url ? (
                                          <Image src={item.product.images[0].url} alt={item.name} fill className="object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                                        )}
                                      </div>
                                    ))}
                                    {(order.items?.length || 0) > 4 && (
                                      <div className="flex-shrink-0 w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">
                                        +{order.items.length - 4}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-3">
                                  {order.status === 'delivered' && (
                                    <Button variant="outline" size="sm">
                                      <Star className="h-4 w-4 mr-2" /> Review
                                    </Button>
                                  )}
                                  <Button variant="outline" size="sm">
                                    View Details
                                  </Button>
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
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <ShoppingBag className="h-12 w-12 text-amber-400" />
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-2">No Orders Yet</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        You haven't placed any orders yet. Start shopping to see your orders here.
                      </p>
                      <Link href="/products">
                        <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-900">
                          Browse Products
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">My Wishlist</h2>
                  <span className="text-gray-500">{wishlistItems.length} items</span>
                </div>
                
                {wishlistItems.length > 0 ? (
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  >
                    {wishlistItems.map((item: any) => (
                      <motion.div key={item._id} variants={itemVariants}>
                        <Card className="border-0 shadow-lg hover:shadow-2xl transition-all group overflow-hidden">
                          <div className="relative aspect-square bg-gray-100">
                            {item.images?.[0]?.url ? (
                              <Image src={item.images[0].url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                            )}
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-md hover:bg-red-50 transition-colors"
                            >
                              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                            </motion.button>
                          </div>
                          <CardContent className="p-4">
                            <p className="font-semibold mb-1 line-clamp-1">{item.name}</p>
                            <p className="text-amber-600 font-bold text-lg mb-3">{formatPrice(item.variants?.[0]?.price || 0)}</p>
                            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                              Add to Cart
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <Card className="border-2 border-dashed border-gray-200">
                    <CardContent className="p-16 text-center">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <Heart className="h-12 w-12 text-rose-300" />
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-2">Your Wishlist is Empty</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Save your favorite items to your wishlist to easily find them later.
                      </p>
                      <Link href="/products">
                        <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">
                          Explore Products
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'bookings' && (
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="p-16 text-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <Calendar className="h-12 w-12 text-blue-300" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">No Bookings</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Book a service like therapy or podcast studio rental.
                  </p>
                  <Link href="/services">
                    <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">
                      View Services
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {activeTab === 'settings' && (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Profile Settings */}
                <Card className="border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-amber-500" />
                      Profile Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <input 
                        type="text" 
                        defaultValue={user.name} 
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <input 
                        type="email" 
                        defaultValue={user.email} 
                        disabled
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <input 
                        type="tel" 
                        placeholder="Enter phone number"
                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      />
                    </div>
                    <Button className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900">
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>

                {/* Addresses */}
                <Card className="border-0 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-amber-500" />
                      Saved Addresses
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Add New
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {user.addresses && user.addresses.length > 0 ? (
                      <div className="space-y-3">
                        {user.addresses.map((address: any, index: number) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 bg-gray-50 rounded-xl flex items-start justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <MapPin className="h-5 w-5 text-amber-500 mt-0.5" />
                              <div>
                                <p className="font-medium">{address.street}</p>
                                <p className="text-sm text-gray-500">{address.city}, {address.state}</p>
                                <p className="text-sm text-gray-500">{address.country}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">No saved addresses</p>
                        <Button variant="outline">
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
