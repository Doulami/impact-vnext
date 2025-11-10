/**
 * Cart Adapter for Plugin System Integration
 * 
 * Transforms between web app cart types and plugin system types
 */

import { CartItem as WebCartItem, CartState as WebCartState } from '../hooks/useCart';
import { Cart, LineItem, Discount } from '@impact/plugin-system';

/**
 * Generate unique ID for cart items
 */
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Transform web app CartItem to plugin system LineItem
 */
export function cartItemToLineItem(cartItem: WebCartItem): LineItem {
  return {
    id: cartItem.variantId, // Use variantId as unique identifier
    productId: cartItem.id, // Product ID
    productName: cartItem.productName,
    variantId: cartItem.variantId,
    variantName: cartItem.variantName,
    quantity: cartItem.quantity,
    unitPrice: cartItem.price,
    totalPrice: cartItem.price * cartItem.quantity,
    discountAmount: 0 // Will be calculated by plugins
  };
}

/**
 * Transform plugin system LineItem back to web app CartItem
 */
export function lineItemToCartItem(lineItem: LineItem): WebCartItem {
  return {
    id: lineItem.productId,
    variantId: lineItem.variantId || lineItem.id,
    productName: lineItem.productName,
    variantName: lineItem.variantName,
    price: lineItem.unitPrice,
    quantity: lineItem.quantity,
    image: undefined, // Will be preserved from original cart item
    slug: '', // Will be preserved from original cart item
    inStock: true // Will be preserved from original cart item
  };
}

/**
 * Transform web app CartState to plugin system Cart
 */
export function webCartToPluginCart(webCart: WebCartState, userId?: string): Cart {
  const items = webCart.items.map(cartItemToLineItem);
  
  return {
    id: generateId(),
    items,
    discounts: [], // Will be populated by discount plugins
    subtotal: webCart.totalPrice,
    discountTotal: 0, // Will be calculated by plugins
    total: webCart.totalPrice,
    pointsToEarn: 0, // Will be calculated by loyalty plugins
    availableDiscounts: [], // Will be populated by discount plugins
    couponCode: undefined,
    userId
  };
}

/**
 * Transform plugin system Cart back to web app CartState updates
 */
export function pluginCartToWebCart(
  pluginCart: Cart, 
  originalWebCart: WebCartState
): Partial<WebCartState> {
  const items = pluginCart.items.map((lineItem, index) => {
    const originalItem = originalWebCart.items[index];
    const transformedItem = lineItemToCartItem(lineItem);
    
    // Preserve web app specific properties
    return {
      ...transformedItem,
      image: originalItem?.image,
      slug: originalItem?.slug || '',
      inStock: originalItem?.inStock ?? true
    };
  });

  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: pluginCart.total
  };
}

/**
 * Calculate cart totals with plugin discounts
 */
export function calculateCartWithDiscounts(
  webCart: WebCartState,
  discounts: Discount[],
  userId?: string
): {
  subtotal: number;
  discountTotal: number;
  total: number;
  discounts: Discount[];
} {
  const subtotal = webCart.totalPrice;
  
  const discountTotal = discounts.reduce((sum, discount) => {
    if (discount.type === 'fixed') {
      return sum + discount.amount;
    } else if (discount.type === 'percentage') {
      return sum + (subtotal * discount.amount / 100);
    }
    return sum;
  }, 0);
  
  const total = Math.max(0, subtotal - discountTotal);
  
  return {
    subtotal,
    discountTotal,
    total,
    discounts
  };
}

/**
 * Merge discounts by type and consolidate similar discounts
 */
export function consolidateDiscounts(discounts: Discount[]): Discount[] {
  const consolidated: { [key: string]: Discount } = {};
  
  discounts.forEach(discount => {
    const key = `${discount.type}_${discount.code || 'auto'}`;
    
    if (consolidated[key]) {
      // Merge similar discounts
      consolidated[key] = {
        ...consolidated[key],
        amount: consolidated[key].amount + discount.amount,
        applicableItems: [...new Set([
          ...consolidated[key].applicableItems,
          ...discount.applicableItems
        ])]
      };
    } else {
      consolidated[key] = { ...discount };
    }
  });
  
  return Object.values(consolidated);
}

/**
 * Validate cart items for plugin compatibility
 */
export function validateCartForPlugins(webCart: WebCartState): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for required fields
  webCart.items.forEach((item, index) => {
    if (!item.id) {
      errors.push(`Cart item at index ${index} missing product ID`);
    }
    
    if (!item.variantId) {
      errors.push(`Cart item at index ${index} missing variant ID`);
    }
    
    if (!item.productName) {
      errors.push(`Cart item at index ${index} missing product name`);
    }
    
    if (item.price <= 0) {
      errors.push(`Cart item at index ${index} has invalid price: ${item.price}`);
    }
    
    if (item.quantity <= 0) {
      errors.push(`Cart item at index ${index} has invalid quantity: ${item.quantity}`);
    }
    
    if (!item.inStock) {
      warnings.push(`Cart item "${item.productName}" is out of stock`);
    }
  });
  
  // Check cart totals
  const calculatedTotal = webCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  if (Math.abs(calculatedTotal - webCart.totalPrice) > 0.01) {
    warnings.push(`Cart total mismatch: calculated ${calculatedTotal}, stored ${webCart.totalPrice}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}