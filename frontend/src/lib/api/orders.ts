import { authApiClient } from './client';

export interface OrderItem {
  product: string | { _id: string; name: string; slug: string; images?: { url: string }[] };
  name: string;
  price: number;
  quantity: number;
  variant?: { size?: string; color?: string };
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

export interface Order {
  _id: string;
  user?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: ShippingAddress;
  paystackRef?: string;
  paystackStatus?: string;
  createdAt: string;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  total: number;
}

export async function createOrder(data: CreateOrderRequest): Promise<Order> {
  return authApiClient<Order>('/api/store/orders', {
    method: 'POST',
    body: data,
  });
}

export async function getOrders(): Promise<Order[]> {
  return authApiClient<Order[]>('/api/store/orders');
}

export async function getOrder(id: string): Promise<Order> {
  return authApiClient<Order>(`/api/store/orders/${id}`);
}
