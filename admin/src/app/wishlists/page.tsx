'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { api, WishlistUser, WishlistStats, WishlistProduct } from '@/lib/api';
import {
  Heart, Search, Trash2, ChevronLeft, ChevronRight, User, Package,
  AlertCircle, Loader2, X, MoreHorizontal, ShoppingBag, Tag,
} from 'lucide-react';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />;
}

function WishlistCard({ user, onView, onClear }: { user: WishlistUser; onView: () => void; onClear: () => void }) {
  const hasItems = user.wishlist && user.wishlist.length > 0;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-[#C9A84C]/20 transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* User Avatar */}
        <button onClick={onView} className="flex-shrink-0">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <span className="text-lg font-bold text-white">
              {(user.name || user.email || 'U')[0].toUpperCase()}
            </span>
          </div>
        </button>

        <div className="flex-1 min-w-0">
          {/* User Info */}
          <button onClick={onView} className="text-left w-full">
            <p className="font-bold text-gray-900 hover:text-[#C9A84C] transition-colors truncate">
              {user.name || 'Unknown User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </button>

          {/* Wishlist Count Badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
              <Heart className="w-3 h-3 fill-amber-500" />
              {user.wishlistCount} items
            </span>
          </div>

          {/* Product Preview */}
          {hasItems && (
            <div className="flex items-center gap-2 mt-3 overflow-hidden">
              {user.wishlist.slice(0, 4).map((item, idx) => (
                <div key={item._id || idx} className="relative">
                  {item.images?.[0]?.url ? (
                    <img
                      src={item.images[0].url}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover ring-2 ring-white"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ring-2 ring-white">
                      <Package className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              {user.wishlistCount > 4 && (
                <span className="text-xs text-gray-400">+{user.wishlistCount - 4} more</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onView}
            className="p-2.5 text-gray-400 hover:text-[#C9A84C] hover:bg-amber-50 rounded-xl transition-all"
            title="View wishlist"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {hasItems && (
            <button
              onClick={onClear}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear wishlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WishlistModal({ user, onClose, onRemove }: { user: WishlistUser | null; onClose: () => void; onRemove: (productId: string) => void }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name || 'User'}'s Wishlist</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Items */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {user.wishlist.length === 0 ? (
            <div className="text-center py-10">
              <Heart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">This wishlist is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user.wishlist.map((item) => (
                <div key={item._id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <Link href={`/products/${item._id}`}>
                    {item.images?.[0]?.url ? (
                      <img src={item.images[0].url} alt={item.name} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item._id}`} className="font-medium text-gray-900 hover:text-[#C9A84C] truncate block">
                      {item.name}
                    </Link>
                    {item.category && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Tag className="w-3 h-3" /> {item.category.name}
                      </p>
                    )}
                    {item.variants?.[0]?.price && (
                      <p className="text-sm font-semibold text-[#C9A84C] mt-0.5">
                        ₦{item.variants[0].price.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(item._id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{user.wishlistCount}</span> items in wishlist
            </p>
            <button
              onClick={() => {
                if (confirm('Clear entire wishlist?')) {
                  // Clear all - would need API
                  onClose();
                }
              }}
              className="text-sm text-red-500 hover:underline font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, delay }: { title: string; value: string; icon: React.ElementType; color: string; delay: number }) {
  return (
    <div 
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-black text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 font-medium">{title}</p>
        </div>
      </div>
    </div>
  );
}

export default function WishlistsPage() {
  const [users, setUsers] = useState<WishlistUser[]>([]);
  const [stats, setStats] = useState<WishlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<WishlistUser | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 12 };
      if (search) params.search = search;

      const [usersRes, statsRes] = await Promise.all([
        api.wishlists.getAll(params),
        api.wishlists.getStats(),
      ]);

      setUsers(usersRes.users);
      setTotalPages(usersRes.totalPages);
      setStats(statsRes);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load wishlists');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleViewUser = async (userId: string) => {
    try {
      const userData = await api.wishlists.getUserWishlist(userId);
      setSelectedUser(userData);
    } catch (e: any) {
      alert(e.message || 'Failed to load user wishlist');
    }
  };

  const handleClearWishlist = async (userId: string) => {
    if (!confirm('Clear this user\'s entire wishlist?')) return;
    try {
      await api.wishlists.clearUserWishlist(userId);
      load();
    } catch (e: any) {
      alert(e.message || 'Failed to clear wishlist');
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedUser || !confirm('Remove this product from wishlist?')) return;
    try {
      await api.wishlists.removeProduct(selectedUser._id, productId);
      const updated = await api.wishlists.getUserWishlist(selectedUser._id);
      setSelectedUser(updated);
      load();
    } catch (e: any) {
      alert(e.message || 'Failed to remove product');
    }
  };

  if (loading && !users.length) return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">{error}</p>
        <button 
          onClick={load} 
          className="px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] hover:shadow-lg hover:shadow-[#C9A84C]/20 transition-all"
        >
          Try Again
        </button>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Wishlists</h1>
              <p className="text-sm text-gray-500">Customer wishlists</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <StatsCard
                title="Users with Wishlists"
                value={stats.totalUsers.toString()}
                icon={User}
                color="bg-gradient-to-br from-blue-500 to-blue-600"
                delay={0}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
              <StatsCard
                title="Total Items"
                value={stats.totalItems.toString()}
                icon={Package}
                color="bg-gradient-to-br from-rose-500 to-rose-600"
                delay={50}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <StatsCard
                title="Avg Items/User"
                value={stats.avgItemsPerUser}
                icon={Heart}
                color="bg-gradient-to-br from-amber-400 to-amber-500"
                delay={100}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <StatsCard
                title="Top Category"
                value={stats.popularCategories[0]?.category || 'N/A'}
                icon={Tag}
                color="bg-gradient-to-br from-green-500 to-green-600"
                delay={150}
              />
            </div>
          </div>
        )}

        {/* Top Wishlisted Products */}
        {stats && stats.topProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-gray-900 mb-4">Most Wishlisted Products</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {stats.topProducts.slice(0, 5).map((product, idx) => (
                <Link
                  key={product._id}
                  href={`/products/${product._id}`}
                  className="group relative bg-gray-50 rounded-xl p-3 hover:bg-amber-50 transition-colors"
                >
                  <div className="relative">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-16 rounded-lg object-cover" />
                    ) : (
                      <div className="w-full h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C9A84C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {product.wishlistCount}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-700 mt-2 truncate group-hover:text-[#C9A84C]">
                    {product.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (setPage(1), load())}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/10 transition-all"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{users.length}</span> users with wishlists
          </p>
        </div>

        {/* Wishlists Grid */}
        {users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-gray-900 font-medium mb-1">No wishlists found</p>
            <p className="text-sm text-gray-500">
              {search ? 'Try adjusting your search' : 'Wishlists will appear here when users add products'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user, idx) => (
              <div
                key={user._id}
                className="opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <WishlistCard
                  user={user}
                  onView={() => handleViewUser(user._id)}
                  onClear={() => handleClearWishlist(user._id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">
              Page <span className="font-medium text-gray-900">{page}</span> of{' '}
              <span className="font-medium text-gray-900">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal */}
        <WishlistModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRemove={handleRemoveProduct}
        />

      </div>
    </AdminLayout>
  );
}