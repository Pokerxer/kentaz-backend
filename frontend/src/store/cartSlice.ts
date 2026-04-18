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

interface CartItem {
  product: CartProduct;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
    price?: number;
  };
}

export interface CartState {
  items: CartItem[];
  total: number;
  discount?: {
    code: string;
    amount: number;
  };
}

const initialState: CartState = {
  items: [],
  total: 0,
  discount: undefined,
};

const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => {
    const price = item.variant?.price || item.product.price || 0;
    return sum + price * item.quantity;
  }, 0);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    loadState: (state, action: PayloadAction<CartState>) => {
      state.items = action.payload.items;
      state.total = action.payload.total;
    },
    addToCart: (state, action: PayloadAction<{ product: CartProduct; quantity: number; variant?: CartItem['variant'] }>) => {
      const { product, quantity, variant } = action.payload;
      const existingItem = state.items.find(item => 
        item.product._id === product._id && 
        item.variant?.size === variant?.size && 
        item.variant?.color === variant?.color
      );
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ product, quantity, variant });
      }
      state.total = calculateTotal(state.items);
    },
    removeFromCart: (state, action: PayloadAction<{ productId: string; variant?: { size?: string; color?: string; price?: number } }>) => {
      const { productId, variant } = action.payload;
      state.items = state.items.filter(item => 
        !(item.product._id === productId && 
          item.variant?.size === variant?.size && 
          item.variant?.color === variant?.color)
      );
      state.total = calculateTotal(state.items);
    },
    updateQuantity: (state, action: PayloadAction<{ productId: string; quantity: number; variant?: { size?: string; color?: string; price?: number } }>) => {
      const { productId, quantity, variant } = action.payload;
      const item = state.items.find(item => 
        item.product._id === productId && 
        item.variant?.size === variant?.size && 
        item.variant?.color === variant?.color
      );
      if (item) {
        item.quantity = quantity;
      }
      state.total = calculateTotal(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
    },
    applyDiscount: (state, action: PayloadAction<{ code: string; amount: number }>) => {
      state.discount = action.payload;
    },
    removeDiscount: (state) => {
      state.discount = undefined;
    },
  },
});

export const { loadState: loadCartState, addToCart, removeFromCart, updateQuantity, clearCart, applyDiscount, removeDiscount } = cartSlice.actions;
export default cartSlice.reducer;
