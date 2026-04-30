const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kentaz-backend.vercel.app';

class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new ApiError(error.error || 'An error occurred', response.status);
  }
  
  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    
    register: (name: string, email: string, password: string) =>
      request<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    
    getMe: () =>
      request<User>('/api/auth/me'),
  },
  
  products: {
    getAll: (params?: { page?: number; limit?: number; status?: string; search?: string; category?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ products: Product[]; total: number; page: number; totalPages: number }>(`/api/admin/products?${query}`);
    },

    getById: (id: string) =>
      request<Product>(`/api/admin/products/${id}`),

    create: (product: Partial<Product>) =>
      request<Product>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(product),
      }),

    update: (id: string, product: Partial<Product>) =>
      request<Product>(`/api/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(product),
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/api/admin/products/${id}`, {
        method: 'DELETE',
      }),

    parseCSV: (csv: string) =>
      request<{ products: Record<string, string>[]; count: number }>('/api/admin/products/parse-csv', {
        method: 'POST',
        body: JSON.stringify({ csv }),
      }),

    import: (products: Record<string, string>[]) =>
      request<{ success: number; failed: number; errors: string[] }>('/api/admin/products/import', {
        method: 'POST',
        body: JSON.stringify({ products }),
      }),

    parseFile: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`${API_URL}/api/admin/products/parse-file`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse file');
      }
      return res.json() as Promise<{ products: Record<string, string>[]; count: number }>;
    },

    importFile: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`${API_URL}/api/admin/products/import-file`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import file');
      }
      return res.json() as Promise<{ success: number; failed: number; errors: string[] }>;
    },

    getSalesStats: (id: string) =>
      request<{
        totalSold: number;
        totalReturned: number;
        netSold: number;
        totalRevenue: number;
        totalCost: number;
        grossProfit: number;
        byVariant: Record<number, { sold: number; returned: number; revenue: number }>;
      }>(`/api/pos/admin/products/${id}/sales-stats`),
  },

  categories: {
    getAll: () =>
      request<any[]>('/api/admin/categories'),

    getAllAdmin: () =>
      request<AdminCategory[]>('/api/admin/categories/admin/all'),

    create: (category: { name: string; description?: string; image?: string; isActive?: boolean; sortOrder?: number }) =>
      request<any>('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      }),
    
    update: (id: string, category: { name?: string; description?: string; image?: string; isActive?: boolean; sortOrder?: number }) =>
      request<any>(`/api/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(category),
      }),
    
    delete: (id: string) =>
      request<{ message: string }>(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  shipping: {
    getAll: () =>
      request<{ zones: ShippingZone[]; settings: ShippingSettings }>('/api/admin/shipping'),

    updateSettings: (data: Partial<ShippingSettings>) =>
      request<ShippingSettings>('/api/admin/shipping/settings', { method: 'PUT', body: JSON.stringify(data) }),

    createZone: (data: Partial<ShippingZone>) =>
      request<ShippingZone>('/api/admin/shipping/zones', { method: 'POST', body: JSON.stringify(data) }),

    updateZone: (id: string, data: Partial<ShippingZone>) =>
      request<ShippingZone>(`/api/admin/shipping/zones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    deleteZone: (id: string) =>
      request<{ message: string }>(`/api/admin/shipping/zones/${id}`, { method: 'DELETE' }),

    calculate: (state: string, city: string, cartTotal: number) =>
      request<{ available: boolean; zone?: { _id: string; name: string }; methods?: any[]; pickup?: any; processingDays?: number; checkoutNote?: string; error?: string }>(
        '/api/admin/shipping/calculate',
        { method: 'POST', body: JSON.stringify({ state, city, cartTotal }) }
      ),
  },

  giftCards: {
    getAll: (params?: { search?: string; status?: string; page?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '')) as Record<string, string>
      ).toString();
      return request<{ cards: GiftCard[]; total: number; stats: GiftCardStats }>(`/api/admin/gift-cards${query ? '?' + query : ''}`);
    },

    getById: (id: string) =>
      request<GiftCard>(`/api/admin/gift-cards/${id}`),

    create: (data: {
      code?: string; initialBalance: number;
      recipientName?: string; recipientEmail?: string; note?: string;
      purchaserName?: string; purchaserEmail?: string;
      expiryDate?: string | null; isActive?: boolean;
    }) => request<GiftCard>('/api/admin/gift-cards', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: Partial<GiftCard> & { adjustmentReason?: string }) =>
      request<GiftCard>(`/api/admin/gift-cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: string) =>
      request<{ message: string }>(`/api/admin/gift-cards/${id}`, { method: 'DELETE' }),

    credit: (id: string, amount: number, description?: string) =>
      request<GiftCard>(`/api/admin/gift-cards/${id}/credit`, { method: 'POST', body: JSON.stringify({ amount, description }) }),

    validate: (code: string, amount?: number) =>
      request<{ valid: boolean; error?: string; card?: GiftCard; usableAmount?: number }>(
        '/api/admin/gift-cards/validate',
        { method: 'POST', body: JSON.stringify({ code, amount }) }
      ),

    generateCode: () =>
      request<{ code: string }>('/api/admin/gift-cards/generate-code'),
  },

  discounts: {
    getAll: (params?: { search?: string; status?: string }) => {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v)) as Record<string, string>
      ).toString();
      return request<Discount[]>(`/api/admin/discounts${query ? '?' + query : ''}`);
    },

    create: (data: Omit<Discount, '_id' | 'usageCount' | 'createdAt' | 'updatedAt'>) =>
      request<Discount>('/api/admin/discounts', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: Partial<Omit<Discount, '_id' | 'usageCount' | 'createdAt' | 'updatedAt'>>) =>
      request<Discount>(`/api/admin/discounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: string) =>
      request<{ message: string }>(`/api/admin/discounts/${id}`, { method: 'DELETE' }),

    resetUsage: (id: string) =>
      request<Discount>(`/api/admin/discounts/${id}/reset-usage`, { method: 'POST' }),

    validate: (code: string, cartTotal: number, cartCategories?: string[], cartProductIds?: string[]) =>
      request<{ valid: boolean; error?: string; discount?: Discount; discountAmount?: number }>(
        '/api/admin/discounts/validate',
        { method: 'POST', body: JSON.stringify({ code, cartTotal, cartCategories, cartProductIds }) }
      ),
  },

  heroes: {
    getAll: () => request<Hero[]>('/api/heroes/all'),
    getPublic: () => request<Hero[]>('/api/heroes'),
    create: (data: Omit<Hero, '_id' | 'createdAt' | 'updatedAt'>) =>
      request<Hero>('/api/admin/heroes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Hero>) =>
      request<Hero>(`/api/admin/heroes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/admin/heroes/${id}`, { method: 'DELETE' }),
    reorder: (ids: string[]) =>
      request<{ message: string }>('/api/admin/heroes/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  },

  orders: {
    getAll: (params?: { page?: number; limit?: number; status?: string; search?: string; startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '')) as Record<string, string>
      ).toString();
      return request<{ orders: Order[]; total: number; page: number; totalPages: number; statusCounts: OrderStatusCounts; totalRevenue: number }>(
        `/api/store/orders/admin/all${query ? '?' + query : ''}`
      );
    },

    getById: (id: string) =>
      request<Order>(`/api/store/orders/${id}`),

    updateStatus: (id: string, status: string) =>
      request<Order>(`/api/store/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },
  
  users: {
    getAll: (params?: { page?: number; limit?: number; role?: string; search?: string }) => {
      const filtered = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== ''));
      const query = new URLSearchParams(filtered as Record<string, string>).toString();
      return request<{ users: User[]; total: number; totalPages: number; roleCounts?: Record<string, number>; activeCount?: number }>(`/api/admin/users?${query}`);
    },

    getById: (id: string) =>
      request<{ user: User; orders: CustomerOrder[]; bookings: CustomerBooking[]; stats: CustomerStats }>(`/api/admin/users/${id}`),

    create: (data: { name: string; email: string; password: string; role: string; permissions?: string[] }) =>
      request<User>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { role?: string; isActive?: boolean; permissions?: string[] }) =>
      request<User>(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    resetPassword: (id: string, password: string) =>
      request<{ message: string }>(`/api/admin/users/${id}/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      }),

    resetPin: (id: string, pin: string) =>
      request<{ message: string }>(`/api/admin/staff/${id}/pin`, {
        method: 'PUT',
        body: JSON.stringify({ pin }),
      }),

    toggleActive: (id: string) =>
      request<{ isActive: boolean }>(`/api/admin/users/${id}/toggle-active`, { method: 'PATCH' }),

    updateRole: (id: string, role: 'customer' | 'admin' | 'therapist' | 'staff') =>
      request<User>(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),

    updatePermissions: (id: string, permissions: string[]) =>
      request<User>(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions }),
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  },
  
  bookings: {
    getAll: (params?: { page?: number; limit?: number; status?: string; serviceType?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<Booking[]>(`/api/store/bookings/admin/bookings?${query}`);
    },
    
    getById: (id: string) =>
      request<Booking>(`/api/store/bookings/${id}`),
    
    updateStatus: (id: string, status: string) =>
      request<Booking>(`/api/store/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },

  availability: {
    getSettings: (serviceType: string) =>
      request<AvailabilitySettings>(`/api/admin/availability/${serviceType}`),

    updateSettings: (serviceType: string, data: { workingDays?: number[]; timeSlots?: string[]; slotDuration?: number }) =>
      request<AvailabilitySettings>(`/api/admin/availability/${serviceType}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getCalendar: (serviceType: string, month: string) =>
      request<{ settings: AvailabilitySettings; bookings: Booking[] }>(
        `/api/admin/availability/${serviceType}/calendar?month=${month}`
      ),

    blockDate: (serviceType: string, date: string, reason?: string) =>
      request<AvailabilitySettings>(`/api/admin/availability/${serviceType}/block-date`, {
        method: 'POST',
        body: JSON.stringify({ date, reason }),
      }),

    unblockDate: (serviceType: string, date: string) =>
      request<AvailabilitySettings>(`/api/admin/availability/${serviceType}/block-date`, {
        method: 'DELETE',
        body: JSON.stringify({ date }),
      }),

    blockSlot: (serviceType: string, date: string, time: string, reason?: string) =>
      request<AvailabilitySettings>(`/api/admin/availability/${serviceType}/block-slot`, {
        method: 'POST',
        body: JSON.stringify({ date, time, reason }),
      }),

    unblockSlot: (serviceType: string, date: string, time: string) =>
      request<AvailabilitySettings>(`/api/admin/availability/${serviceType}/block-slot`, {
        method: 'DELETE',
        body: JSON.stringify({ date, time }),
      }),
  },

  dashboard: {
    getStats: (period: '7d' | '30d' | '90d' = '7d') =>
      request<DashboardStats>(`/api/admin/dashboard/stats?period=${period}`),
  },
  
  inventory: {
    getAll: (params?: { page?: number; limit?: number; productId?: string; type?: string; startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ inventory: InventoryRecord[]; total: number; page: number; totalPages: number }>(`/api/admin/inventory?${query}`);
    },
    
    getStats: () =>
      request<InventoryStats>('/api/admin/inventory/stats'),

    getAnalytics: (days = 30) =>
      request<InventoryAnalytics>(`/api/admin/inventory/analytics?days=${days}`),
    
    getByProduct: (productId: string) =>
      request<{ history: InventoryRecord[]; currentStock: Record<string, number>; product: { _id: string; name: string; slug: string; images: { url: string }[] } }>(`/api/admin/inventory/product/${productId}`),
    
    add: (data: {
      productId: string;
      variantIndex?: number;
      type: 'in' | 'out' | 'adjustment' | 'return' | 'damage' | 'initial';
      quantity: number;
      notes?: string;
      reference?: string;
      referenceType?: string;
    }) =>
      request<InventoryRecord>('/api/admin/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    adjust: (data: {
      productId: string;
      variantIndex?: number;
      newStockLevel: number;
      notes?: string;
    }) =>
      request<InventoryRecord>('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    bulkUpdate: (items: { productId: string; variantIndex?: number; stock: number; notes?: string }[]) =>
      request<{ results: { productId: string; success: boolean; previousStock: number; newStock: number }[] }>('/api/admin/inventory/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),

    getLowStock: (threshold?: number) => {
      const query = threshold ? `?threshold=${threshold}` : '';
      return request<{ items: LowStockItem[]; total: number }>(`/api/admin/inventory/low-stock${query}`);
    },

    saveStockCount: (data: {
      items: {
        productId: string; productName?: string; variantIndex: number; variantLabel?: string;
        expectedStock: number; countedStock: number; variance: number; notes?: string;
      }[];
      notes?: string;
    }) =>
      request<StockCountSession>('/api/admin/inventory/stock-count', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getStockCountHistory: (page = 1, limit = 20) =>
      request<{ counts: StockCountSession[]; total: number; page: number; totalPages: number }>(
        `/api/admin/inventory/stock-count?page=${page}&limit=${limit}`
      ),

    getStockCountById: (id: string) =>
      request<StockCountSession>(`/api/admin/inventory/stock-count/${id}`),

    getLastCounted: () =>
      request<Record<string, string>>('/api/admin/inventory/last-counted'),
  },

  upload: {
    image: async (file: File): Promise<{ url: string; publicId: string }> => {
      const token = await getAuthToken();
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_URL}/api/admin/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new ApiError(err.error || 'Upload failed', res.status);
      }
      return res.json();
    },
    deleteImage: (publicId: string) =>
      request<{ message: string }>('/api/admin/upload', {
        method: 'DELETE',
        body: JSON.stringify({ publicId }),
      }),
  },

  analytics: {
    get: (period: string = '30d') =>
      request<AnalyticsData>(`/api/admin/analytics?period=${period}`),
  },

  reviews: {
    getAll: (params?: { page?: number; limit?: number; product?: string; rating?: number; search?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ reviews: Review[]; total: number; page: number; totalPages: number }>(`/api/admin/reviews?${query}`);
    },
    getStats: () =>
      request<ReviewStats>('/api/admin/reviews/stats'),
    get: (id: string) =>
      request<Review>(`/api/admin/reviews/${id}`),
    update: (id: string, data: { rating?: number; comment?: string }) =>
      request<Review>(`/api/admin/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/admin/reviews/${id}`, { method: 'DELETE' }),
  },

  wishlists: {
    getAll: (params?: { page?: number; limit?: number; search?: string; sort?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ users: WishlistUser[]; total: number; page: number; totalPages: number }>(`/api/admin/wishlists?${query}`);
    },
    getStats: () =>
      request<WishlistStats>('/api/admin/wishlists/stats'),
    getUserWishlist: (userId: string) =>
      request<WishlistUser>(`/api/admin/wishlists/user/${userId}`),
    removeProduct: (userId: string, productId: string) =>
      request<{ message: string; wishlistCount: number }>(`/api/admin/wishlists/user/${userId}/product/${productId}`, { method: 'DELETE' }),
    clearUserWishlist: (userId: string) =>
      request<{ message: string }>(`/api/admin/wishlists/user/${userId}`, { method: 'DELETE' }),
  },

  reports: {
    sales: (params: { from?: string; to?: string; groupBy?: 'day' | 'month' }) =>
      request<ReportSalesData>(`/api/admin/reports/sales?${new URLSearchParams(params as Record<string,string>)}`),
    products: (params: { from?: string; to?: string }) =>
      request<ReportProductsData>(`/api/admin/reports/products?${new URLSearchParams(params as Record<string,string>)}`),
    orders: (params: { from?: string; to?: string; status?: string }) =>
      request<ReportOrdersData>(`/api/admin/reports/orders?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v)) as Record<string,string>)}`),
    customers: (params: { from?: string; to?: string }) =>
      request<ReportCustomersData>(`/api/admin/reports/customers?${new URLSearchParams(params as Record<string,string>)}`),
    inventory: (params?: { filter?: 'all' | 'low' | 'out' }) =>
      request<ReportInventoryData>(`/api/admin/reports/inventory${params?.filter ? '?filter=' + params.filter : ''}`),
    staff: (params: { from?: string; to?: string }) =>
      request<ReportStaffData>(`/api/admin/reports/staff?${new URLSearchParams(params as Record<string,string>)}`),
    purchases: (params: { from?: string; to?: string }) =>
      request<ReportPurchasesData>(`/api/admin/reports/purchases?${new URLSearchParams(params as Record<string,string>)}`),
  },

  notifications: {
    getAll: () =>
      request<{ notifications: Notification[]; unreadCount: number }>('/api/admin/notifications'),

    getUnreadCount: () =>
      request<{ count: number }>('/api/admin/notifications/unread-count'),

    markRead: (id: string) =>
      request<Notification>(`/api/admin/notifications/${id}/read`, { method: 'PATCH' }),

    markAllRead: () =>
      request<{ message: string }>('/api/admin/notifications/read-all', { method: 'PATCH' }),

    delete: (id: string) =>
      request<{ message: string }>(`/api/admin/notifications/${id}`, { method: 'DELETE' }),

    clearRead: () =>
      request<{ message: string }>('/api/admin/notifications/clear-read', { method: 'DELETE' }),
  },

  settings: {
    getAll: () =>
      request<Record<string, any>>('/api/admin/settings'),
    save: (key: string, value: Record<string, any>) =>
      request<Record<string, any>>(`/api/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify(value),
      }),
  },

  announcements: {
    getAll: () =>
      request<Announcement[]>('/api/admin/announcements'),
    create: (data: Partial<Announcement>) =>
      request<Announcement>('/api/admin/announcements', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Announcement>) =>
      request<Announcement>(`/api/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/admin/announcements/${id}`, { method: 'DELETE' }),
  },
};

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'promo';
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  createdBy?: { name: string };
  createdAt: string;
}

// ── Report interfaces ──────────────────────────────────────────
export interface ReportSalesRow {
  period: string;
  onlineCount: number; onlineRevenue: number;
  posCount: number; posRevenue: number;
  posRefundCount: number; posRefundAmount: number;
  totalCount: number; totalRevenue: number; netRevenue: number;
}
export interface ReportSalesData {
  rows: ReportSalesRow[];
  summary: {
    onlineCount: number; onlineRevenue: number;
    posCount: number; posRevenue: number;
    posRefundCount: number; posRefundAmount: number;
    totalCount: number; totalRevenue: number; netRevenue: number;
  };
  groupBy: string; from: string; to: string;
}

export interface ReportProductRow {
  _id: string; name: string; category: string; image: string | null;
  posQty: number; posCost: number; posRevenue: number;
  onlineQty: number; onlineRevenue: number;
  posRefundedQty: number; posRefundedAmount: number;
  currentStock: number | null;
  totalQty: number; netQty: number; totalRevenue: number;
  grossProfit: number; marginPct: number | null;
}
export interface ReportProductsData {
  rows: ReportProductRow[];
  summary: {
    totalQty: number; netQty: number;
    totalRevenue: number; grossProfit: number;
    refundedAmount: number; marginPct: number | null;
  };
  from: string; to: string;
}

export interface ReportOrderRow {
  _id: string; ref: string; customerName: string; customerEmail: string;
  date: string; itemCount: number; total: number; status: string; paymentStatus: string;
  shippingCity: string; shippingState: string;
}
export interface ReportOrdersData {
  rows: ReportOrderRow[];
  summary: { count: number; revenue: number; avgOrder: number; cancelledCount: number; deliveredCount: number };
  from: string; to: string;
}

export interface ReportCustomerRow {
  _id: string; name: string; email: string; joined: string;
  orderCount: number; totalSpent: number; avgOrder: number;
  firstOrder: string; lastOrder: string;
  cancelledCount: number; isActive: boolean;
}
export interface ReportCustomersData {
  rows: ReportCustomerRow[];
  summary: { count: number; totalRevenue: number; avgSpend: number; repeatCount: number };
  from: string; to: string;
}

export interface ReportInventoryRow {
  productId: string; productName: string; category: string; productStatus: string;
  image: string | null; variantLabel: string; sku: string;
  price: number; costPrice: number; stock: number; stockStatus: 'ok' | 'low' | 'out';
  costValue: number; retailValue: number;
}
export interface ReportInventoryData {
  rows: ReportInventoryRow[];
  summary: {
    total: number; outCount: number; lowCount: number; okCount: number;
    totalCostValue: number; totalRetailValue: number;
  };
}

export interface ReportStaffRow {
  _id: string; name: string; email: string;
  transactions: number; revenue: number; avgTransaction: number;
  itemsSold: number;
  cashRevenue: number; cardRevenue: number; transferRevenue: number;
  refundCount: number; refundAmount: number; netRevenue: number;
}
export interface ReportStaffData {
  rows: ReportStaffRow[];
  summary: {
    staffCount: number; totalRevenue: number; totalTx: number;
    totalItems: number; refundAmount: number; netRevenue: number;
  };
  from: string; to: string;
}

export interface ReportPurchaseRow {
  _id: string; ref: string; supplier: string; date: string;
  itemsOrdered: number; totalCost: number;
  returnsTotal: number; netCost: number; returnCount: number;
  status: string; performedBy: string;
}
export interface ReportPurchasesData {
  rows: ReportPurchaseRow[];
  summary: { count: number; totalCost: number; returnsTotal: number; netCost: number };
  from: string; to: string;
}

export interface Notification {
  _id: string;
  type: 'order' | 'low_stock' | 'out_of_stock' | 'customer' | 'booking' | 'system';
  title: string;
  message: string;
  link: string;
  ref?: string;
  isRead: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AnalyticsTrendPoint {
  label: string;
  key: string;
  orders: number;
  pos: number;
  total: number;
  orderCount: number;
  posCount: number;
}

export interface AnalyticsTopProduct {
  _id: string;
  name: string;
  image: string | null;
  revenue: number;
  qty: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  orderRevenue: number;
  posRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  newCustomers: number;
  vsRevenue: number;
  vsTransactions: number;
  vsCustomers: number;
}

export interface AnalyticsData {
  period: string;
  summary: AnalyticsSummary;
  trend: AnalyticsTrendPoint[];
  topProducts: AnalyticsTopProduct[];
  topCategories: { name: string; revenue: number; qty: number }[];
  orderStatusBreakdown: Record<string, number>;
  paymentMethods: Record<string, number>;
  refunds: { count: number; total: number };
  totalDiscounts: number;
  avgItemsPerTx: number;
  totalCustomers: number;
  topCashiers: { name: string; revenue: number; count: number }[];
  recentOrders: { _id: string; total: number; status: string; createdAt: string; itemCount: number; customer: string }[];
  lowStock: { _id: string; name: string; category: string; totalStock: number; minStock: number; image: string | null }[];
}

export interface Review {
  _id: string;
  product: { _id: string; name: string; slug: string; images: { url: string }[] };
  user: { _id: string; name: string; email: string };
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  total: number;
  avgRating: string;
  distribution: Record<number, number>;
  recentReviews: Review[];
}

export interface WishlistProduct {
  _id: string;
  name: string;
  slug: string;
  images: { url: string }[];
  category?: { name: string };
  variants: { price: number }[];
}

export interface WishlistUser {
  _id: string;
  name: string;
  email: string;
  wishlist: WishlistProduct[];
  wishlistCount: number;
  createdAt: string;
}

export interface WishlistStats {
  totalUsers: number;
  totalItems: number;
  avgItemsPerUser: string;
  topProducts: { _id: string; name: string; image: string; wishlistCount: number }[];
  popularCategories: { category: string; count: number }[];
}

export interface ShippingMethod {
  _id: string;
  name: string;
  description: string;
  price: number;
  minDays: number;
  maxDays: number;
  freeThreshold: number | null;
  isActive: boolean;
}

export interface ShippingZone {
  _id: string;
  name: string;
  description: string;
  regions: string[];
  methods: ShippingMethod[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingSettings {
  _id: string;
  enableShipping: boolean;
  defaultProcessingDays: number;
  checkoutNote: string;
  allowPickup: boolean;
  pickupAddress: string;
  pickupNote: string;
  pickupPrice: number;
}

export interface GiftCardUsage {
  _id: string;
  type: 'debit' | 'credit';
  amount: number;
  balanceAfter: number;
  description: string;
  orderId: string | null;
  performedBy: string;
  createdAt: string;
}

export interface GiftCard {
  _id: string;
  code: string;
  initialBalance: number;
  balance: number;
  isActive: boolean;
  status?: 'active' | 'inactive' | 'expired' | 'exhausted';
  expiryDate: string | null;
  recipientName: string;
  recipientEmail: string;
  note: string;
  purchasedBy?: { _id: string; name: string; email: string } | null;
  purchaserName: string;
  purchaserEmail: string;
  usageHistory: GiftCardUsage[];
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardStats {
  total: number;
  active: number;
  totalIssued: number;
  totalRedeemed: number;
  totalRemaining: number;
}

export interface Discount {
  _id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  applicableTo: 'all' | 'categories' | 'products';
  categories: string[];
  products: { _id: string; name: string; images: { url: string }[]; category: string }[];
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number | null;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Hero {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  imageAlt?: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  sortOrder: number;
  count: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'therapist' | 'staff';
  isActive?: boolean;
  avatar?: string;
  permissions?: string[]; // Custom route permissions
  addresses?: Address[];
  wishlist?: string[];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrder {
  _id: string;
  total: number;
  status: string;
  createdAt: string;
  items: { product?: { name: string; images: { url: string }[] }; name?: string; quantity: number; price: number }[];
}

export interface CustomerBooking {
  _id: string;
  serviceType: string;
  status: string;
  date: string;
  amount: number;
  createdAt: string;
}

export interface CustomerStats {
  totalSpend: number;
  totalOrders: number;
  lastOrderDate: string | null;
}

export interface Address {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  isDefault?: boolean;
  deliveryMethod?: 'standard' | 'express';
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  subcategory?: string;
  images: { url: string; publicId?: string }[];
  variants: Variant[];
  tags: string[];
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  ratings: { avg: number; count: number };
  createdAt: string;
  updatedAt: string;
}

export interface Variant {
  size: string;
  color: string;
  price: number;
  costPrice?: number;
  markup?: number;
  useMarkup?: boolean;
  stock?: number;
  sku?: string;
}

export interface Order {
  _id: string;
  user?: { _id: string; name: string; email: string; phone?: string };
  paystackRef?: string;
  paystackStatus?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  shippingAddress?: Address;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product?: { _id: string; name: string; images: { url: string }[]; slug?: string; category?: string };
  name?: string;
  quantity: number;
  price: number;
  variant?: { size: string; color: string };
  image?: string;
}

export interface OrderStatusCounts {
  [status: string]: { count: number; revenue: number };
}

export interface StockCountSession {
  _id: string;
  countedAt: string;
  countedBy?: { _id: string; name: string; email: string };
  items: {
    product: string | { _id: string; name: string; images?: { url: string }[] };
    productName: string;
    variantIndex: number;
    variantLabel: string;
    expectedStock: number;
    countedStock: number;
    variance: number;
    notes: string;
  }[];
  summary: { totalProducts: number; totalVariants: number; discrepancies: number; totalVariance: number };
  notes: string;
  createdAt: string;
}

export interface AvailabilitySettings {
  _id: string;
  serviceType: 'therapy' | 'podcast';
  workingDays: number[];
  timeSlots: string[];
  slotDuration: number;
  blockedDates: { _id: string; date: string; reason: string }[];
  blockedSlots: { _id: string; date: string; time: string; reason: string }[];
  updatedAt: string;
}

export interface Booking {
  _id: string;
  user?: { _id: string; name: string; email: string };
  userId?: string;
  serviceType: 'therapy' | 'podcast';
  therapistId?: { _id: string; name: string; avatar?: string };
  date: string;
  timeSlot: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paystackRef?: string;
  amount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryRecord {
  _id: string;
  product: { _id: string; name: string; slug: string; images: { url: string }[]; category: string };
  variantIndex: number;
  type: 'in' | 'out' | 'adjustment' | 'return' | 'damage' | 'initial';
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  referenceType: 'order' | 'restock' | 'adjustment' | 'return' | 'damage' | 'initial' | 'sale';
  notes?: string;
  performedBy?: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface InventoryStats {
  totalStock: number;
  totalValue: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  todayIn: number;
  todayOut: number;
  recentMovements: InventoryRecord[];
}

export interface InventoryAnalyticsProduct {
  _id: string;
  name: string;
  category: string;
  image: string | null;
  netSold: number;
  unitsSold: number;
  unitsRefunded: number;
  netRevenue: number;
  stock: number;
}

export interface InventoryAnalyticsCategory {
  name: string;
  netSold: number;
  netRevenue: number;
  productCount: number;
  share: number;
}

export interface InventoryAnalytics {
  period: number;
  topProducts: InventoryAnalyticsProduct[];
  topCategories: InventoryAnalyticsCategory[];
  slowMovers: { _id: string; name: string; category: string; image: string | null; stock: number }[];
  stockHealth: { inStock: number; lowStock: number; outOfStock: number };
}

export interface LowStockItem {
  product: { _id: string; name: string; slug: string; images: { url: string }[]; category: string };
  variantIndex: number;
  variant: { size: string; color: string; price: number; stock: number };
  isOutOfStock: boolean;
}

export interface DashboardTrendDay {
  date: string;
  label: string;
  orderRev: number;
  posRev: number;
  totalRev: number;
  orderCount: number;
  posCount: number;
}

export interface DashboardLowStock {
  _id: string;
  name: string;
  category: string;
  images: { url: string }[];
  variantIndex: number;
  variant: { size: string; color: string; price: number; stock: number; sku?: string };
}

export interface DashboardPosSale {
  _id: string;
  receiptNumber: string;
  total: number;
  paymentMethod: string;
  cashierName: string;
  customerName?: string;
  items: { productName: string; quantity: number }[];
  createdAt: string;
}

export interface DashboardStats {
  period: string;
  periodLabel: string;
  revenue: {
    currentPeriod: number;
    currentPeriodOrders: number;
    currentPeriodPos: number;
    previousPeriod: number;
    previousPeriodOrders: number;
    previousPeriodPos: number;
    vsPrevious: number;
  };
  orders: {
    currentPeriod: number;
    currentPeriodOrders: number;
    currentPeriodPos: number;
    previousPeriod: number;
    previousPeriodOrders: number;
    previousPeriodPos: number;
    vsPrevious: number;
    statusBreakdown: { pending: number; processing: number; shipped: number; delivered: number; cancelled: number };
    total: number;
  };
  customers: {
    total: number;
    newThisPeriod: number;
    newPrevPeriod: number;
    vsPrevious: number;
  };
  products: { total: number };
  avgOrderValue: number;
  avgOrderValuePrevious: number;
  avgOrderValueVsPrevious: number;
  categoryRevenue: { category: string; revenue: number }[];
  recentOrders: Order[];
  recentPosSales: DashboardPosSale[];
  lowStock: DashboardLowStock[];
  trend: DashboardTrendDay[];
  bookings: { today: number; pending: number };
}

export { ApiError };

export const purchaseApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; supplier?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ purchases: Purchase[]; total: number; page: number; totalPages: number }>(`/api/admin/purchases?${query}`);
  },

  getById: (id: string) =>
    request<Purchase>(`/api/admin/purchases/${id}`),

  getStats: () =>
    request<PurchaseStats>('/api/admin/purchases/stats'),

  create: (data: {
    supplier: string;
    reference?: string;
    purchaseDate?: string;
    items: PurchaseItemInput[];
    notes?: string;
    receiveNow?: boolean;
  }) =>
    request<Purchase>('/api/admin/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  receive: (id: string) =>
    request<Purchase>(`/api/admin/purchases/${id}/receive`, { method: 'POST' }),

  cancel: (id: string) =>
    request<Purchase>(`/api/admin/purchases/${id}/cancel`, { method: 'POST' }),

  return: (id: string, data: { items: ReturnItemInput[]; reason: string; notes?: string }) =>
    request<Purchase>(`/api/admin/purchases/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface ReturnItemInput {
  productId: string;
  variantIndex: number;
  quantity: number;
}

export interface PurchaseReturnRecord {
  _id: string;
  items: Array<{
    product: string;
    productName: string;
    variantIndex: number;
    variantLabel: string;
    quantity: number;
    costPrice: number;
    totalCost: number;
  }>;
  totalCost: number;
  reason: string;
  notes?: string;
  returnedAt: string;
  performedBy?: { _id: string; name: string; email: string };
}

export interface PurchaseItemInput {
  productId: string;
  variantIndex?: number;
  quantity: number;
  costPrice: number;
}

export interface PurchaseItem {
  product: { _id: string; name: string; slug: string; images: { url: string }[]; variants: Variant[] };
  productName: string;
  variantIndex: number;
  variantLabel: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
}

export interface Purchase {
  _id: string;
  supplier: string;
  reference?: string;
  purchaseDate: string;
  items: PurchaseItem[];
  totalCost: number;
  notes?: string;
  status: 'pending' | 'received' | 'partially_returned' | 'returned' | 'cancelled';
  returns: PurchaseReturnRecord[];
  receivedAt?: string;
  performedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseStats {
  byStatus: Record<'pending' | 'received' | 'cancelled', { count: number; totalCost: number }>;
  last30Days: { totalCost: number; count: number };
}
