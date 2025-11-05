'use client';

import { useCart } from '@/lib/hooks/useCart';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

export default function CartDrawer() {
  const { 
    isOpen, 
    items, 
    totalItems, 
    totalPrice, 
    closeCart, 
    updateQuantity, 
    removeItem,
    clearCart 
  } = useCart();
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  // Prevent body scroll when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in-backdrop"
        onClick={closeCart}
      />
      
      {/* Cart Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 animate-slide-in-from-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-black text-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Shopping Cart</h2>
              {totalItems > 0 && (
                <span className="bg-white text-black px-2 py-0.5 text-xs font-medium rounded-full">
                  {totalItems}
                </span>
              )}
            </div>
            <button 
              onClick={closeCart}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {items.length === 0 ? (
              // Empty Cart
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-lg mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-6">Add some products to get started</p>
                <button
                  onClick={closeCart}
                  className="bg-black text-white px-6 py-2 font-medium hover:bg-gray-800 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.variantId} className="flex gap-3 p-3 border rounded-lg">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              🏋️
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {item.productName}
                          </h4>
                          {item.variantName && (
                            <p className="text-xs text-gray-500 mb-1">
                              {item.variantName}
                            </p>
                          )}
                          <p className="font-bold text-sm">
                            ${(item.price / 100).toFixed(2)}
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border rounded">
                              <button
                                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                className="p-1 hover:bg-gray-100 transition-colors"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 py-1 text-sm min-w-[40px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                className="p-1 hover:bg-gray-100 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => setItemToRemove(item.variantId)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  {/* Clear Cart */}
                  {items.length > 0 && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-sm text-red-600 hover:text-red-800 transition-colors"
                    >
                      Clear all items
                    </button>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>${(totalPrice / 100).toFixed(2)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Link
                      href="/cart"
                      onClick={closeCart}
                      className="block w-full text-center bg-gray-200 text-gray-800 py-3 font-medium hover:bg-gray-300 transition-colors"
                    >
                      View Cart
                    </Link>
                    <button
                      onClick={() => {
                        // TODO: Implement checkout
                        alert('Checkout functionality coming soon!');
                      }}
                      className="w-full bg-black text-white py-3 font-medium hover:bg-gray-800 transition-colors"
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Clear Cart Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearCart();
        }}
        title="Clear Cart"
        message={`Are you sure you want to remove all ${totalItems} items from your cart? This action cannot be undone.`}
        confirmText="Clear Cart"
        cancelText="Keep Items"
        icon={<Trash2 className="w-6 h-6 text-red-600" />}
      />
      
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
    </>
  );
}
