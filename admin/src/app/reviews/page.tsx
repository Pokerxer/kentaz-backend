'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { api, Review, ReviewStats } from '@/lib/api';
import {
  Star, Search, Trash2, ChevronLeft, ChevronRight,
  AlertCircle, MessageSquare, ThumbsUp, Package, Filter,
  Loader2, X, Check,
} from 'lucide-react';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`${sizes[size]} ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, onDelete }: { review: Review; onDelete: (id: string) => void }) {
  const [showFullComment, setShowFullComment] = useState(false);
  const isLongComment = review.comment?.length > 120;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-[#C9A84C]/20 transition-all duration-300">
      <div className="flex items-start gap-5">
        {/* Product image */}
        <Link href={`/products/${review.product?._id}`} className="flex-shrink-0 group-image">
          {review.product?.images?.[0]?.url ? (
            <img
              src={review.product.images[0].url}
              alt={review.product.name}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-gray-100 group-hover:ring-[#C9A84C]/30 transition-all"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center ring-2 ring-gray-100">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <Link href={`/products/${review.product?._id}`} className="font-bold text-gray-900 hover:text-[#C9A84C] transition-colors line-clamp-1">
                {review.product?.name || 'Unknown Product'}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={review.rating} />
                <span className="text-sm font-semibold text-gray-700">{review.rating}.0</span>
              </div>
            </div>
            <button
              onClick={() => onDelete(review._id)}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              title="Delete review"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* User & Date */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {(review.user?.name || 'A')[0].toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {review.user?.name || 'Anonymous'}
            </p>
            <span className="text-gray-300">•</span>
            <p className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString('en-NG', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </p>
          </div>

          {/* Comment */}
          {review.comment && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {isLongComment && !showFullComment
                ? review.comment.slice(0, 120) + '...'
                : review.comment}
              {isLongComment && (
                <button
                  onClick={() => setShowFullComment(!showFullComment)}
                  className="text-[#C9A84C] text-xs font-medium ml-1.5 hover:underline"
                >
                  {showFullComment ? 'Show less' : 'Read more'}
                </button>
              )}
            </p>
          )}
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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 12 };
      if (search) params.search = search;
      if (ratingFilter) params.rating = ratingFilter;

      const [reviewsRes, statsRes] = await Promise.all([
        api.reviews.getAll(params),
        api.reviews.getStats(),
      ]);

      setReviews(reviewsRes.reviews);
      setTotalPages(reviewsRes.totalPages);
      setStats(statsRes);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page, search, ratingFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.reviews.delete(id);
      load();
    } catch (e: any) {
      alert(e.message || 'Failed to delete review');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRatingFilter(null);
    setPage(1);
    load();
  };

  const hasActiveFilters = search || ratingFilter;

  if (loading && !reviews.length) return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center shadow-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
              <p className="text-sm text-gray-500">Manage customer reviews</p>
            </div>
          </div>
          {stats && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold text-amber-700">{stats.avgRating} average rating</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <StatsCard
                title="Total Reviews"
                value={stats.total.toString()}
                icon={MessageSquare}
                color="bg-gradient-to-br from-blue-500 to-blue-600"
                delay={0}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
              <StatsCard
                title="Avg Rating"
                value={stats.avgRating}
                icon={Star}
                color="bg-gradient-to-br from-amber-400 to-amber-500"
                delay={50}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <StatsCard
                title="5-Star Reviews"
                value={(stats.distribution[5] || 0).toString()}
                icon={ThumbsUp}
                color="bg-gradient-to-br from-green-500 to-green-600"
                delay={100}
              />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <StatsCard
                title="1-Star Reviews"
                value={(stats.distribution[1] || 0).toString()}
                icon={AlertCircle}
                color="bg-gradient-to-br from-red-500 to-red-600"
                delay={150}
              />
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name or review content..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (setPage(1), load())}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/10 transition-all"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                showFilters || ratingFilter 
                  ? 'border-[#C9A84C] bg-amber-50 text-[#C9A84C]' 
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              {ratingFilter && (
                <span className="w-5 h-5 rounded-full bg-[#C9A84C] text-white text-[10px] flex items-center justify-center">
                  {ratingFilter}
                </span>
              )}
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:text-red-500 hover:border-red-200 transition-all"
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Clear</span>
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-3">Filter by rating</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: null, label: 'All' },
                  { value: 5, label: '★★★★★' },
                  { value: 4, label: '★★★★' },
                  { value: 3, label: '★★★' },
                  { value: 2, label: '★★' },
                  { value: 1, label: '★' },
                ].map(opt => (
                  <button
                    key={opt.value ?? 'all'}
                    onClick={() => { setRatingFilter(opt.value); setPage(1); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      ratingFilter === opt.value
                        ? 'bg-[#C9A84C] text-white shadow-lg shadow-[#C9A84C]/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rating Distribution */}
        {stats && stats.total > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-gray-900 mb-4">Rating Distribution</p>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map(r => {
                const count = stats.distribution[r] || 0;
                const pct = stats.total ? (count / stats.total) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium text-gray-700">{r}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    </div>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{reviews.length}</span> of{' '}
            <span className="font-medium text-gray-900">{stats?.total || 0}</span> reviews
          </p>
          {hasActiveFilters && (
            <p className="text-sm text-gray-500">
              Filtered results
            </p>
          )}
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-gray-900 font-medium mb-1">No reviews found</p>
            <p className="text-sm text-gray-500">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Reviews will appear here when customers leave them'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F]"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review, idx) => (
              <div
                key={review._id}
                className="opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <ReviewCard
                  review={review}
                  onDelete={handleDelete}
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

      </div>
    </AdminLayout>
  );
}