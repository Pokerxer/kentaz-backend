import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartProduct {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  thumbnail?: string;
  images?: { url: string }[];
  price?: number;
  variants?: { size?: string; color?: string; price: number }[];
}

interface CartVariant {
  size?: string;
  color?: string;
  price?: number;
}

interface CartItem {
  product: CartProduct;
  quantity: number;
  variant?: CartVariant;
}

export interface CartState {
  items: CartItem[];
  /**
   * Indicative total from the prices the product pages displayed. What the
   * customer is actually charged comes from the server quote (`useCartQuote`);
   * this figure only drives the header badge and optimistic UI.
   */
  total: number;
  /** Promo code the shopper entered, kept so it survives cart → checkout. */
  discountCode?: string | null;
  discount?: {
    code: string;
    amount: number;
  };
}

const initialState: CartState = {
  items: [],
  total: 0,
  discountCode: null,
  discount: undefined,
};

const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => {
    const price = item.variant?.price ?? item.product.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
};

/**
 * Cart lines are identified by product AND variant — the same product in two
 * sizes is two lines, and removing one must not disturb the other.
 */
const norm = (v?: string | null) => (v === undefined || v === null || v === '' ? undefined : v);

const sameLine = (item: CartItem, productId: string, variant?: CartVariant) =>
  (item.product._id === productId || item.product.id === productId) &&
  norm(item.variant?.size) === norm(variant?.size) &&
  norm(item.variant?.color) === norm(variant?.color);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    loadState: (state, action: PayloadAction<CartState>) => {
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.discountCode = action.payload.discountCode ?? null;
    },
    addToCart: (state, action: PayloadAction<{ product: CartProduct; quantity: number; variant?: CartVariant }>) => {
      const { product, quantity, variant } = action.payload;
      const existingItem = state.items.find((item) => sameLine(item, product._id, variant));

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ product, quantity, variant });
      }
      state.total = calculateTotal(state.items);
    },
    removeFromCart: (state, action: PayloadAction<{ productId: string; variant?: CartVariant }>) => {
      const { productId, variant } = action.payload;
      state.items = state.items.filter((item) => !sameLine(item, productId, variant));
      state.total = calculateTotal(state.items);
    },
    updateQuantity: (state, action: PayloadAction<{ productId: string; quantity: number; variant?: CartVariant }>) => {
      const { productId, quantity, variant } = action.payload;
      const item = state.items.find((i) => sameLine(i, productId, variant));
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
      state.total = calculateTotal(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.discountCode = null;
      state.discount = undefined;
    },
    /** Remember the entered code so checkout can re-quote with it. */
    setDiscountCode: (state, action: PayloadAction<string | null>) => {
      state.discountCode = action.payload ? action.payload.toUpperCase().trim() : null;
      if (!action.payload) state.discount = undefined;
    },
    applyDiscount: (state, action: PayloadAction<{ code: string; amount: number }>) => {
      state.discount = action.payload;
      state.discountCode = action.payload.code;
    },
    removeDiscount: (state) => {
      state.discount = undefined;
      state.discountCode = null;
    },
  },
});

export const {
  loadState: loadCartState,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  setDiscountCode,
  applyDiscount,
  removeDiscount,
} = cartSlice.actions;
export default cartSlice.reducer;
