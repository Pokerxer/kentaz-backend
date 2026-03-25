import { configureStore } from '@reduxjs/toolkit';
import cartReducer, { CartState } from './cartSlice';
import wishlistReducer, { WishlistState } from './wishlistSlice';
import userReducer from './userSlice';
import { storage } from '@/lib/persistence';
import { loadCartState } from './cartSlice';
import { loadWishlistState } from './wishlistSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    wishlist: wishlistReducer,
    user: userReducer,
  },
});

let isHydrated = false;

export const hydrateStore = () => {
  if (typeof window !== 'undefined' && !isHydrated) {
    const cart = storage.getCart() as CartState | null;
    const wishlist = storage.getWishlist() as WishlistState | null;
    
    if (cart) {
      store.dispatch(loadCartState(cart));
    }
    if (wishlist) {
      store.dispatch(loadWishlistState(wishlist));
    }
    isHydrated = true;
  }
};

store.subscribe(() => {
  if (typeof window !== 'undefined' && isHydrated) {
    const state = store.getState();
    storage.setCart(state.cart);
    storage.setWishlist(state.wishlist);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
