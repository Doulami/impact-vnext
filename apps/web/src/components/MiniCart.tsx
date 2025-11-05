'use client';

import { useCart } from '@/lib/hooks/useCart';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import Button from './Button';

export default function MiniCart() {
  const { 
    items, 
    totalItems, 
    totalPrice, 
    toggleCart,
    removeItem 
  } = useCart();
  const [isVisible, setIsVisible] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsVisible(!isVisible);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <div className="relative">
      <button onClick={handleToggle} className="relative">
        <ShoppingCart className="w-5 h-5 cursor-pointer" />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium animate-zoom-in">
            {totalItems}
          </span>
        )}
      </button>

      {/* Mini Cart Dropdown */}
      {isVisible && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleClose}
          />
          
          <div className="absolute right-0 top-full mt-2 w-80 bg-white text-black shadow-xl border border-gray-200 rounded-lg z-50 animate-slide-in-from-top">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Shopping Cart</h3>
                <span className="text-sm text-gray-600">{totalItems} items</span>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {items.slice(0, 3).map((item) => (
                <div key={item.variantId} className="flex gap-3 p-4 border-b border-gray-100 last:border-b-0">
                  {/* Product Image */}
                  <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">
                        🏋️
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">
                      {item.productName}
                    </h4>
                    {item.variantName && (
                      <p className="text-xs text-gray-600 mb-1">
                        {item.variantName}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                      <span className="font-semibold text-sm text-gray-900">
                        ${(item.price / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setItemToRemove(item.variantId);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {items.length > 3 && (
                <div className="p-4 text-center text-sm text-gray-600">
                  +{items.length - 3} more items
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-bold text-lg text-gray-900">
                  ${(totalPrice / 100).toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    handleClose();
                    toggleCart();
                  }}
                >
                  View Cart
                </Button>
                <Button
                  as="link"
                  href="/checkout"
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleClose}
                >
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Remove Item Confirmation Modal */}
      <ConfirmationModal
        isOpen={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => {
          if (itemToRemove) {
            removeItem(itemToRemove);
            setItemToRemove(null);
          }
        }}
        title="Remove Item"
        message={itemToRemove 
          ? `Remove "${items.find(item => item.variantId === itemToRemove)?.productName}" from your cart?`
          : "Remove this item from your cart?"
        }
        confirmText="Remove"
        cancelText="Keep Item"
        icon={<Trash2 className="w-6 h-6 text-red-600" />}
      />
    </div>
  );
}
