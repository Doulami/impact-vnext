'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react';

// Types
export interface BundleComponent {
  id: string;
  name?: string; // Fallback if productVariant not available
  productVariant?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    product: {
      id: string;
      name: string;
      slug: string;
    };
  };
  quantity: number;
  unitPrice?: number;
  displayOrder?: number;
}

export interface CartItem {
  id: string;
  variantId: string;
  productName: string;
  variantName?: string;
  price: number;
  quantity: number;
  image?: string;
  slug: string;
  inStock: boolean;
  // Bundle-specific properties
  isBundle?: boolean;
  bundleId?: string;
  bundleComponents?: BundleComponent[];
  originalPrice?: number; // For showing savings
  maxQuantity?: number; // Bundle capacity limit
  availabilityStatus?: string; // Bundle availability status
}

export interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> & { quantity?: number } }
  | { type: 'REMOVE_ITEM'; payload: { variantId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { variantId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'SET_CART_OPEN'; payload: boolean }
  | { type: 'LOAD_CART'; payload: CartItem[] };

// Initial state
const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isOpen: false,
};

// Cart reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      console.log('[CART REDUCER] ADD_ITEM payload:', action.payload);
      console.log('[CART REDUCER] isBundle:', action.payload.isBundle, 'bundleComponents:', action.payload.bundleComponents?.length);
      const existingItemIndex = state.items.findIndex(
        item => item.variantId === action.payload.variantId
      );

      let newItems: CartItem[];
      
      if (existingItemIndex > -1) {
        // Update existing item quantity
        const existingItem = state.items[existingItemIndex];
        const newQuantity = existingItem.quantity + (action.payload.quantity || 1);
        
        // Enforce maxQuantity for bundles
        const maxQuantity = action.payload.maxQuantity ?? existingItem.maxQuantity;
        const finalQuantity = maxQuantity ? Math.min(newQuantity, maxQuantity) : newQuantity;
        
        newItems = state.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: finalQuantity, maxQuantity: maxQuantity ?? item.maxQuantity }
            : item
        );
      } else {
        // Add new item
        const quantity = action.payload.quantity || 1;
        const maxQuantity = action.payload.maxQuantity;
        const finalQuantity = maxQuantity ? Math.min(quantity, maxQuantity) : quantity;
        
        newItems = [...state.items, { ...action.payload, quantity: finalQuantity }];
      }

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.variantId !== action.payload.variantId);
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { variantId: action.payload.variantId } });
      }

      const newItems = state.items.map(item => {
        if (item.variantId === action.payload.variantId) {
          // Enforce maxQuantity for bundles
          const finalQuantity = item.maxQuantity 
            ? Math.min(action.payload.quantity, item.maxQuantity)
            : action.payload.quantity;
          return { ...item, quantity: finalQuantity };
        }
        return item;
      });

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalPrice: 0,
      };

    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen,
      };

    case 'SET_CART_OPEN':
      return {
        ...state,
        isOpen: action.payload,
      };

    case 'LOAD_CART':
      const totalItems = action.payload.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = action.payload.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: action.payload,
        totalItems,
        totalPrice,
      };

    default:
      return state;
  }
}

// Context
const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

// Provider component
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('impact-nutrition-cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: parsedCart });
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('impact-nutrition-cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [state.items]);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

// Hook to use cart
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  const { state, dispatch } = context;

  // Helper functions
  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (variantId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { variantId } });
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { variantId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const openCart = () => {
    dispatch({ type: 'SET_CART_OPEN', payload: true });
  };

  const closeCart = () => {
    dispatch({ type: 'SET_CART_OPEN', payload: false });
  };

  const getCartItem = (variantId: string) => {
    return state.items.find(item => item.variantId === variantId);
  };

  const isInCart = (variantId: string) => {
    return state.items.some(item => item.variantId === variantId);
  };

  return {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
    getCartItem,
    isInCart,
  };
}