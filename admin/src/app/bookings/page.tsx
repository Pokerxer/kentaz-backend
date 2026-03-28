'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, CheckCircle, XCircle, Loader2, Filter, User, Video, Mic, ChevronDown } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { api, Booking } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

const serviceConfig: Record<string, { label: string; icon: any; color: string }> = {
  therapy: { label: 'Therapy', icon: User, color: 'bg-purple-100 text-purple-700' },
  podcast: { label: 'Podcast Studio', icon: Mic, color: 'bg-orange-100 text-orange-700' },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await api.bookings.getAll();
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      await api.bookings.updateStatus(id, newStatus);
      setBookings(prev => 
        prev.map(b => b._id === id ? { ...b, status: newStatus as any } : b)
      );
    } catch (err) {
      console.error('Failed to update booking:', err);
      setError('Failed to update booking status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const searchLower = searchQuery.toLowerCase();
    const customerName = booking.user?.name?.toLowerCase() || '';
    const customerEmail = booking.user?.email?.toLowerCase() || '';
    
    const matchesSearch = customerName.includes(searchLower) || 
      customerEmail.includes(searchLower) || 
      booking._id.toLowerCase().includes(searchLower);
    
    const matchesStatus = !statusFilter || booking.status === statusFilter;
    const matchesService = !serviceFilter || booking.serviceType === serviceFilter;
    
    return matchesSearch && matchesStatus && matchesService;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    therapy: bookings.filter(b => b.serviceType === 'therapy').length,
    podcast: bookings.filter(b => b.serviceType === 'podcast').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500">Manage service appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">Therapy Sessions</p>
          <p className="text-2xl font-bold text-purple-600">{stats.therapy}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">Podcast Sessions</p>
          <p className="text-2xl font-bold text-orange-600">{stats.podcast}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 hover:bg-gray-50 transition-all"
          />
        </div>
        
        <div className="relative min-w-[160px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 hover:bg-gray-50 transition-all appearance-none cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative min-w-[160px]">
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50/50 hover:bg-gray-50 transition-all appearance-none cursor-pointer"
          >
            <option value="">All Services</option>
            <option value="therapy">Therapy</option>
            <option value="podcast">Podcast Studio</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const service = serviceConfig[booking.serviceType];
                  const StatusIcon = statusConfig[booking.status]?.icon || Clock;
                  
                  return (
                    <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center text-white font-medium">
                            {booking.user?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{booking.user?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{booking.user?.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${service.color}`}>
                          <service.icon className="h-4 w-4" />
                          {service.label}
                        </div>
                        {booking.therapistId && (
                          <p className="text-sm text-gray-500 mt-1">
                            Therapist: {booking.therapistId.name}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(booking.date)}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                          <Clock className="h-3 w-3" />
                          {booking.timeSlot} ({booking.duration} min)
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{formatPrice(booking.amount)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[booking.status]?.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(booking._id, 'confirmed')}
                                disabled={updatingId === booking._id}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                {updatingId === booking._id ? '...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => updateStatus(booking._id, 'cancelled')}
                                disabled={updatingId === booking._id}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => updateStatus(booking._id, 'completed')}
                              disabled={updatingId === booking._id}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {updatingId === booking._id ? '...' : 'Complete'}
                            </button>
                          )}
                          {(booking.status === 'cancelled' || booking.status === 'completed') && (
                            <span className="text-sm text-gray-500">No actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
