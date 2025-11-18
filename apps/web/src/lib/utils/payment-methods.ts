/**
 * Payment Method Utilities
 * 
 * Utilities for detecting payment method types, capabilities, and configurations
 * to enable dynamic payment method handling in the checkout flow.
 */

import { CreditCard, Package, Banknote, Smartphone, Globe, ShoppingCart } from 'lucide-react';

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  description: string;
  isEligible: boolean;
  eligibilityMessage?: string;
}

export interface PaymentMethodConfig {
  icon: any; // Lucide icon component
  color: string;
  requiresRedirect: boolean;
  isInstant: boolean;
  customComponent?: string;
  instructions?: string;
  warningMessage?: string;
}

/**
 * Payment method type detection based on code
 */
export function getPaymentMethodType(code: string): 'card' | 'cash' | 'digital' | 'bank' | 'crypto' | 'other' {
  const lowerCode = code.toLowerCase();
  
  if (lowerCode.includes('card') || lowerCode.includes('credit') || lowerCode.includes('debit') || 
      lowerCode.includes('visa') || lowerCode.includes('mastercard') || lowerCode.includes('clictopay') ||
      lowerCode.includes('stripe') || lowerCode.includes('square')) {
    return 'card';
  }
  
  if (lowerCode.includes('cash') || lowerCode.includes('cod') || lowerCode.includes('delivery')) {
    return 'cash';
  }
  
  if (lowerCode.includes('paypal') || lowerCode.includes('apple') || lowerCode.includes('google') ||
      lowerCode.includes('samsung') || lowerCode.includes('digital')) {
    return 'digital';
  }
  
  if (lowerCode.includes('bank') || lowerCode.includes('transfer') || lowerCode.includes('wire') ||
      lowerCode.includes('ach') || lowerCode.includes('sepa')) {
    return 'bank';
  }
  
  if (lowerCode.includes('crypto') || lowerCode.includes('bitcoin') || lowerCode.includes('ethereum') ||
      lowerCode.includes('blockchain')) {
    return 'crypto';
  }
  
  return 'other';
}

/**
 * Get configuration for a payment method based on its code and type
 */
export function getPaymentMethodConfig(method: PaymentMethod): PaymentMethodConfig {
  const type = getPaymentMethodType(method.code);
  const lowerCode = method.code.toLowerCase();
  
  // Special configurations for specific payment methods
  if (lowerCode.includes('clictopay')) {
    return {
      icon: CreditCard,
      color: 'blue',
      requiresRedirect: true,
      isInstant: false,
      customComponent: 'ClicToPayButton',
      instructions: 'You will be redirected to ClicToPay\'s secure payment page',
      warningMessage: '🔒 Secure payment with 256-bit SSL encryption'
    };
  }
  
  if (lowerCode.includes('cod') || lowerCode.includes('cash')) {
    return {
      icon: Package,
      color: 'gray',
      requiresRedirect: false,
      isInstant: true,
      instructions: 'Pay when you receive your order',
      warningMessage: '💡 Our delivery agent will collect payment upon delivery. Please keep the exact amount ready.'
    };
  }
  
  if (lowerCode.includes('stripe')) {
    return {
      icon: CreditCard,
      color: 'purple',
      requiresRedirect: false,
      isInstant: true,
      customComponent: 'StripePayment'
    };
  }
  
  if (lowerCode.includes('paypal')) {
    return {
      icon: Smartphone,
      color: 'blue',
      requiresRedirect: true,
      isInstant: false,
      instructions: 'You will be redirected to PayPal'
    };
  }
  
  // Default configurations based on payment type
  switch (type) {
    case 'card':
      return {
        icon: CreditCard,
        color: 'blue',
        requiresRedirect: true,
        isInstant: false,
        instructions: 'Secure online card payment'
      };
      
    case 'cash':
      return {
        icon: Banknote,
        color: 'green',
        requiresRedirect: false,
        isInstant: true,
        instructions: 'Pay with cash'
      };
      
    case 'digital':
      return {
        icon: Smartphone,
        color: 'purple',
        requiresRedirect: true,
        isInstant: false,
        instructions: 'Digital wallet payment'
      };
      
    case 'bank':
      return {
        icon: Globe,
        color: 'indigo',
        requiresRedirect: true,
        isInstant: false,
        instructions: 'Bank transfer payment'
      };
      
    case 'crypto':
      return {
        icon: Globe,
        color: 'yellow',
        requiresRedirect: true,
        isInstant: false,
        instructions: 'Cryptocurrency payment'
      };
      
    default:
      return {
        icon: ShoppingCart,
        color: 'gray',
        requiresRedirect: false,
        isInstant: true,
        instructions: 'Complete payment'
      };
  }
}

/**
 * Check if a payment method requires special handling
 */
export function requiresCustomComponent(methodCode: string): boolean {
  const config = getPaymentMethodConfig({ code: methodCode } as PaymentMethod);
  return !!config.customComponent;
}

/**
 * Get CSS classes for payment method styling
 */
export function getPaymentMethodStyles(color: string, isSelected: boolean): string {
  const baseClasses = 'block p-4 border-2 rounded-lg cursor-pointer transition-all duration-200';
  
  const colorClasses = {
    blue: isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-200',
    purple: isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-200',
    green: isSelected ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-200',
    gray: isSelected ? 'border-gray-500 bg-gray-50' : 'border-gray-300 hover:border-gray-200',
    indigo: isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-200',
    yellow: isSelected ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 hover:border-yellow-200'
  };
  
  return `${baseClasses} ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gray}`;
}

/**
 * Format payment method name for display
 */
export function formatPaymentMethodName(name: string): string {
  // Capitalize each word and handle common abbreviations
  return name
    .replace(/\b(cod|api|ui|url)\b/gi, (match) => match.toUpperCase())
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Determine if payment method supports instant checkout
 */
export function supportsInstantCheckout(methodCode: string): boolean {
  const config = getPaymentMethodConfig({ code: methodCode } as PaymentMethod);
  return config.isInstant;
}

/**
 * Get payment instructions for a method
 */
export function getPaymentInstructions(methodCode: string): string {
  const config = getPaymentMethodConfig({ code: methodCode } as PaymentMethod);
  return config.instructions || 'Complete your payment securely';
}