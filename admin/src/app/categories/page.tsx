'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Loader2, Tag, Package, Eye, EyeOff,
  Save, Trash2, X, AlertCircle, CheckCircle, ArrowRight,
  Image as ImageIcon, ChevronRight, GripVertical,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminCategory } from '@/lib/api';
import { AdminLayout } from '@/components/AdminLayout';

// ── Helpers ────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  'Male Fashion': '👔',
  'Female Fashion': '👗',
  'Kiddies Fashion': '🧸',
  'Skincare': '✨',
  'Luxury Hair': '💇',
  'Luxury Human Hair': '💇‍♀️',
  'Bags & Purses': '👜',
  'Shoes': '👠',
  'Accessories': '⌚',
  'Perfumes': '🧴',
  'Gift Items': '🎁',
};

const SAMPLE_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400', label: 'Fashion' },
  { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', label: 'Female' },
  { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', label: 'Hair' },
  { url: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400', label: 'Bags' },
  { url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', label: 'Shoes' },
  { url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', label: 'Accessories' },
  { url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400', label: 'Skincare' },
  { url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400', label: 'Perfumes' },
  { url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400', label: 'Gifts' },
  { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400', label: 'Kids' },
];

function generateSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── CategoryDetail (right panel) ───────────────────────────────

function CategoryDetail({
  category,
  onSaved,
  onDeleted,
}: {
  category: AdminCategory;
  onSaved: (updated: AdminCategory) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({
    name: category.name,
    description: category.description || '',
    image: category.image || '',
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Reset form when category changes
  useEffect(() => {
    setForm({
      name: category.name,
      description: category.description || '',
      image: category.image || '',
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    setShowDeleteConfirm(false);
    setShowImagePicker(false);
  }, [category._id]);

  const hasChanges =
    form.name !== category.name ||
    form.description !== (category.description || '') ||
    form.image !== (category.image || '') ||
    form.isActive !== category.isActive ||
    form.sortOrder !== category.sortOrder;

  function showMsg(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.categories.update(category._id, form);
      onSaved({ ...category, ...form });
      showMsg('ok', 'Category saved');
    } catch (err: any) {
      showMsg('err', err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.categories.delete(category._id);
      onDeleted(category._id);
    } catch (err: any) {
      showMsg('err', err.message || 'Delete failed');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const slug = generateSlug(form.name);
  const icon = CATEGORY_ICONS[form.name] || '📦';

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-lg text-white ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 truncate">{category.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${category.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {category.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-400">{category.count} products</span>
              </div>
            </div>
          </div>
          <Link
            href={`/products?category=${category.name}`}
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium flex-shrink-0"
          >
            Products <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-400">*</span></label>
            <input
              type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            />
            {form.name && (
              <p className="text-xs text-gray-400 mt-1">
                Slug: <code className="text-amber-600">{slug}</code>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe this category…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Image</label>
            {form.image ? (
              <div className="relative group rounded-xl overflow-hidden">
                <img src={form.image} alt="category" className="w-full h-36 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button type="button" onClick={() => setShowImagePicker(v => !v)}
                    className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-800">Change</button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, image: '' }))}
                    className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-red-600">Remove</button>
                </div>
              </div>
            ) : (
              <button
                type="button" onClick={() => setShowImagePicker(v => !v)}
                className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50/50 transition text-gray-400"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs">Click to select image</span>
              </button>
            )}
            {showImagePicker && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {SAMPLE_IMAGES.map((img, i) => (
                  <button key={i} type="button"
                    onClick={() => { setForm(f => ({ ...f, image: img.url })); setShowImagePicker(false); }}
                    className={`relative h-16 rounded-lg overflow-hidden border-2 transition ${form.image === img.url ? 'border-amber-400' : 'border-transparent hover:border-amber-300'}`}
                  >
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="text-xs font-medium text-gray-700">Active</p>
                <p className="text-xs text-gray-400">Visible in store</p>
              </div>
              <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${form.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number" value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full text-sm font-semibold bg-transparent focus:outline-none text-gray-800"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex items-center gap-2">
          <button
            type="submit" disabled={saving || !hasChanges}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
          {hasChanges && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Unsaved
            </span>
          )}
          <button
            type="button" onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </form>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete "{category.name}"?</h3>
                <p className="text-sm text-gray-500">This cannot be undone</p>
              </div>
            </div>
            {category.count > 0 && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                {category.count} product{category.count !== 1 ? 's' : ''} will be moved to "Other"
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [filtered, setFiltered] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  async function load() {
    setLoading(true);
    try {
      const data = await api.categories.getAllAdmin();
      setCategories(data);
      setFiltered(data);
    } catch {
      // fallback to public endpoint
      try {
        const data = await api.categories.getAll();
        setCategories(data as AdminCategory[]);
        setFiltered(data as AdminCategory[]);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // debounced search
  useEffect(() => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      const q = search.toLowerCase();
      setFiltered(q ? categories.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)) : categories);
    }, 200);
  }, [search, categories]);

  // auto-select first
  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0]._id);
  }, [filtered]);

  const selected = filtered.find(c => c._id === selectedId) ?? null;
  const totalProducts = categories.reduce((s, c) => s + c.count, 0);
  const activeCount = categories.filter(c => c.isActive).length;

  function handleSaved(updated: AdminCategory) {
    setCategories(prev => prev.map(c => c._id === updated._id ? updated : c));
  }

  function handleDeleted(id: string) {
    setCategories(prev => prev.filter(c => c._id !== id));
    setSelectedId(null);
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-4rem)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-6 flex">

        {/* ── Left panel ── */}
        <div className={`w-full md:w-[360px] lg:w-[380px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white ${selectedId ? 'hidden md:flex' : 'flex'}`}>

          {/* Header */}
          <div className="px-4 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" /> Categories
                </h1>
                {!loading && (
                  <p className="text-xs text-gray-400 mt-0.5">{activeCount} active · {categories.length - activeCount} hidden · {totalProducts} products</p>
                )}
              </div>
              <Link
                href="/categories/new"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </Link>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text" placeholder="Search categories…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Tag className="w-10 h-10 mx-auto opacity-20 mb-2" />
                <p className="text-sm">{search ? 'No results' : 'No categories yet'}</p>
              </div>
            ) : (
              filtered
                .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                .map(cat => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedId(cat._id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition ${
                      selectedId === cat._id ? 'bg-amber-50 border-l-2 border-l-amber-400' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                      {CATEGORY_ICONS[cat.name] || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-semibold truncate ${cat.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                          {cat.name}
                        </p>
                        {!cat.isActive && (
                          <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">hidden</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{cat.count} products</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  </button>
                ))
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${selectedId ? 'flex' : 'hidden md:flex'}`}>

          {/* Mobile back */}
          {selectedId && (
            <div className="md:hidden px-4 pt-4 pb-2">
              <button onClick={() => setSelectedId(null)} className="text-sm text-amber-600 font-medium">
                ← Back to categories
              </button>
            </div>
          )}

          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Tag className="w-14 h-14 opacity-10" />
              <p className="font-medium text-sm">Select a category to edit</p>
              <Link href="/categories/new" className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition">
                <Plus className="w-4 h-4" /> Add Category
              </Link>
            </div>
          ) : (
            <CategoryDetail
              key={selected._id}
              category={selected}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
