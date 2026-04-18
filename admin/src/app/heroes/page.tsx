'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { api } from '@/lib/api';
import type { Hero } from '@/lib/api';
import {
  Image, Plus, Search, Loader2, X, ChevronRight,
  CheckCircle, AlertCircle, Save, Trash2, Copy,
  GripVertical, Eye, EyeOff, Calendar,
} from 'lucide-react';

const BLANK: Omit<Hero, '_id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  subtitle: '',
  description: '',
  image: '',
  imageAlt: '',
  ctaText: 'Shop Now',
  ctaLink: '/products',
  isActive: true,
  order: 0,
};

function HeroForm({
  initial,
  onSave,
  onDelete,
  isNew,
}: {
  initial: Hero | typeof BLANK;
  onSave: (data: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  isNew: boolean;
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm({ ...initial });
    setShowDelete(false);
  }, [(initial as any)._id]);

  function showMsg(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await api.upload.image(file);
      setForm(f => ({ ...f, image: result.url, imageAlt: form.title }));
    } catch (err: any) {
      showMsg('err', err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!form.image) return;
    
    setSaving(true);
    try {
      await onSave(form);
      showMsg('ok', isNew ? 'Hero created' : 'Hero saved');
    } catch (err: any) {
      showMsg('err', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (err: any) {
      showMsg('err', err.message || 'Delete failed');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-lg text-white ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900 text-base">
              {isNew ? 'New Hero Banner' : form.title || 'Hero Banner'}
            </h2>
            {!isNew && (
              <p className="text-xs text-gray-400 mt-0.5">Order: {form.order}</p>
            )}
          </div>
          {!isNew && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hero Image <span className="text-red-400">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {form.image ? (
              <div className="relative aspect-[2/1] max-w-xl rounded-xl overflow-hidden border border-gray-200">
                <img src={form.image} alt={form.imageAlt || form.title} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, image: '', imageAlt: '' }))}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow hover:bg-red-50"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full max-w-xl aspect-[2/1] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Image className="w-8 h-8" />
                    <span className="text-sm">Click to upload image</span>
                  </>
                )}
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1">Recommended: 1920x960px or similar aspect ratio</p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Luxury. Lifestyle. Wellness."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtitle</label>
            <input
              type="text"
              value={form.subtitle || ''}
              onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
              placeholder="e.g. Discover premium fashion & wellness"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Additional description text..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Button Text</label>
              <input
                type="text"
                value={form.ctaText}
                onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                placeholder="Shop Now"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Button Link</label>
              <input
                type="text"
                value={form.ctaLink}
                onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))}
                placeholder="/products"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700">Active</p>
              <p className="text-xs text-gray-400">Inactive heroes won't show on the site</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || (!isNew && form.title === initial.title && form.image === initial.image)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isNew ? 'Create' : 'Save'}
          </button>
          {!isNew && onDelete && (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </form>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete this hero?</h3>
                <p className="text-sm text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeroesPage() {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null | 'new'>('new');

  async function load() {
    setLoading(true);
    try {
      const data = await api.heroes.getAll();
      setHeroes(data);
    } catch (err) {
      console.error('Failed to load heroes:', err);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const selected = selectedId === 'new' ? null : heroes.find(h => h._id === selectedId) || null;
  const activeCount = heroes.filter(h => h.isActive).length;

  async function handleCreate(data: any) {
    const created = await api.heroes.create(data);
    setHeroes(prev => [...prev, created]);
    setSelectedId(created._id);
  }

  async function handleUpdate(data: any) {
    const updated = await api.heroes.update(selected!._id, data);
    setHeroes(prev => prev.map(h => h._id === updated._id ? updated : h));
  }

  async function handleDelete() {
    await api.heroes.delete(selected!._id);
    setHeroes(prev => prev.filter(h => h._id !== selected!._id));
    setSelectedId('new');
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-4rem)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-6 flex">
        <div className={`w-full md:w-[380px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white ${selectedId !== null && selectedId !== '' ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-4 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Image className="w-4 h-4 text-amber-500" /> Hero Banners
                </h1>
                {!loading && (
                  <p className="text-xs text-gray-400 mt-0.5">{activeCount} active · {heroes.length} total</p>
                )}
              </div>
              <button
                onClick={() => setSelectedId('new')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedId === 'new' ? 'bg-amber-100 text-amber-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
            ) : heroes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Image className="w-10 h-10 mx-auto opacity-15 mb-2" />
                <p className="text-sm">No hero banners yet</p>
              </div>
            ) : (
              heroes.map(h => (
                <button
                  key={h._id}
                  onClick={() => setSelectedId(h._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition ${selectedId === h._id ? 'bg-amber-50 border-l-2 border-l-amber-400' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    {h.image ? (
                      <img src={h.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{h.title}</p>
                    <p className="text-xs text-gray-400">{h.ctaText} → {h.ctaLink}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {h.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`flex-1 flex flex-col bg-gray-50 ${selectedId !== null ? 'flex' : 'hidden md:flex'}`}>
          <div className="md:hidden px-4 pt-4 pb-2">
            <button onClick={() => setSelectedId(null)} className="text-sm text-amber-600 font-medium">
              ← Back to heroes
            </button>
          </div>

          {selectedId === 'new' ? (
            <HeroForm
              key="new"
              initial={BLANK}
              onSave={handleCreate}
              isNew={true}
            />
          ) : selected ? (
            <HeroForm
              key={selected._id}
              initial={selected}
              onSave={handleUpdate}
              onDelete={handleDelete}
              isNew={false}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Image className="w-14 h-14 opacity-10" />
              <p className="font-medium text-sm">Select a hero to edit</p>
              <button
                onClick={() => setSelectedId('new')}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
              >
                <Plus className="w-4 h-4" /> New Hero
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
