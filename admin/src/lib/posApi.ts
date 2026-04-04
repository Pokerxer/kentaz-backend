const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

function getPosToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pos_token');
}

export function getPosUser(): PosUser | null {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem('pos_user');
  return s ? JSON.parse(s) : null;
}

export function savePosSession(user: PosUser, token: string) {
  localStorage.setItem('pos_token', token);
  localStorage.setItem('pos_user', JSON.stringify(user));
}

export function clearPosSession() {
  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_user');
}

async function posRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getPosToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> || {}) } });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || 'An error occurred');
  }
  return response.json();
}

export const posApi = {
  login: (email: string, password: string) =>
    posRequest<{ user: PosUser; token: string }>('/api/pos/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProducts: (params?: { search?: string; category?: string }) => {
    const filtered = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const query = new URLSearchParams(filtered as Record<string, string>).toString();
    return posRequest<PosProduct[]>(`/api/pos/products${query ? '?' + query : ''}`);
  },

  createSale: (data: CreateSaleInput) =>
    posRequest<Sale>('/api/pos/sales', { method: 'POST', body: JSON.stringify(data) }),

  getSales: (params?: { page?: number; limit?: number; date?: string; status?: string; cashierId?: string; search?: string; registerId?: string }) => {
    const filtered = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== ''));
    const query = new URLSearchParams(filtered as Record<string, string>).toString();
    return posRequest<{ sales: Sale[]; total: number; page: number; totalPages: number }>(`/api/pos/sales${query ? '?' + query : ''}`);
  },

  getSummary: () =>
    posRequest<SalesSummary>('/api/pos/sales/summary'),

  getSaleById: (id: string) =>
    posRequest<Sale>(`/api/pos/sales/${id}`),

  voidSale: (id: string, reason: string) =>
    posRequest<Sale>(`/api/pos/sales/${id}/void`, { method: 'POST', body: JSON.stringify({ reason }) }),

  refundItems: (id: string, items: { saleItemIndex: number; quantity: number }[], reason: string) =>
    posRequest<{ original: Sale; refund: Sale }>(`/api/pos/sales/${id}/refund`, { method: 'POST', body: JSON.stringify({ items, reason }) }),

  openRegister: (openingBalance: number) =>
    posRequest<Register>('/api/pos/register/open', { method: 'POST', body: JSON.stringify({ openingBalance }) }),

  getCurrentRegister: () =>
    posRequest<Register | null>('/api/pos/register/current'),

  getRegisterSessions: (limit = 20) =>
    posRequest<RegisterSession[]>(`/api/pos/register/sessions?limit=${limit}`),

  recordCashMovement: (data: { registerId: string; type: 'in' | 'out'; amount: number; reason: string }) =>
    posRequest<CashMovement>('/api/pos/register/cash', { method: 'POST', body: JSON.stringify(data) }),

  getRegisterReport: (id: string) =>
    posRequest<RegisterReport>(`/api/pos/register/${id}/report`),

  closeRegister: (data: { registerId: string; closingBalance?: number; notes?: string }) =>
    posRequest<{ register: Register; expectedCash: number; difference: number }>('/api/pos/register/close', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleFavorite: (productId: string) =>
    posRequest<{ isFavorite: boolean }>(`/api/pos/products/${productId}/favorite`, { method: 'PUT' }),
};

function adminToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('admin_token') ?? '' : '';
}

export const staffApi = {
  getAll: () =>
    posRequest<StaffMember[]>('/api/admin/staff', { headers: { Authorization: `Bearer ${adminToken()}` } }),

  getById: (id: string) =>
    posRequest<{ staff: StaffMember; stats: StaffStats }>(`/api/admin/staff/${id}`, {
      headers: { Authorization: `Bearer ${adminToken()}` },
    }),

  create: (data: { name: string; email: string; password: string }) =>
    posRequest<StaffMember>('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${adminToken()}` },
    }),

  update: (id: string, data: { name?: string; email?: string; isActive?: boolean; password?: string }) =>
    posRequest<StaffMember>(`/api/admin/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${adminToken()}` },
    }),

  delete: (id: string) =>
    posRequest<{ message: string }>(`/api/admin/staff/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken()}` },
    }),
};

// ── Types ──────────────────────────────────────────────────────

export interface PosUser {
  _id: string;
  name: string;
  email: string;
  role: 'staff' | 'admin';
  avatar?: string;
  permissions?: string[];
}

// POS action permission keys
export const POS_PERMS = {
  PRICE_OVERRIDE: 'pos:price_override',
  REFUND:         'pos:refund',
  VOID:           'pos:void',
} as const;

/** Returns true if the user is admin OR has the specified POS permission */
export function hasPosPermission(user: PosUser | null, perm: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.includes(perm) ?? false;
}

export interface PosVariant {
  size: string;
  color: string;
  price: number;
  costPrice?: number;
  stock?: number;
  sku?: string;
}

export interface PosProduct {
  _id: string;
  name: string;
  slug: string;
  category: string;
  images: { url: string }[];
  variants: PosVariant[];
  tags: string[];
  featured: boolean;
  barcode?: string;
  isFavorite?: boolean;
  ageRestricted?: boolean;
  minStock?: number;
}

export interface CartItem {
  product: PosProduct;
  variantIndex: number;
  quantity: number;
  price: number;
  variantLabel: string;
}

export interface CreateSaleInput {
  items: { productId: string; variantIndex: number; quantity: number; customPrice?: number }[];
  discount?: number;
  discountType?: 'fixed' | 'percent';
  paymentMethod: 'cash' | 'card' | 'transfer';
  amountPaid?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  registerId?: string;
}

export interface SaleItem {
  product: { _id: string; name: string; images: { url: string }[] };
  productName: string;
  variantIndex: number;
  variantLabel: string;
  quantity: number;
  price: number;
  costPrice: number;
  total: number;
  refundedQty: number;
}

export interface Sale {
  _id: string;
  receiptNumber: string;
  type: 'sale' | 'refund';
  originalSale?: string | { _id: string; receiptNumber: string };
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountType: 'fixed' | 'percent';
  discountAmount: number;
  total: number;           // negative for refund records
  paymentMethod: 'cash' | 'card' | 'transfer';
  amountPaid: number;      // negative for refund records
  change: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  cashier: { _id: string; name: string; email: string };
  cashierName: string;
  status: 'completed' | 'voided';
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
}

export interface SalesSummary {
  totalRevenue: number;
  totalCount: number;
  totalRefunds: number;
  totalItems: number;
  byMethod: { cash: number; card: number; transfer: number };
  date: string;
}

export interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: 'staff';
  isActive: boolean;
  createdAt: string;
}

export interface StaffStats {
  allTime: { totalRevenue: number; totalSales: number; totalItems: number };
  today: { totalRevenue: number; totalSales: number };
}

export interface RegisterSession extends Register {
  liveTotalSales?: number;
  liveTotalRevenue?: number;
  liveRefunds?: number;
}

export interface Register {
  _id: string;
  cashier: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedCash?: number;
  difference?: number;
  status: 'open' | 'closed';
  totalSales: number;
  totalRevenue: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalCashIn: number;
  totalCashOut: number;
  notes?: string;
  createdAt: string;
}

export interface CashMovement {
  _id: string;
  register: string;
  type: 'in' | 'out';
  amount: number;
  reason: string;
  performedByName?: string;
  createdAt: string;
}

export interface RegisterReport {
  register: Register;
  totalSales: number;
  totalRefunds: number;
  totalRevenue: number;
  totalItems: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  movements: CashMovement[];
  sales: Sale[];  // all (sales + refunds), populated
}
