import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WishlistProduct {
  _id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  images?: { url: string }[];
  price?: number;
}

export interface WishlistState {
  items: WishlistProduct[];
}

const initialState: WishlistState = {
  items: [],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    loadState: (state, action: PayloadAction<WishlistState>) => {
      state.items = action.payload.items;
    },
    addToWishlist: (state, action: PayloadAction<WishlistProduct>) => {
      const exists = state.items.find(item => item._id === action.payload._id);
      if (!exists) {
        state.items.push(action.payload);
      }
    },
    removeFromWishlist: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item._id !== action.payload);
    },
    clearWishlist: (state) => {
      state.items = [];
    },
  },
});

export const { loadState: loadWishlistState, addToWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
