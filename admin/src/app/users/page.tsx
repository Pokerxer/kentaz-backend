'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { api, type User } from '@/lib/api';
import {
  Users, Search, Check, X,
  ShieldCheck, UserCog, User as UserIcon, Trash2, Edit,
  Loader2, ChevronLeft, ChevronRight, ArrowUpDown, Key,
  Lock, Unlock, Eye, EyeOff, ToggleLeft, ToggleRight, RefreshCw,
  Monitor, ShoppingCart, Package, BarChart3, Settings,
  Tag, CreditCard, Truck, Star, Heart, Bell, Megaphone,
  FileText, Calendar, Box, ShoppingBag, ChevronDown,
  DollarSign, RotateCcw, XCircle, Plus, KeyRound,
} from 'lucide-react';

// ── POS action permissions ─────────────────────────────────────────

const POS_ACTIONS = [
  {
    key: 'pos:price_override',
    label: 'Price Override',
    desc: 'Change a product\'s price at the POS terminal',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    key: 'pos:refund',
    label: 'Process Refunds',
    desc: 'Refund items from a completed sale',
    icon: RotateCcw,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    key: 'pos:void',
    label: 'Void Sales',
    desc: 'Void an entire completed transaction',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
];

// ── Route catalogue ────────────────────────────────────────────────

type RouteGroup = { label: string; routes: { href: string; label: string; icon: any }[] };

const routeGroups: RouteGroup[] = [
  {
    label: 'Overview',
    routes: [
      { href: '/dashboard',     label: 'Dashboard',       icon: BarChart3 },
    ],
  },
  {
    label: 'Point of Sale',
    routes: [
      { href: '/pos/dashboard', label: 'POS Terminal',    icon: Monitor },
      { href: '/pos/sales',     label: 'POS Sales',       icon: ShoppingCart },
    ],
  },
  {
    label: 'Catalogue',
    routes: [
      { href: '/products',      label: 'Products',        icon: Package },
      { href: '/inventory',     label: 'Inventory',       icon: Box },
      { href: '/purchases',     label: 'Purchases',       icon: ShoppingBag },
      { href: '/categories',    label: 'Categories',      icon: Tag },
    ],
  },
  {
    label: 'Commerce',
    routes: [
      { href: '/orders',        label: 'Orders',          icon: ShoppingCart },
      { href: '/bookings',      label: 'Bookings',        icon: Calendar },
      { href: '/discounts',     label: 'Discounts',       icon: Tag },
      { href: '/gift-cards',    label: 'Gift Cards',      icon: CreditCard },
      { href: '/shipping',      label: 'Shipping',        icon: Truck },
    ],
  },
  {
    label: 'Customers & People',
    routes: [
      { href: '/customers',     label: 'Customers',       icon: Users },
      { href: '/users',         label: 'User Management', icon: ShieldCheck },
      { href: '/staff',         label: 'Staff',           icon: UserCog },
      { href: '/reviews',       label: 'Reviews',         icon: Star },
      { href: '/wishlists',     label: 'Wishlists',       icon: Heart },
    ],
  },
  {
    label: 'Insights & Admin',
    routes: [
      { href: '/analytics',     label: 'Analytics',       icon: BarChart3 },
      { href: '/reports',       label: 'Reports',         icon: FileText },
      { href: '/notifications', label: 'Notifications',   icon: Bell },
      { href: '/announcements', label: 'Announcements',   icon: Megaphone },
      { href: '/settings',      label: 'Settings',        icon: Settings },
    ],
  },
];

const allRoutes = routeGroups.flatMap(g => g.routes);

// ── Role presets ───────────────────────────────────────────────────

const ROLE_PRESETS: Record<string, string[]> = {
  staff: ['/pos/dashboard', '/pos/sales', '/orders', '/inventory'],
  therapist: ['/bookings', '/dashboard'],
  customer: [],
};

// ── Small helpers ──────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-12 h-12 text-lg' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
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
  return (
    <div className={`${sz} ${colors[name.charCodeAt(0) % colors.length]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const ROLE_CONFIG: Record<string, { bg: string; text: string; icon: any; label: string; desc: string }> = {
  admin:     { bg: 'bg-purple-100', text: 'text-purple-700', icon: ShieldCheck, label: 'Admin',     desc: 'Full access to everything' },
  staff:     { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: UserCog,    label: 'Staff',     desc: 'POS + custom permissions' },
  therapist: { bg: 'bg-teal-100',   text: 'text-teal-700',   icon: UserIcon,   label: 'Therapist', desc: 'Bookings + custom permissions' },
  customer:  { bg: 'bg-gray-100',   text: 'text-gray-600',   icon: Users,      label: 'Customer',  desc: 'No admin panel access' },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.customer;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PermissionsBadge({ user }: { user: User }) {
  if (user.role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
        <ShieldCheck className="w-3 h-3" /> Full access
      </span>
    );
  }
  const count = user.permissions?.length ?? 0;
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <Lock className="w-3 h-3" /> Role defaults
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
      <Key className="w-3 h-3" /> {count} route{count !== 1 ? 's' : ''}
    </span>
  );
}

// ── Create user modal ──────────────────────────────────────────────

function CreateUserModal({
  onSave,
  onClose,
}: {
  onSave: (data: { name: string; email: string; password: string; role: string; permissions: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<string>('staff');
  const [permissions, setPermissions] = useState<string[]>(() => ROLE_PRESETS['staff'] ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  function handleRoleChange(r: string) {
    setRole(r);
    setPermissions(ROLE_PRESETS[r] ?? []);
  }

  function togglePerm(href: string) {
    setPermissions(prev => prev.includes(href) ? prev.filter(p => p !== href) : [...prev, href]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await onSave({ name, email, password, role, permissions });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  const groupsWithSelection = routeGroups.map(g => ({
    ...g,
    selected: g.routes.filter(r => permissions.includes(r.href)).length,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <p className="font-semibold text-gray-900">Create User</p>
            <p className="text-xs text-gray-500">Add a new staff, therapist or admin account</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

            {/* Basic info */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Amara Okafor"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="amara@example.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG[string]][]).map(([r, cfg]) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${role === r ? 'border-[#C9A84C] bg-[#C9A84C]/5' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <cfg.icon className={`w-4 h-4 ${role === r ? 'text-[#C9A84C]' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${role === r ? 'text-[#C9A84C]' : 'text-gray-700'}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 pl-6">{cfg.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions */}
            {role !== 'admin' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-gray-400" />
                    Route Permissions
                    {permissions.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#C9A84C] text-white text-xs rounded-full">{permissions.length}</span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    {ROLE_PRESETS[role]?.length > 0 && (
                      <button type="button" onClick={() => setPermissions(ROLE_PRESETS[role])} className="text-xs text-blue-600 hover:underline px-1">
                        Use {role} defaults
                      </button>
                    )}
                    <button type="button" onClick={() => setPermissions(allRoutes.map(r => r.href))} className="text-xs text-[#C9A84C] hover:underline px-1">All</button>
                    <button type="button" onClick={() => setPermissions([])} className="text-xs text-gray-400 hover:underline px-1">None</button>
                  </div>
                </div>
                <div className="border rounded-xl overflow-hidden divide-y">
                  {groupsWithSelection.map(group => (
                    <div key={group.label}>
                      <button
                        type="button"
                        onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.label}</span>
                        <div className="flex items-center gap-2">
                          {group.selected > 0 && <span className="text-xs text-[#C9A84C] font-medium">{group.selected}/{group.routes.length}</span>}
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openGroup === group.label ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {openGroup === group.label && (
                        <div className="px-2 py-1 bg-white">
                          {group.routes.map(route => {
                            const checked = permissions.includes(route.href);
                            return (
                              <label key={route.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#C9A84C]/5' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={checked} onChange={() => togglePerm(route.href)} className="rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]" />
                                <route.icon className={`w-4 h-4 flex-shrink-0 ${checked ? 'text-[#C9A84C]' : 'text-gray-400'}`} />
                                <span className={`text-sm flex-1 ${checked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{route.label}</span>
                                <code className="text-[10px] text-gray-400">{route.href}</code>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* POS Actions */}
                <div className="mt-3 space-y-2">
                  {POS_ACTIONS.map(action => {
                    const granted = permissions.includes(action.key);
                    return (
                      <label key={action.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${granted ? 'border-[#C9A84C] bg-[#C9A84C]/5' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}>
                        <input type="checkbox" checked={granted} onChange={() => togglePerm(action.key)} className="rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]" />
                        <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                          <action.icon className={`w-4 h-4 ${action.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${granted ? 'text-gray-900' : 'text-gray-700'}`}>{action.label}</p>
                          <p className="text-xs text-gray-400">{action.desc}</p>
                        </div>
                        {granted && <Check className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#B8953F] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── User modal ─────────────────────────────────────────────────────

function UserModal({
  user,
  onSave,
  onResetPassword,
  onResetPin,
  onClose,
}: {
  user: User;
  onSave: (data: { role: string; isActive: boolean; permissions: string[] }) => Promise<void>;
  onResetPassword: (id: string, password: string) => Promise<void>;
  onResetPin: (id: string, pin: string) => Promise<void>;
  onClose: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive ?? true);
  const [permissions, setPermissions] = useState<string[]>(user.permissions ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [showResetPw, setShowResetPw] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [showResetPin, setShowResetPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState('');

  // When role changes to a non-admin role, suggest its preset if permissions are empty
  function handleRoleChange(r: typeof role) {
    setRole(r);
    if (r !== 'admin' && permissions.length === 0 && ROLE_PRESETS[r]?.length) {
      setPermissions(ROLE_PRESETS[r]);
    }
  }

  function togglePerm(href: string) {
    setPermissions(prev => prev.includes(href) ? prev.filter(p => p !== href) : [...prev, href]);
  }

  function applyPreset() {
    setPermissions(ROLE_PRESETS[role] ?? []);
  }

  function clearAll() { setPermissions([]); }
  function grantAll() { setPermissions(allRoutes.map(r => r.href)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave({ role, isActive, permissions });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 6) { setResetMsg('Password must be at least 6 characters'); return; }
    setResetLoading(true);
    setResetMsg('');
    try {
      await onResetPassword(user._id, newPassword);
      setNewPassword('');
      setShowResetPw(false);
      setResetMsg('Password updated');
    } catch (err: any) {
      setResetMsg(err.message ?? 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetPin() {
    if (!/^\d{4,8}$/.test(newPin)) { setPinMsg('PIN must be 4–8 digits'); return; }
    setPinLoading(true);
    setPinMsg('');
    try {
      await onResetPin(user._id, newPin);
      setNewPin('');
      setShowResetPin(false);
      setPinMsg('PIN updated');
    } catch (err: any) {
      setPinMsg(err.message ?? 'Failed to update PIN');
    } finally {
      setPinLoading(false);
    }
  }

  const groupsWithSelection = routeGroups.map(g => ({
    ...g,
    selected: g.routes.filter(r => permissions.includes(r.href)).length,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="sm" />
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
            )}

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Access Level</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG[string]][]).map(([r, cfg]) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r as User['role'])}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      role === r
                        ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <cfg.icon className={`w-4 h-4 ${role === r ? 'text-[#C9A84C]' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${role === r ? 'text-[#C9A84C]' : 'text-gray-700'}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 pl-6">{cfg.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions — hidden for admin */}
            {role !== 'admin' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-gray-400" />
                    Route Permissions
                    {permissions.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#C9A84C] text-white text-xs rounded-full">{permissions.length}</span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    {ROLE_PRESETS[role]?.length > 0 && (
                      <button type="button" onClick={applyPreset} className="text-xs text-blue-600 hover:underline px-1">
                        Use {role} defaults
                      </button>
                    )}
                    <button type="button" onClick={grantAll} className="text-xs text-[#C9A84C] hover:underline px-1">All</button>
                    <button type="button" onClick={clearAll} className="text-xs text-gray-400 hover:underline px-1">None</button>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden divide-y">
                  {groupsWithSelection.map(group => (
                    <div key={group.label}>
                      <button
                        type="button"
                        onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.label}</span>
                        <div className="flex items-center gap-2">
                          {group.selected > 0 && (
                            <span className="text-xs text-[#C9A84C] font-medium">{group.selected}/{group.routes.length}</span>
                          )}
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openGroup === group.label ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {openGroup === group.label && (
                        <div className="px-2 py-1 bg-white">
                          {group.routes.map(route => {
                            const checked = permissions.includes(route.href);
                            return (
                              <label
                                key={route.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#C9A84C]/5' : 'hover:bg-gray-50'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePerm(route.href)}
                                  className="rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]"
                                />
                                <route.icon className={`w-4 h-4 flex-shrink-0 ${checked ? 'text-[#C9A84C]' : 'text-gray-400'}`} />
                                <span className={`text-sm flex-1 ${checked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{route.label}</span>
                                <code className="text-[10px] text-gray-400">{route.href}</code>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {permissions.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> No custom permissions — role defaults apply
                  </p>
                )}
              </div>
            )}

            {/* POS Action Permissions — shown for non-admin only */}
            {role !== 'admin' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  POS Actions
                </label>
                <div className="space-y-2">
                  {POS_ACTIONS.map(action => {
                    const granted = permissions.includes(action.key);
                    return (
                      <label
                        key={action.key}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          granted ? 'border-[#C9A84C] bg-[#C9A84C]/5' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={granted}
                          onChange={() => togglePerm(action.key)}
                          className="rounded border-gray-300 text-[#C9A84C] focus:ring-[#C9A84C]"
                        />
                        <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                          <action.icon className={`w-4 h-4 ${action.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${granted ? 'text-gray-900' : 'text-gray-700'}`}>{action.label}</p>
                          <p className="text-xs text-gray-400">{action.desc}</p>
                        </div>
                        {granted && <Check className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Account active */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Account Active</p>
                <p className="text-xs text-gray-400 mt-0.5">Inactive users cannot log in</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(a => !a)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Reset password */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => { setShowResetPw(s => !s); setResetMsg(''); setNewPassword(''); }}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <KeyRound className="w-4 h-4 text-gray-400" />
                  Reset Password
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showResetPw ? 'rotate-180' : ''}`} />
              </button>
              {showResetPw && (
                <div className="p-4 space-y-3 bg-white">
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password (min. 6 chars)"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
                    />
                    <button type="button" onClick={() => setShowNewPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {resetMsg && (
                    <p className={`text-xs ${resetMsg === 'Password updated' ? 'text-green-600' : 'text-red-500'}`}>{resetMsg}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetLoading || !newPassword}
                    className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Update Password
                  </button>
                </div>
              )}
            </div>

            {/* Reset POS PIN — only for staff/admin */}
            {(user.role === 'staff' || user.role === 'admin') && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setShowResetPin(s => !s); setPinMsg(''); setNewPin(''); }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    Reset POS PIN
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showResetPin ? 'rotate-180' : ''}`} />
                </button>
                {showResetPin && (
                  <div className="p-4 space-y-3 bg-white">
                    <p className="text-xs text-gray-400">Enter a 4–8 digit PIN the staff member will use to log into the POS terminal.</p>
                    <input
                      type="number"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="e.g. 1234"
                      maxLength={8}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C] tracking-widest font-mono"
                    />
                    {pinMsg && (
                      <p className={`text-xs ${pinMsg === 'PIN updated' ? 'text-green-600' : 'text-red-500'}`}>{pinMsg}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleResetPin}
                      disabled={pinLoading || !newPin}
                      className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {pinLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Set PIN
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#B8953F] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete modal ───────────────────────────────────────────────────

function DeleteModal({ user, onConfirm, onClose }: { user: User; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    try { await onConfirm(); onClose(); } finally { setLoading(false); }
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
          Delete <span className="font-semibold">{user.name}</span>? All their access and data will be removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={go} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [activeCount, setActiveCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const loadUsers = useCallback(async (pg = page, q = search, role = roleFilter) => {
    setLoading(true);
    try {
      const data = await api.users.getAll({ page: pg, limit: 15, role: role || undefined, search: q || undefined });
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.roleCounts) setRoleCounts(data.roleCounts);
      if (data.activeCount !== undefined) setActiveCount(data.activeCount);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { loadUsers(page, search, roleFilter); }, [page, roleFilter]);

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(1); loadUsers(1, val, roleFilter); }, 350);
  }

  function handleRoleFilter(r: string) {
    setRoleFilter(r);
    setPage(1);
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(data: { role: string; isActive: boolean; permissions: string[] }) {
    if (!editingUser) return;
    await api.users.update(editingUser._id, {
      role: data.role,
      isActive: data.isActive,
      permissions: data.role === 'admin' ? [] : data.permissions,
    });
    showToast('User access updated');
    loadUsers(page, search, roleFilter);
  }

  async function handleCreate(data: { name: string; email: string; password: string; role: string; permissions: string[] }) {
    await api.users.create(data);
    showToast('User created');
    loadUsers(page, search, roleFilter);
  }

  async function handleResetPassword(id: string, password: string) {
    await api.users.resetPassword(id, password);
    showToast('Password updated');
  }

  async function handleResetPin(id: string, pin: string) {
    await api.users.resetPin(id, pin);
    showToast('POS PIN updated');
  }

  async function handleDelete() {
    if (!deletingUser) return;
    await api.users.delete(deletingUser._id);
    showToast('User deleted');
    if (users.length === 1 && page > 1) setPage(p => p - 1);
    else loadUsers(page, search, roleFilter);
  }

  async function handleQuickToggle(user: User) {
    try {
      await api.users.toggleActive(user._id);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
      showToast(`${user.name} ${user.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      showToast('Failed to update', 'error');
    }
  }

  const sortedUsers = [...users].sort((a, b) =>
    sortOrder === 'asc'
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#C9A84C]" /> User Access Management
          </h1>
          <p className="text-gray-500 mt-0.5">Control who can access the admin panel and what they can do</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#B8953F] transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Users', value: total, color: 'text-gray-900' },
          { label: 'Admins',      value: roleCounts.admin ?? 0,     color: 'text-purple-600' },
          { label: 'Staff',       value: (roleCounts.staff ?? 0) + (roleCounts.therapist ?? 0), color: 'text-blue-600' },
          { label: 'Active',      value: activeCount, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/20 focus:border-[#C9A84C]"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {[{ v: '', l: 'All' }, { v: 'admin', l: 'Admin' }, { v: 'staff', l: 'Staff' }, { v: 'therapist', l: 'Therapist' }, { v: 'customer', l: 'Customer' }].map(f => (
              <button
                key={f.v}
                onClick={() => handleRoleFilter(f.v)}
                className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${roleFilter === f.v ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f.l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
          </button>
          <button
            onClick={() => loadUsers(page, search, roleFilter)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Permissions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Last Login</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto opacity-20 mb-2" />
                    <p className="text-sm">No users found</p>
                  </td>
                </tr>
              ) : sortedUsers.map(user => (
                <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <PermissionsBadge user={user} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleQuickToggle(user)}
                      title={user.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70 ${
                        user.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.isActive !== false ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {user.isActive !== false ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">Never</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total} users
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm shadow-lg z-50 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.type === 'error' ? <X className="w-4 h-4 text-red-200" /> : <Check className="w-4 h-4 text-green-400" />}
          {toast.msg}
        </div>
      )}

      {creating && (
        <CreateUserModal onSave={handleCreate} onClose={() => setCreating(false)} />
      )}
      {editingUser && (
        <UserModal user={editingUser} onSave={handleSave} onResetPassword={handleResetPassword} onResetPin={handleResetPin} onClose={() => setEditingUser(null)} />
      )}
      {deletingUser && (
        <DeleteModal user={deletingUser} onConfirm={handleDelete} onClose={() => setDeletingUser(null)} />
      )}
    </AdminLayout>
  );
}
