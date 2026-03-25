'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CartItem {
  product: {
    id: string;
    title: string;
    thumbnail?: string;
    handle?: string;
    price?: number | { amount: number };
  };
  quantity: number;
  variant?: {
    id: string;
    title: string;
    options: Record<string, string>;
    price?: number | { amount: number };
  };
}

interface CartContextType {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantOptions?: Record<string, string>) => void;
  updateQuantity: (productId: string, quantity: number, variantOptions?: Record<string, string>) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen(prev => !prev), []);

  const getPriceAmount = (price: number | { amount: number } | undefined): number => {
    if (!price) return 0;
    if (typeof price === 'object') return price.amount;
    return price;
  };

  const addItem = useCallback((newItem: CartItem) => {
    setItems(prev => {
      const existingItem = prev.find(item => 
        item.product.id === newItem.product.id && 
        JSON.stringify(item.variant?.options) === JSON.stringify(newItem.variant?.options)
      );
      
      if (existingItem) {
        return prev.map(item => 
          item.product.id === newItem.product.id && 
          JSON.stringify(item.variant?.options) === JSON.stringify(newItem.variant?.options)
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }
      return [...prev, newItem];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, variantOptions?: Record<string, string>) => {
    setItems(prev => {
      if (variantOptions) {
        return prev.filter(item => 
          !(item.product.id === productId && JSON.stringify(item.variant?.options) === JSON.stringify(variantOptions))
        );
      }
      return prev.filter(item => item.product.id !== productId);
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variantOptions?: Record<string, string>) => {
    if (quantity <= 0) {
      setItems(prev => {
        if (variantOptions) {
          return prev.filter(item => 
            !(item.product.id === productId && JSON.stringify(item.variant?.options) === JSON.stringify(variantOptions))
          );
        }
        return prev.filter(item => item.product.id !== productId);
      });
      return;
    }

    setItems(prev => 
      prev.map(item => {
        if (variantOptions) {
          if (item.product.id === productId && JSON.stringify(item.variant?.options) === JSON.stringify(variantOptions)) {
            return { ...item, quantity };
          }
        } else if (item.product.id === productId) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, item) => {
    const price = item.variant?.price ? getPriceAmount(item.variant.price) : getPriceAmount(item.product.price);
    return sum + price * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      itemCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}