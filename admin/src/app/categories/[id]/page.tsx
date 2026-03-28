'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Image as ImageIcon,
  X,
  AlertCircle,
  Trash2,
  Check,
  Package,
  Eye,
  EyeOff,
  ArrowRight,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { api } from '@/lib/api';

const categoryImages = [
  { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400', category: 'Male Fashion' },
  { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', category: 'Female Fashion' },
  { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', category: 'Luxury Hair' },
  { url: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400', category: 'Bags & Purses' },
  { url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', category: 'Shoes' },
  { url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', category: 'Accessories' },
  { url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400', category: 'Skincare' },
  { url: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=400', category: 'Hair' },
  { url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400', category: 'Perfumes' },
  { url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400', category: 'Gifts' },
  { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400', category: 'Kids' },
  { url: 'https://images.unsplash.com/photo-1519262074530-b0d1a10c9d2d?w=400', category: 'Accessories' },
];

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  sortOrder: number;
  count: number;
}

const categoryIcons: Record<string, string> = {
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

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    isActive: true,
    sortOrder: 0,
  });

  const slug = generateSlug(formData.name);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const categories = await api.categories.getAll();
        const found = (categories as Category[]).find((c: any) => c._id === id || c.slug === id);
        
        if (found) {
          setCategory(found);
          setFormData({
            name: found.name || '',
            description: found.description || '',
            image: found.image || '',
            isActive: found.isActive !== false,
            sortOrder: found.sortOrder || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch category:', err);
        setError('Failed to load category');
      } finally {
        setFetching(false);
      }
    };

    if (id) {
      fetchCategory();
    }
  }, [id]);

  useEffect(() => {
    if (category) {
      const changed = 
        formData.name !== category.name ||
        formData.description !== (category.description || '') ||
        formData.image !== (category.image || '') ||
        formData.isActive !== category.isActive ||
        formData.sortOrder !== category.sortOrder;
      setHasChanges(changed);
    }
  }, [formData, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.categories.update(id, formData);
      setSuccess('Category updated successfully!');
      setHasChanges(false);
      setTimeout(() => {
        router.push('/categories');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.categories.delete(id);
      router.push('/categories');
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const copySlug = () => {
    navigator.clipboard.writeText(slug);
  };

  if (fetching) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#C9A84C] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Categories
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Edit Category</h1>
              <p className="text-gray-500 mt-1">Update category details and settings</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Category</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center">
                    <span className="text-[#C9A84C] text-xs">1</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Male Fashion"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                    />
                  </div>

                  {/* Slug Preview */}
                  {formData.name && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">URL Slug:</span>
                          <code className="text-sm text-[#C9A84C] font-medium">/categories/{slug}</code>
                        </div>
                        <button
                          type="button"
                          onClick={copySlug}
                          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Copy slug"
                        >
                          <Copy className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Describe this category..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Image */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center">
                    <span className="text-[#C9A84C] text-xs">2</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Category Image</h2>
                </div>
                
                {formData.image ? (
                  <div className="relative group">
                    <img
                      src={formData.image}
                      alt="Category"
                      className="w-full h-56 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors"
                      >
                        Change Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(!showImagePicker)}
                      className="w-full h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-[#C9A84C] hover:bg-[#C9A84C]/5 transition-colors"
                    >
                      <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Click to select an image</span>
                        <p className="text-xs text-gray-500 mt-1">Recommended: 800x600px</p>
                      </div>
                    </button>
                    
                    {showImagePicker && (
                      <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {categoryImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, image: img.url });
                              setShowImagePicker(false);
                            }}
                            className="relative h-24 rounded-xl overflow-hidden border-2 border-transparent hover:border-[#C9A84C] transition-all group"
                          >
                            <img src={img.url} alt={img.category} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center">
                    <span className="text-[#C9A84C] text-xs">3</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-[#C9A84C]/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${formData.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {formData.isActive ? (
                          <Eye className="h-5 w-5 text-green-600" />
                        ) : (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Active Status</p>
                        <p className="text-sm text-gray-500">{formData.isActive ? 'Visible in store' : 'Hidden from store'}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#C9A84C] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        Lower = first
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-500">
                  {hasChanges && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                      Unsaved changes
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/categories"
                    className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading || !formData.name || !hasChanges}
                    className="flex items-center gap-2 px-6 py-3 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#B8953F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            {/* Live Preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Preview</h3>
              
              <div className="relative overflow-hidden rounded-xl border border-gray-100 shadow-sm group">
                <div className={`absolute inset-0 bg-gradient-to-br ${
                  formData.isActive ? 'from-[#C9A84C]/10 to-transparent' : 'from-gray-100 to-transparent'
                }`} />
                
                <div className="relative p-4">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${
                      formData.image ? '' : 'bg-gray-200'
                    }`}>
                      {categoryIcons[formData.name] || '📦'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{formData.name || 'Category Name'}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {formData.description || 'Category description'}
                      </p>
                    </div>
                    {!formData.isActive && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                        Hidden
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Package className="h-3 w-3" />
                      {category?.count || 0} products
                    </div>
                    <span className="text-xs text-[#C9A84C] font-medium flex items-center gap-1">
                      View Products <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Statistics</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Products</span>
                  </div>
                  <span className="font-semibold text-gray-900">{category?.count || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Status</span>
                  </div>
                  <span className={`font-semibold ${formData.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort Order</span>
                  </div>
                  <span className="font-semibold text-gray-900">{formData.sortOrder}</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-br from-[#C9A84C] to-[#B8953F] rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/products?category=${slug}`}
                  className="flex items-center justify-between p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <span className="text-sm">View Products</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/categories/new"
                  className="flex items-center justify-between p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <span className="text-sm">Add New Category</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Category</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{formData.name}</strong>? 
                {category && category.count > 0 && (
                  <span className="block mt-2 text-red-600">
                    This will move {category.count} products to "Other" category.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Delete Category'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
