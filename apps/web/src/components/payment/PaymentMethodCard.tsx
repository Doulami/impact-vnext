'use client';

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { 
  PaymentMethod, 
  getPaymentMethodConfig, 
  getPaymentMethodStyles,
  formatPaymentMethodName 
} from '@/lib/utils/payment-methods';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  isSelected: boolean;
  onSelect: (methodCode: string) => void;
  disabled?: boolean;
}

/**
 * Dynamic Payment Method Card Component
 * 
 * Renders any payment method from Vendure with appropriate styling,
 * icons, and information based on the payment method's code and type.
 */
export default function PaymentMethodCard({
  method,
  isSelected,
  onSelect,
  disabled = false
}: PaymentMethodCardProps) {
  const config = getPaymentMethodConfig(method);
  const IconComponent = config.icon;

  // Handle payment method selection
  const handleSelect = () => {
    if (!disabled && method.isEligible) {
      onSelect(method.code);
    }
  };

  return (
    <div className="space-y-2">
      {/* Payment Method Card */}
      <label 
        className={`${getPaymentMethodStyles(config.color, isSelected)} ${
          disabled || !method.isEligible ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={handleSelect}
      >
        <div className="flex items-center">
          {/* Radio Button */}
          <input
            type="radio"
            name="paymentMethod"
            value={method.code}
            checked={isSelected}
            onChange={() => handleSelect()}
            disabled={disabled || !method.isEligible}
            className="mr-4"
          />
          
          {/* Payment Method Info */}
          <div className="flex items-center flex-1">
            {/* Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              isSelected ? `bg-${config.color}-100` : 'bg-gray-100'
            }`}>
              <IconComponent className={`w-5 h-5 ${
                isSelected ? `text-${config.color}-600` : 'text-gray-600'
              }`} />
            </div>
            
            {/* Name and Description */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900">
                {formatPaymentMethodName(method.name)}
              </h3>
              <p className="text-sm text-gray-600">
                {method.description || config.instructions}
              </p>
            </div>
            
            {/* Status Indicators */}
            <div className="flex flex-col items-end space-y-1">
              {/* Eligibility Status */}
              {method.isEligible ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              
              {/* Payment Type Badge */}
              {config.requiresRedirect && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Redirect
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Selected State Details */}
        {isSelected && (
          <div className="mt-3 pl-12">
            {/* Instructions */}
            {config.instructions && (
              <div className="text-sm text-gray-700 mb-2">
                ℹ️ {config.instructions}
              </div>
            )}
            
            {/* Warning Message */}
            {config.warningMessage && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {config.warningMessage}
              </div>
            )}
            
            {/* Custom Features */}
            {config.requiresRedirect && (
              <div className="text-xs text-blue-600 mt-2">
                🔗 You will be redirected to complete payment
              </div>
            )}
            
            {config.isInstant && (
              <div className="text-xs text-green-600 mt-1">
                ⚡ Instant processing
              </div>
            )}
          </div>
        )}
      </label>
      
      {/* Eligibility Message for Disabled Methods */}
      {!method.isEligible && method.eligibilityMessage && (
        <div className="ml-12 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{method.eligibilityMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}