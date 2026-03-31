'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { api, type User } from '@/lib/api';
import {
  Users, Search, Plus, MoreVertical, Check, X,
  Shield, ShieldCheck, UserCog, User as UserIcon, Trash2, Edit,
  Loader2, ChevronLeft, ChevronRight, ArrowUpDown, Key
} from 'lucide-react';

// Available routes that can be granted/denied
const availableRoutes = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pos/dashboard', label: 'Point of Sale' },
  { href: '/pos/sales', label: 'POS Sales' },
  { href: '/products', label: 'Products' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/purchases', label: 'Purchases' },
  { href: '/orders', label: 'Orders' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/customers', label: 'Customers' },
  { href: '/users', label: 'User Management' },
  { href: '/staff', label: 'Staff' },
  { href: '/categories', label: 'Categories' },
  { href: '/discounts', label: 'Discounts' },
  { href: '/gift-cards', label: 'Gift Cards' },
  { href: '/shipping', label: 'Shipping' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/wishlists', label: 'Wishlists' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-14 h-14 text-xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-12 text-sm';
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
    'bg-green-100 text-green-700',
    'bg-pink-100 text-pink-700',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`${sz} ${colors[idx]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { bg: string; text: string; icon: any }> = {
    admin: { bg: 'bg-purple-100', text: 'text-purple-700', icon: ShieldCheck },
    staff: { bg: 'bg-blue-100', text: 'text-blue-700', icon: UserCog },
    therapist: { bg: 'bg-teal-100', text: 'text-teal-700', icon: UserIcon },
    customer: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Users },
  };
  const { bg, text, icon: Icon } = config[role] || config.customer;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function UserModal({
  user,
  onSave,
  onClose,
}: {
  user: User | null;
  onSave: (data: { name: string; email: string; role: string; isActive: boolean; permissions: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'customer');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [permissions, setPermissions] = useState<string[]>(user?.permissions || []);
  const [showPermissions, setShowPermissions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave({ name, email, role, isActive, permissions });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const togglePermission = (href: string) => {
    setPermissions(prev =>
      prev.includes(href)
        ? prev.filter(p => p !== href)
        : [...prev, href]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">Manage User Access</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Access Level</label>
            <div className="grid grid-cols-2 gap-2">
              {(['customer', 'staff', 'therapist', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-3 rounded-xl border text-sm font-medium transition flex items-center gap-2 ${
                    role === r
                      ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {r === 'admin' && <ShieldCheck className="w-4 h-4" />}
                  {r === 'staff' && <UserCog className="w-4 h-4" />}
                  {r === 'therapist' && <UserIcon className="w-4 h-4" />}
                  {r === 'customer' && <Users className="w-4 h-4" />}
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            {role === 'admin' && (
              <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Full admin access to the panel
              </p>
            )}
            {role === 'staff' && (
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <UserCog className="w-3 h-3" /> POS access only
              </p>
            )}
          </div>

          {/* Custom Permissions Section */}
          {role !== 'admin' && (
            <div>
              <button
                type="button"
                onClick={() => setShowPermissions(!showPermissions)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Route Permissions
                  {permissions.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[#C9A84C] text-white text-xs rounded-full">
                      {permissions.length}
                    </span>
                  )}
                </span>
                <span className={`transform transition-transform ${showPermissions ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {showPermissions && (
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border rounded-xl p-2">
                  {availableRoutes.map(route => (
                    <label
                      key={route.href}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={permissions.includes(route.href)}
                        onChange={() => togglePermission(route.href)}
                        className="rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]"
                      />
                      <span className="text-sm text-gray-700">{route.label}</span>
                      <span className="text-xs text-gray-400 ml-auto">{route.href}</span>
                    </label>
                  ))}
                  {permissions.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      No custom permissions - uses role-based defaults
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">Account Active</p>
              <p className="text-xs text-gray-400">Inactive users cannot log in</p>
            </div>
            <button
              type="button" onClick={() => setIsActive(a => !a)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#B8953F] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({
  user,
  onConfirm,
  onClose,
}: {
  user: User;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Delete User</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold">{user.name}</span>? They will lose all access to the platform.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState('');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.users.getAll({
        page,
        limit: 10,
        role: roleFilter || undefined,
        search: search || undefined,
      });
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleSave(data: { name: string; email: string; role: string; isActive: boolean; permissions: string[] }) {
    if (!editingUser) return;

    await api.users.updateRole(editingUser._id, data.role as 'customer' | 'admin' | 'therapist' | 'staff');
    if (editingUser.isActive !== data.isActive) {
      await api.users.toggleActive(editingUser._id);
    }
    // Update permissions for non-admin users
    if (data.role !== 'admin') {
      await api.users.updatePermissions(editingUser._id, data.permissions);
    }
    showToast('User access updated');
    loadUsers();
  }

  async function handleDelete() {
    if (!deletingUser) return;
    await api.users.delete(deletingUser._id);
    showToast('User deleted');
    loadUsers();
  }

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    return sortOrder === 'asc'
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#C9A84C]" /> User Access Management
        </h1>
        <p className="text-gray-500">Grant or revoke access to the admin panel</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="therapist">Therapist</option>
            <option value="customer">Customer</option>
          </select>
          <button
            onClick={() => { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase">Admins</p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase">Staff</p>
          <p className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.role === 'staff').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.isActive !== false).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto opacity-20 mb-2" />
                    <p className="text-sm">No users found</p>
                  </td>
                </tr>
              ) : (
                sortedUsers.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.isActive !== false ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-gray-400 hover:text-[#C9A84C] hover:bg-[#C9A84C]/10 rounded-lg transition"
                          title="Edit access"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-full text-sm shadow-lg z-50">
          <Check className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <UserModal
          user={editingUser}
          onSave={handleSave}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* Delete Modal */}
      {deletingUser && (
        <DeleteModal
          user={deletingUser}
          onConfirm={handleDelete}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </AdminLayout>
  );
}