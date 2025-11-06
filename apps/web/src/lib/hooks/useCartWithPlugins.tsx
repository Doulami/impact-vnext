'use client';

import { useCart } from './useCart';
import { useCallback, useMemo, useEffect } from 'react';
import { pluginRegistry, eventManager, Discount, CartEvents } from '@impact/plugin-system';
import { 
  webCartToPluginCart, 
  pluginCartToWebCart, 
  calculateCartWithDiscounts,
  consolidateDiscounts,
  validateCartForPlugins 
} from '../plugins/cart-adapter';

// Extended cart state that includes plugin data
export interface EnhancedCartState {
  // Original cart data
  items: any[];
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  
  // Plugin enhancements
  discounts: Discount[];
  discountTotal: number;
  pointsToEarn?: number;
  availableDiscounts?: Discount[];
  couponCode?: string;
  
  // Plugin system status
  pluginsEnabled: boolean;
  pluginErrors: string[];
  pluginWarnings: string[];
}

/**
 * Enhanced cart hook with plugin system integration
 */
export function useCartWithPlugins(userId?: string) {
  const cart = useCart();
  
  // Calculate enhanced cart state with plugins
  const enhancedCart = useMemo((): EnhancedCartState => {
    // Start with base cart state
    const baseState: EnhancedCartState = {
      items: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      isOpen: cart.isOpen,
      discounts: [],
      discountTotal: 0,
      pluginsEnabled: true,
      pluginErrors: [],
      pluginWarnings: []
    };
    
    // Validate cart for plugin compatibility
    const validation = validateCartForPlugins(cart);
    if (!validation.isValid) {
      return {
        ...baseState,
        pluginsEnabled: false,
        pluginErrors: validation.errors,
        pluginWarnings: validation.warnings
      };
    }
    
    try {
      // Transform to plugin cart format
      const pluginCart = webCartToPluginCart(cart, userId);
      
      // Execute plugin hooks (synchronously for now)
      // In a real implementation, you'd want to handle async plugins properly
      let modifiedCart = pluginCart;
      let allDiscounts: Discount[] = [];
      
      // Get enabled plugins
      const enabledPlugins = pluginRegistry.getEnabled();
      
      // Execute beforeCartCalculation hooks
      for (const plugin of enabledPlugins) {
        if (plugin.hooks.beforeCartCalculation) {
          try {
            const result = plugin.hooks.beforeCartCalculation(modifiedCart);
            // Handle both sync and async results
            if (result instanceof Promise) {
              console.warn(`Plugin ${plugin.name} beforeCartCalculation hook is async but being called synchronously`);
            } else {
              modifiedCart = result;
            }
          } catch (error) {
            console.error(`Error in ${plugin.name}.beforeCartCalculation:`, error);
            baseState.pluginErrors.push(`${plugin.name}: beforeCartCalculation failed`);
          }
        }
      }
      
      // Execute calculateDiscounts hooks
      for (const plugin of enabledPlugins) {
        if (plugin.hooks.calculateDiscounts) {
          try {
            const discounts = plugin.hooks.calculateDiscounts(modifiedCart.items, modifiedCart);
            if (discounts instanceof Promise) {
              console.warn(`Plugin ${plugin.name} calculateDiscounts hook is async but being called synchronously`);
            } else if (Array.isArray(discounts)) {
              allDiscounts.push(...discounts);
            }
          } catch (error) {
            console.error(`Error in ${plugin.name}.calculateDiscounts:`, error);
            baseState.pluginErrors.push(`${plugin.name}: calculateDiscounts failed`);
          }
        }
      }
      
      // Consolidate and apply discounts
      const consolidatedDiscounts = consolidateDiscounts(allDiscounts);
      const cartWithDiscounts = calculateCartWithDiscounts(cart, consolidatedDiscounts, userId);
      
      // Update cart with discount calculations
      modifiedCart.discounts = consolidatedDiscounts;
      modifiedCart.discountTotal = cartWithDiscounts.discountTotal;
      modifiedCart.total = cartWithDiscounts.total;
      
      // Execute afterCartCalculation hooks
      for (const plugin of enabledPlugins) {
        if (plugin.hooks.afterCartCalculation) {
          try {
            const result = plugin.hooks.afterCartCalculation(modifiedCart);
            if (result instanceof Promise) {
              console.warn(`Plugin ${plugin.name} afterCartCalculation hook is async but being called synchronously`);
            } else {
              modifiedCart = result;
            }
          } catch (error) {
            console.error(`Error in ${plugin.name}.afterCartCalculation:`, error);
            baseState.pluginErrors.push(`${plugin.name}: afterCartCalculation failed`);
          }
        }
      }
      
      return {
        ...baseState,
        totalPrice: modifiedCart.total,
        discounts: modifiedCart.discounts,
        discountTotal: modifiedCart.discountTotal,
        pointsToEarn: modifiedCart.pointsToEarn,
        availableDiscounts: modifiedCart.availableDiscounts,
        couponCode: modifiedCart.couponCode,
        pluginWarnings: validation.warnings
      };
      
    } catch (error) {
      console.error('Error processing cart with plugins:', error);
      return {
        ...baseState,
        pluginsEnabled: false,
        pluginErrors: ['Failed to process cart with plugins']
      };
    }
  }, [cart, userId]);
  
  // Enhanced add item with plugin events
  const addItemWithEvents = useCallback((item: any) => {
    // Add item to cart first
    cart.addItem(item);
    
    // Emit plugin events
    eventManager.emitCartItemAdded({
      itemId: item.variantId,
      productId: item.id,
      quantity: item.quantity || 1
    }, userId);
  }, [cart.addItem, userId]);
  
  // Enhanced remove item with plugin events
  const removeItemWithEvents = useCallback((variantId: string) => {
    const existingItem = cart.getCartItem(variantId);
    
    // Remove item from cart
    cart.removeItem(variantId);
    
    // Emit plugin events
    if (existingItem) {
      eventManager.emitCartItemRemoved({
        itemId: variantId,
        productId: existingItem.id
      }, userId);
    }
  }, [cart.removeItem, cart.getCartItem, userId]);
  
  // Enhanced update quantity with plugin events
  const updateQuantityWithEvents = useCallback((variantId: string, newQuantity: number) => {
    const existingItem = cart.getCartItem(variantId);
    const oldQuantity = existingItem?.quantity || 0;
    
    // Update quantity in cart
    cart.updateQuantity(variantId, newQuantity);
    
    // Emit plugin events
    if (existingItem) {
      eventManager.emitCartQuantityChanged({
        itemId: variantId,
        oldQuantity,
        newQuantity
      }, userId);
    }
  }, [cart.updateQuantity, cart.getCartItem, userId]);
  
  // Enhanced clear cart with plugin events
  const clearCartWithEvents = useCallback(() => {
    cart.clearCart();
    eventManager.emit(CartEvents.CART_CLEARED, { userId }, userId);
  }, [cart.clearCart, userId]);
  
  // Apply coupon code
  const applyCouponCode = useCallback((code: string) => {
    // This would typically validate the coupon with the backend
    // For now, we'll emit the event for plugins to handle
    eventManager.emitCouponApplied({
      code,
      discountAmount: 0 // Would be calculated by discount plugin
    }, userId);
  }, [userId]);
  
  // Start checkout with validation
  const startCheckoutWithValidation = useCallback(async () => {
    try {
      // Transform to plugin cart format
      const pluginCart = webCartToPluginCart(enhancedCart, userId);
      
      // Execute beforeCheckout validation hooks
      const validation = await pluginRegistry.executeBeforeCheckout(pluginCart);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }
      
      // Emit checkout started event
      eventManager.emitCheckoutStarted({
        cartId: pluginCart.id,
        total: pluginCart.total,
        itemCount: pluginCart.items.length
      }, userId);
      
      return {
        success: true,
        errors: [],
        warnings: validation.warnings || []
      };
      
    } catch (error) {
      console.error('Error starting checkout:', error);
      return {
        success: false,
        errors: ['Failed to validate checkout'],
        warnings: []
      };
    }
  }, [enhancedCart, userId]);
  
  // Initialize plugins on mount
  useEffect(() => {
    // Set up plugin context with user info if available
    if (userId) {
      pluginRegistry.setContext({
        featureFlags: {
          plugins: {
            bundles: { enabled: true, maxBundleSize: 5, discountType: 'percentage', allowCustomBundles: false },
            discounts: { enabled: true, sumoEnabled: false, maxDiscountPercentage: 50, allowStackableDiscounts: true, couponCodeEnabled: true },
            loyalty: { enabled: true, pointsPerDollar: 1, redemptionRate: 0.01, minRedemptionPoints: 100, maxRedemptionPercentage: 50 },
            reviews: { enabled: true, requirePurchase: false, moderationEnabled: true },
            wishlist: { enabled: true, requireAuth: true, maxItems: 100 }
          },
          features: {
            search: { enabled: true, instantSearch: true, filters: ['category', 'price', 'brand'] },
            analytics: { enabled: true, googleAnalytics: true, facebookPixel: false },
            pwa: { enabled: true, offlineMode: false, pushNotifications: false }
          }
        },
        config: {},
        user: { id: userId, email: '', isAuthenticated: true }
      });
    }
  }, [userId]);
  
  return {
    // Enhanced cart state
    ...enhancedCart,
    
    // Enhanced cart actions
    addItem: addItemWithEvents,
    removeItem: removeItemWithEvents,
    updateQuantity: updateQuantityWithEvents,
    clearCart: clearCartWithEvents,
    applyCouponCode,
    startCheckout: startCheckoutWithValidation,
    
    // Original cart actions (for compatibility)
    toggleCart: cart.toggleCart,
    openCart: cart.openCart,
    closeCart: cart.closeCart,
    getCartItem: cart.getCartItem,
    isInCart: cart.isInCart,
    
    // Plugin system utilities
    getPluginStats: () => pluginRegistry.getStats(),
    getEventHistory: () => eventManager.getEventHistory(10)
  };
}