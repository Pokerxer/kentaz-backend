export interface Variant {
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
  variants: Variant[];
  tags?: string[];
  featured?: boolean;
  status?: string;
  ratings?: { avg: number; count: number };
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: Variant;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
}
