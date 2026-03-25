const STORAGE_KEYS = {
  cart: 'kentaz_cart',
  wishlist: 'kentaz_wishlist',
} as const;

export const storage = {
  getCart: () => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.cart);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setCart: (cart: unknown) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  },
  getWishlist: () => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.wishlist);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setWishlist: (wishlist: unknown) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(wishlist));
    } catch {
      // Ignore storage errors
    }
  },
};
