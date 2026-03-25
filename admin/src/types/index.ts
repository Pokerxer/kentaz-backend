export interface Product {
  id: string;
  title: string;
  description: string;
  handle: string;
  status: 'draft' | 'published' | 'archived';
  thumbnail?: string;
  price?: { amount: number };
  inventory_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  status: string;
  display_id: string;
  customer: { first_name: string; last_name: string; email: string };
  total: { amount: number; currency_code: string };
  created_at: string;
}

export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  orders_count: number;
  created_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
}
