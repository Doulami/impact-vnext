'use client';

import { CartItem } from '@/lib/hooks/useCart';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface BundleCardProps {
  item: CartItem;
  onUpdateQuantity?: (variantId: string, quantity: number) => void;
  onRemove?: (variantId: string) => void;
  showQuantityControls?: boolean;
  showRemoveButton?: boolean;
  showTotal?: boolean;
  compact?: boolean;
}

export default function BundleCard({
  item,
  onUpdateQuantity,
  onRemove,
  showQuantityControls = true,
  showRemoveButton = true,
  showTotal = true,
  compact = false
}: BundleCardProps) {
  if (!item.isBundle) {
    return null;
  }

  return (
    <div className={`flex gap-3 ${compact ? 'items-center' : ''}`}>
      {/* Bundle Image */}
      <div className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} bg-gray-100 rounded flex-shrink-0 overflow-hidden relative`}>
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            📦
          </div>
        )}
      </div>

      {/* Bundle Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} line-clamp-2 mb-1`}>
          {item.productName}
        </h4>
        
        {/* Bundle item count */}
        {item.bundleComponents && (
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500 mb-2`}>
            {item.bundleComponents.length} items included
          </p>
        )}
        
        {/* Price and Quantity */}
        <div className={`flex items-center gap-4 ${compact ? 'mb-2' : 'mb-3'}`}>
          <p className={`font-bold ${compact ? 'text-sm' : 'text-lg'}`}>
            ${(item.price / 100).toFixed(2)}
          </p>
          {!showQuantityControls && (
            <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
              Qty: {item.quantity}
            </span>
          )}
        </div>

        {/* Bundle Components List with fancy border design */}
        {item.bundleComponents && item.bundleComponents.length > 0 && (
          <div className={`${compact ? 'mb-2 pl-2' : 'mb-3 pl-3'} border-l-2 border-gray-200`}>
            {item.bundleComponents
              .filter(component => component.productVariant?.name || component.name)
              .map((component) => {
                const name = component.productVariant?.name || component.name || 'Component';
                const qtyPerBundle = component.quantity || 1;
                // Show TOTAL quantity (component qty × bundle qty) for better UX
                const totalQty = qtyPerBundle * item.quantity;
                return (
                  <div key={component.id} className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 py-0.5`}>
                    • {name} (x{totalQty})
                  </div>
                );
              })}
          </div>
        )}

        {/* Quantity Controls */}
        {showQuantityControls && onUpdateQuantity && (
          <div className="flex items-center justify-between">
            <div className="flex items-center border rounded">
              <button
                onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                className={`${compact ? 'p-1' : 'p-2'} hover:bg-gray-100 transition-colors`}
                disabled={item.quantity <= 1}
              >
                <Minus className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
              </button>
              <span className={`${compact ? 'px-2 py-1 text-sm min-w-[40px]' : 'px-4 py-2 min-w-[60px]'} text-center`}>
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                className={`${compact ? 'p-1' : 'p-2'} hover:bg-gray-100 transition-colors`}
              >
                <Plus className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
              </button>
            </div>

            {showRemoveButton && onRemove && (
              <button
                onClick={() => onRemove(item.variantId)}
                className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
              >
                <Trash2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                {!compact && 'Remove'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Item Total (optional) */}
      {showTotal && (
        <div className="text-right">
          <span className={`font-bold ${compact ? 'text-base' : 'text-lg'}`}>
            ${((item.price * item.quantity) / 100).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
