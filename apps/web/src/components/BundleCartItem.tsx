'use client';

import { CartItem, BundleComponent } from '@/lib/hooks/useCart';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Package, Minus, Plus, Trash2 } from 'lucide-react';

interface BundleCartItemProps {
  item: CartItem;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  showQuantityControls?: boolean;
  compact?: boolean;
}

export default function BundleCartItem({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  showQuantityControls = true,
  compact = false 
}: BundleCartItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!item.isBundle || !item.bundleComponents) {
    return null;
  }

  const savings = item.originalPrice && item.price < item.originalPrice 
    ? item.originalPrice - item.price 
    : 0;

  return (
    <div className="space-y-3">
      {/* Bundle Header */}
      <div className={`flex gap-4 ${compact ? 'items-center' : 'items-start'}`}>
        {/* Bundle Image */}
        <div className={`${compact ? 'w-12 h-12' : 'w-20 h-20'} bg-gray-100 rounded overflow-hidden flex-shrink-0 relative`}>
          {item.image ? (
            <img 
              src={item.image} 
              alt={item.productName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              📦
            </div>
          )}
          {/* Bundle Badge */}
          <div className="absolute top-1 left-1 bg-[var(--brand-primary)] text-white px-1 py-0.5 rounded text-xs font-medium flex items-center gap-1">
            <Package className="w-2 h-2" />
            {!compact && 'Bundle'}
          </div>
        </div>

        {/* Bundle Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} mb-1 line-clamp-2 flex items-center gap-2`}>
            {item.productName}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 transition-colors"
              title={isExpanded ? 'Hide components' : 'Show components'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </h3>
          
          {/* Bundle Details */}
          <div className="space-y-1">
            <p className="text-gray-600 text-sm">
              {item.bundleComponents.length} items included
            </p>
            
            {savings > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[var(--success)] font-semibold text-base">
                  Save ${(savings / 100).toFixed(2)}
                </span>
                <span className="text-[var(--success)] text-xs">bundle discount</span>
              </div>
            )}
            
            {!compact && showQuantityControls && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-600">Qty:</span>
                <div className="flex items-center border rounded">
                  <button
                    onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                    className="p-1 hover:bg-gray-100 transition-colors"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2 py-1 text-sm min-w-[40px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                    className="p-1 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price and Actions */}
        <div className="text-right space-y-2">
          <div>
            <div className="font-bold text-lg">
              ${(item.price / 100).toFixed(2)}
            </div>
            {savings > 0 && (
              <div className="text-gray-400 line-through text-sm mt-1">
                ${(item.originalPrice! / 100).toFixed(2)}
              </div>
            )}
            {compact && (
              <div className="text-xs text-gray-600">Qty: {item.quantity}</div>
            )}
          </div>
          
          <button
            onClick={() => onRemove(item.variantId)}
            className={`text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}
          >
            <Trash2 className="w-3 h-3" />
            {!compact && 'Remove'}
          </button>
        </div>
      </div>

      {/* Expandable Components */}
      {isExpanded && (
        <div className="ml-6 pl-4 border-l-2 border-gray-200 space-y-2">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Bundle Contents:</h4>
          {[...item.bundleComponents]
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
            .map((component) => (
            <div key={component.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <img
                  src="/product-placeholder.svg"
                  alt={component.productVariant?.name || component.name || 'Component'}
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {component.productVariant?.name || component.name || 'Component'}
                </div>
                <div className="text-gray-600 text-xs">
                  SKU: {component.productVariant?.sku || 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">${(component.unitPrice || 0).toFixed(2)}</div>
                <div className="text-xs text-gray-600">Qty: {component.quantity}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}