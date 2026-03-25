const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export interface ProductVariant {
  size?: string;
  color?: string;
  price: number;
  compareAtPrice?: number;
  stock?: number;
  sku?: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  images?: { url: string; publicId?: string }[];
  variants: ProductVariant[];
  tags?: string[];
  featured?: boolean;
  status?: string;
  ratings?: { avg: number; count: number };
}

export interface ProductsResponse {
  products: Product[];
  count: number;
  offset: number;
  total: number;
}

export async function getProducts(params?: {
  limit?: number;
  offset?: number;
  q?: string;
  category?: string;
  featured?: boolean;
}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.q) searchParams.set('q', params.q);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.featured) searchParams.set('featured', 'true');

  const res = await fetch(`${API_BASE}/api/store/products?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProduct(slug: string): Promise<{ product: Product; reviews: any[] }> {
  const res = await fetch(`${API_BASE}/api/store/products/${slug}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export async function getFeaturedProducts(limit = 8): Promise<ProductsResponse> {
  return getProducts({ limit, featured: true });
}

export async function getProductsByCategory(category: string, limit = 20): Promise<ProductsResponse> {
  return getProducts({ category, limit });
}

export async function searchProducts(query: string, limit = 20): Promise<ProductsResponse> {
  return getProducts({ q: query, limit });
}
