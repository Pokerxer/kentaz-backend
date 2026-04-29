'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Calendar, Clock, CheckCircle, XCircle, Loader2, ChevronDown,
  User, Mic, ChevronLeft, ChevronRight, Ban, Lock, Unlock, Settings,
  Plus, Trash2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { api, Booking, AvailabilitySettings } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

// ─── helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function toYM(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function sameDay(a: string | Date, b: string | Date) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

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

// ─── Bookings tab ─────────────────────────────────────────────────────────────

function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    api.bookings.getAll().then(data => { setBookings(data || []); setLoading(false); })
      .catch(() => { setError('Failed to load bookings'); setLoading(false); });
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      await api.bookings.updateStatus(id, newStatus);
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: newStatus as any } : b));
    } catch { setError('Failed to update booking status'); }
    finally { setUpdatingId(null); }
  };

  const filtered = bookings.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (b.user?.name?.toLowerCase() || '').includes(q)
      || (b.user?.email?.toLowerCase() || '').includes(q)
      || b._id.toLowerCase().includes(q);
    return matchesSearch
      && (!statusFilter || b.status === statusFilter)
      && (!serviceFilter || b.serviceType === serviceFilter);
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    therapy: bookings.filter(b => b.serviceType === 'therapy').length,
    podcast: bookings.filter(b => b.serviceType === 'podcast').length,
  };

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" /></div>;

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Therapy', value: stats.therapy, color: 'text-purple-600' },
          { label: 'Podcast', value: stats.podcast, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name or email…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] bg-gray-50 text-sm" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 bg-gray-50 text-sm appearance-none cursor-pointer">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
            className="pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 bg-gray-50 text-sm appearance-none cursor-pointer">
            <option value="">All Services</option>
            <option value="therapy">Therapy</option>
            <option value="podcast">Podcast</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Customer', 'Service', 'Date & Time', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No bookings found</td></tr>
              ) : filtered.map(booking => {
                const svc = serviceConfig[booking.serviceType];
                const sc = statusConfig[booking.status] || statusConfig.pending;
                return (
                  <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#B8953F] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {booking.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{booking.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{booking.user?.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${svc.color}`}>
                        <svc.icon className="h-3.5 w-3.5" /> {svc.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" /> {formatDate(booking.date)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <Clock className="h-3 w-3" /> {booking.timeSlot} ({booking.duration} min)
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{formatPrice(booking.amount)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                        <sc.icon className="h-3 w-3" />
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {booking.status === 'pending' && (<>
                          <button onClick={() => updateStatus(booking._id, 'confirmed')} disabled={updatingId === booking._id}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                            {updatingId === booking._id ? '…' : 'Confirm'}
                          </button>
                          <button onClick={() => updateStatus(booking._id, 'cancelled')} disabled={updatingId === booking._id}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                            Cancel
                          </button>
                        </>)}
                        {booking.status === 'confirmed' && (
                          <button onClick={() => updateStatus(booking._id, 'completed')} disabled={updatingId === booking._id}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {updatingId === booking._id ? '…' : 'Complete'}
                          </button>
                        )}
                        {(booking.status === 'cancelled' || booking.status === 'completed') && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Availability tab ─────────────────────────────────────────────────────────

function AvailabilityTab() {
  const [serviceType, setServiceType] = useState<'therapy' | 'podcast'>('therapy');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [settings, setSettings] = useState<AvailabilitySettings | null>(null);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [calendarBookings, setCalendarBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Slot settings editor
  const [editingSlots, setEditingSlots] = useState(false);
  const [slotDraft, setSlotDraft] = useState<string[]>([]);
  const [newSlotInput, setNewSlotInput] = useState('');
  const [workingDaysDraft, setWorkingDaysDraft] = useState<number[]>([]);

  // Block reason modal
  const [blockModal, setBlockModal] = useState<{ type: 'date' | 'slot'; time?: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const loadCalendar = useCallback(async (svcType: string, date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const { settings: s, bookings: b } = await api.availability.getCalendar(svcType, toYM(date));
      setSettings(s);
      setCalendarBookings(b);
    } catch {
      setError('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendar(serviceType, currentDate);
    setSelectedDate(null);
  }, [serviceType, currentDate, loadCalendar]);

  // Refresh day bookings when selected date changes
  useEffect(() => {
    if (!selectedDate) { setDayBookings([]); return; }
    const day = calendarBookings.filter(b => sameDay(b.date, selectedDate));
    setDayBookings(day);
  }, [selectedDate, calendarBookings]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  // Calendar grid helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function getDayStatus(day: number) {
    const d = new Date(year, month, day);
    const ymd = toYMD(d);
    const isBlocked = (settings?.blockedDates || []).some(bd => sameDay(bd.date, d));
    const bookingCount = calendarBookings.filter(b => sameDay(b.date, d)).length;
    const isWorkingDay = (settings?.workingDays || [1,2,3,4,5]).includes(d.getDay());
    const isPast = d < new Date(new Date().setHours(0,0,0,0));
    return { isBlocked, bookingCount, isWorkingDay, isPast, ymd };
  }

  function isSlotBlocked(time: string) {
    if (!selectedDate) return false;
    return (settings?.blockedSlots || []).some(bs => sameDay(bs.date, selectedDate) && bs.time === time);
  }

  function isDateBlocked(date: Date) {
    return (settings?.blockedDates || []).some(bd => sameDay(bd.date, date));
  }

  function slotBookings(time: string) {
    return dayBookings.filter(b => b.timeSlot === time);
  }

  async function handleBlockDate() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const s = await api.availability.blockDate(serviceType, toYMD(selectedDate), blockReason);
      setSettings(s);
      setBlockModal(null);
      setBlockReason('');
      flash('Date blocked');
    } catch { setError('Failed to block date'); }
    finally { setSaving(false); }
  }

  async function handleUnblockDate() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const s = await api.availability.unblockDate(serviceType, toYMD(selectedDate));
      setSettings(s);
      flash('Date unblocked');
    } catch { setError('Failed to unblock date'); }
    finally { setSaving(false); }
  }

  async function handleBlockSlot(time: string) {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const s = await api.availability.blockSlot(serviceType, toYMD(selectedDate), time, blockReason);
      setSettings(s);
      setBlockModal(null);
      setBlockReason('');
      flash(`Slot ${time} blocked`);
    } catch { setError('Failed to block slot'); }
    finally { setSaving(false); }
  }

  async function handleUnblockSlot(time: string) {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const s = await api.availability.unblockSlot(serviceType, toYMD(selectedDate), time);
      setSettings(s);
      flash(`Slot ${time} unblocked`);
    } catch { setError('Failed to unblock slot'); }
    finally { setSaving(false); }
  }

  function openEditSlots() {
    setSlotDraft([...(settings?.timeSlots || [])].sort());
    setWorkingDaysDraft([...(settings?.workingDays || [1,2,3,4,5])]);
    setEditingSlots(true);
  }

  function addSlot() {
    const t = newSlotInput.trim();
    if (!t || slotDraft.includes(t)) return;
    // Validate HH:MM format
    if (!/^\d{2}:\d{2}$/.test(t)) { setError('Time must be in HH:MM format'); return; }
    setSlotDraft(prev => [...prev, t].sort());
    setNewSlotInput('');
  }

  async function saveSlots() {
    setSaving(true);
    try {
      const s = await api.availability.updateSettings(serviceType, {
        timeSlots: slotDraft,
        workingDays: workingDaysDraft,
        slotDuration: settings?.slotDuration || 60,
      });
      setSettings(s);
      setEditingSlots(false);
      flash('Schedule saved');
    } catch { setError('Failed to save schedule'); }
    finally { setSaving(false); }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      {/* Notifications */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" /> {success}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Calendar */}
        <div className="flex-1 min-w-0">
          {/* Service selector + calendar nav */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex gap-2">
                {(['therapy', 'podcast'] as const).map(s => (
                  <button key={s} onClick={() => setServiceType(s)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${serviceType === s
                      ? s === 'therapy' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {s === 'therapy' ? 'Therapy' : 'Podcast Studio'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">
                  {MONTH_NAMES[month]} {year}
                </span>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
                <button onClick={() => loadCalendar(serviceType, currentDate)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-1" title="Refresh">
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-7 w-7 animate-spin text-[#C9A84C]" />
              </div>
            ) : (
              <div className="p-4">
                {/* Day labels */}
                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const { isBlocked, bookingCount, isWorkingDay, isPast } = getDayStatus(day);
                    const d = new Date(year, month, day);
                    const isSelected = selectedDate ? sameDay(d, selectedDate) : false;
                    const isToday = d.toDateString() === today.toDateString();

                    let bg = 'bg-white hover:bg-gray-50';
                    if (isSelected) bg = 'bg-[#C9A84C] text-white hover:bg-[#B8953F]';
                    else if (isBlocked) bg = 'bg-red-50 hover:bg-red-100';
                    else if (!isWorkingDay) bg = 'bg-gray-50 text-gray-300';
                    else if (isPast) bg = 'bg-gray-50 text-gray-400';
                    else if (bookingCount > 0) bg = 'bg-amber-50 hover:bg-amber-100';
                    else bg = 'bg-green-50 hover:bg-green-100';

                    return (
                      <button key={day}
                        onClick={() => setSelectedDate(isSelected ? null : d)}
                        className={`relative rounded-lg p-1.5 text-sm transition-colors border ${isSelected ? 'border-[#C9A84C]' : 'border-transparent'} ${bg}`}>
                        <span className={`block text-center font-medium ${isToday && !isSelected ? 'text-[#C9A84C] font-bold' : ''}`}>
                          {day}
                        </span>
                        {isBlocked && !isSelected && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-400" />
                        )}
                        {bookingCount > 0 && !isBlocked && !isSelected && (
                          <span className="block text-center text-[10px] text-amber-600 font-medium leading-none">{bookingCount}bk</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t text-xs text-gray-500">
                  {[
                    { dot: 'bg-green-200', label: 'Available' },
                    { dot: 'bg-amber-300', label: 'Has bookings' },
                    { dot: 'bg-red-300', label: 'Blocked' },
                    { dot: 'bg-gray-200', label: 'Non-working' },
                  ].map(l => (
                    <span key={l.label} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`} /> {l.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Working days + slots settings */}
          <div className="bg-white rounded-xl border shadow-sm mt-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p className="font-semibold text-gray-800 text-sm">Schedule Settings</p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{serviceType} · {settings?.timeSlots?.length || 0} time slots</p>
              </div>
              <button onClick={openEditSlots}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Settings className="h-4 w-4" /> Edit
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Working Days</p>
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {FULL_DAY_NAMES.map((name, idx) => (
                  <span key={idx} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    (settings?.workingDays || []).includes(idx)
                      ? 'bg-[#C9A84C]/15 text-[#9A7A2A] border border-[#C9A84C]/30'
                      : 'bg-gray-100 text-gray-400'}`}>
                    {name.slice(0,3)}
                  </span>
                ))}
              </div>
              <p className="text-xs font-medium text-gray-500 mb-2">Available Time Slots</p>
              <div className="flex flex-wrap gap-1.5">
                {(settings?.timeSlots || []).length === 0
                  ? <p className="text-xs text-gray-400">No slots configured</p>
                  : (settings?.timeSlots || []).map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-gray-100 text-gray-700">{t}</span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Day detail panel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          {!selectedDate ? (
            <div className="bg-white rounded-xl border shadow-sm h-full flex items-center justify-center p-8 text-center">
              <div>
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">Select a date</p>
                <p className="text-xs text-gray-400 mt-1">Click any day to manage its availability</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50">
                <p className="font-semibold text-gray-800">
                  {selectedDate.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{serviceType}</p>
              </div>

              {/* Date-level block toggle */}
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Block entire day</span>
                {isDateBlocked(selectedDate) ? (
                  <button onClick={handleUnblockDate} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50">
                    <Unlock className="h-3.5 w-3.5" /> Unblock
                  </button>
                ) : (
                  <button onClick={() => { setBlockModal({ type: 'date' }); setBlockReason(''); }} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50">
                    <Ban className="h-3.5 w-3.5" /> Block day
                  </button>
                )}
              </div>

              {isDateBlocked(selectedDate) && (
                <div className="mx-5 my-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 flex items-center gap-2">
                  <Ban className="h-3.5 w-3.5 flex-shrink-0" />
                  This day is blocked — no bookings will be accepted
                </div>
              )}

              {/* Time slots */}
              <div className="px-5 py-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Time Slots</p>
                {(settings?.timeSlots || []).length === 0 ? (
                  <p className="text-xs text-gray-400">No time slots configured</p>
                ) : (
                  <div className="space-y-2">
                    {(settings?.timeSlots || []).map(time => {
                      const booked = slotBookings(time);
                      const blocked = isSlotBlocked(time);
                      const dayBlocked = isDateBlocked(selectedDate);

                      return (
                        <div key={time} className={`rounded-lg border p-2.5 ${blocked || dayBlocked ? 'bg-red-50 border-red-100' : booked.length ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-gray-800">{time}</span>
                              {blocked && <span className="text-[10px] font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded">BLOCKED</span>}
                              {!blocked && booked.length > 0 && <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">BOOKED</span>}
                              {!blocked && booked.length === 0 && !dayBlocked && <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">FREE</span>}
                            </div>
                            {!dayBlocked && (
                              blocked ? (
                                <button onClick={() => handleUnblockSlot(time)} disabled={saving}
                                  className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors" title="Unblock">
                                  <Unlock className="h-3.5 w-3.5" />
                                </button>
                              ) : booked.length === 0 ? (
                                <button onClick={() => { setBlockModal({ type: 'slot', time }); setBlockReason(''); }} disabled={saving}
                                  className="p-1 rounded hover:bg-red-100 text-red-400 transition-colors" title="Block slot">
                                  <Lock className="h-3.5 w-3.5" />
                                </button>
                              ) : null
                            )}
                          </div>
                          {booked.map(b => (
                            <div key={b._id} className="mt-1.5 text-xs text-gray-600 flex items-center gap-1.5">
                              <User className="h-3 w-3 text-gray-400" />
                              {b.user?.name || 'Customer'}
                              <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${statusConfig[b.status]?.color}`}>
                                {b.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit slots / working days modal */}
      {editingSlots && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">Edit Schedule — <span className="capitalize">{serviceType}</span></h2>
              <button onClick={() => setEditingSlots(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Working days */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Working Days</p>
                <div className="flex gap-2 flex-wrap">
                  {FULL_DAY_NAMES.map((name, idx) => (
                    <button key={idx}
                      onClick={() => setWorkingDaysDraft(prev =>
                        prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort()
                      )}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        workingDaysDraft.includes(idx)
                          ? 'bg-[#C9A84C] text-white border-[#C9A84C]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {name.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Time Slots</p>
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px]">
                  {slotDraft.map(t => (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-sm font-mono text-gray-700">
                      {t}
                      <button onClick={() => setSlotDraft(prev => prev.filter(s => s !== t))}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {slotDraft.length === 0 && <p className="text-xs text-gray-400">No slots added</p>}
                </div>
                <div className="flex gap-2">
                  <input type="time" value={newSlotInput} onChange={e => setNewSlotInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C]" />
                  <button onClick={addSlot}
                    className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => setEditingSlots(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={saveSlots} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-[#C9A84C] hover:bg-[#B8953F] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block reason modal */}
      {blockModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">
                {blockModal.type === 'date' ? 'Block Day' : `Block Slot ${blockModal.time}`}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedDate?.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="p-6">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Reason (optional)</label>
              <input type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)}
                placeholder="e.g. Staff holiday, Maintenance…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C]" />
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => setBlockModal(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => blockModal.type === 'date' ? handleBlockDate() : handleBlockSlot(blockModal.time!)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [tab, setTab] = useState<'bookings' | 'availability'>('bookings');

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500 text-sm">Manage appointments and availability</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {([
          { key: 'bookings', label: 'Bookings', icon: Calendar },
          { key: 'availability', label: 'Availability', icon: Clock },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'bookings' ? <BookingsTab /> : <AvailabilityTab />}
    </AdminLayout>
  );
}
