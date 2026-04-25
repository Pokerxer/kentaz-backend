'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { api, Announcement } from '@/lib/api';
import {
  Plus, Pencil, Trash2, Megaphone, AlertCircle,
  CheckCircle, Info, Tag, AlertTriangle, Loader2, X,
  ToggleLeft, ToggleRight,
} from 'lucide-react';

const TYPE_CONFIG = {
  info:    { label: 'Info',    icon: Info,          bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
  warning: { label: 'Warning', icon: AlertTriangle, bg: 'bg-amber-50',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700' },
  success: { label: 'Success', icon: CheckCircle,   bg: 'bg-green-50',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700' },
  promo:   { label: 'Promo',   icon: Tag,           bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
};

const EMPTY: Partial<Announcement> = { title: '', body: '', type: 'info', active: true, startsAt: '', endsAt: '' };

function Modal({
  item, onSave, onClose, saving,
}: {
  item: Partial<Announcement>;
  onSave: (data: Partial<Announcement>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(item);
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">{form._id ? 'Edit' : 'New'} Announcement</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title *</label>
              <input
                value={form.title ?? ''}
                onChange={e => set('title', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C]"
                placeholder="e.g. Store closed on Sunday"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Message *</label>
              <textarea
                rows={3}
                value={form.body ?? ''}
                onChange={e => set('body', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] resize-none"
                placeholder="Details of the announcement…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type</label>
                <select
                  value={form.type ?? 'info'}
                  onChange={e => set('type', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C]"
                >
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => set('active', !form.active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-[#C9A84C]' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm font-medium text-gray-700">{form.active ? 'Active' : 'Inactive'}</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Starts At</label>
                <input
                  type="datetime-local"
                  value={form.startsAt ? form.startsAt.slice(0, 16) : ''}
                  onChange={e => set('startsAt', e.target.value || '')}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ends At</label>
                <input
                  type="datetime-local"
                  value={form.endsAt ? form.endsAt.slice(0, 16) : ''}
                  onChange={e => set('endsAt', e.target.value || '')}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C]"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={saving || !form.title?.trim() || !form.body?.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A84C] hover:bg-[#b8963e] disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {form._id ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AnnouncementsPage() {
  const [items, setItems]       = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState<Partial<Announcement> | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      setItems(await api.announcements.getAll());
    } catch (e: any) {
      setError(e.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: Partial<Announcement>) {
    setSaving(true);
    try {
      if (data._id) {
        const updated = await api.announcements.update(data._id, data);
        setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
      } else {
        const created = await api.announcements.create(data);
        setItems(prev => [created, ...prev]);
      }
      setModal(null);
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: Announcement) {
    try {
      const updated = await api.announcements.update(item._id, { ...item, active: !item.active });
      setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
    } catch (e: any) {
      alert(e.message || 'Failed to update');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    setDeleting(id);
    try {
      await api.announcements.delete(id);
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  const activeCount = items.filter(i => i.active).length;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeCount} active · {items.length} total
          </p>
        </div>
        <button
          onClick={() => setModal({ ...EMPTY })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A84C] hover:bg-[#b8963e] text-white text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          <button onClick={load} className="ml-auto font-medium hover:underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Megaphone className="h-7 w-7 text-[#C9A84C]" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">No announcements yet</h3>
          <p className="text-sm text-gray-500 mb-5">Create announcements to notify your customers about sales, closures, or news.</p>
          <button
            onClick={() => setModal({ ...EMPTY })}
            className="px-5 py-2.5 rounded-xl bg-[#C9A84C] hover:bg-[#b8963e] text-white text-sm font-semibold transition-colors"
          >
            Create First Announcement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div key={item._id} className={`rounded-2xl border p-5 flex items-start gap-4 transition-opacity ${item.active ? '' : 'opacity-60'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`h-5 w-5 ${cfg.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>{cfg.label}</span>
                    {item.active
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactive</span>}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{item.body}</p>
                  {(item.startsAt || item.endsAt) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {item.startsAt && `From ${new Date(item.startsAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}`}
                      {item.endsAt  && ` · Until ${new Date(item.endsAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(item)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    title={item.active ? 'Deactivate' : 'Activate'}
                  >
                    {item.active ? <ToggleRight className="h-5 w-5 text-[#C9A84C]" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setModal(item)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    disabled={deleting === item._id}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {deleting === item._id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal item={modal} onSave={handleSave} onClose={() => setModal(null)} saving={saving} />
      )}
    </AdminLayout>
  );
}
