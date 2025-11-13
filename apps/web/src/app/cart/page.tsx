'use client';

import { useCart } from '@/lib/hooks/useCart';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';
import BundleCard from '@/components/BundleCard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';

export default function CartPage() {
  const { 
    items, 
    totalItems, 
    totalPrice, 
    updateQuantity, 
    removeItem,
    clearCart 
  } = useCart();
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-black hover:text-gray-600 font-medium w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
            
            {items.length === 0 ? (
              // Empty Cart
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold mb-4">Your cart is empty</h2>
                <p className="text-gray-600 mb-8">Looks like you haven't added any products to your cart yet.</p>
                <Link
                  href="/products"
                  className="inline-block bg-black text-white px-8 py-3 font-medium hover:bg-gray-800 transition-colors"
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <>
                {/* Cart Header */}
                <div className="bg-white rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-100 text-sm font-medium text-gray-600 border-b">
                    <div className="col-span-6">Product</div>
                    <div className="col-span-2 text-center">Price</div>
                    <div className="col-span-2 text-center">Quantity</div>
                    <div className="col-span-2 text-center">Total</div>
                  </div>

                  {/* Cart Items */}
                  <div className="divide-y">
                    {items.map((item) => (
                      <div key={item.variantId} className="p-4">
                        {item.isBundle ? (
                          <BundleCard
                            item={item}
                            onUpdateQuantity={updateQuantity}
                            onRemove={(variantId) => setItemToRemove(variantId)}
                            showQuantityControls={true}
                            showRemoveButton={true}
                            showTotal={true}
                          />
                        ) : (
                          <div className="grid grid-cols-12 gap-4 items-center">
                            {/* Product Info */}
                            <div className="col-span-6 flex gap-4">
                              <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-3xl">
                                    🏋️
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                                  {item.productName}
                                </h3>
                                {item.variantName && (
                                  <p className="text-gray-600 text-sm mb-2">
                                    Variant: {item.variantName}
                                  </p>
                                )}
                                <button
                                  onClick={() => setItemToRemove(item.variantId)}
                                  className="text-red-500 hover:text-red-700 transition-colors text-sm flex items-center gap-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remove
                                </button>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="col-span-2 text-center">
                              <div className="font-semibold">
                                ${(item.price / 100).toFixed(2)}
                              </div>
                            </div>

                            {/* Quantity */}
                            <div className="col-span-2 flex justify-center">
                              <div className="flex items-center border rounded">
                                <button
                                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                  className="p-2 hover:bg-gray-100 transition-colors"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-4 py-2 text-center min-w-[60px]">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                  className="p-2 hover:bg-gray-100 transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Item Total */}
                            <div className="col-span-2 text-center">
                              <span className="font-bold">
                                ${((item.price * item.quantity) / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cart Actions */}
                <div className="mt-6 flex justify-between items-center">
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Cart
                  </button>

                  <Link
                    href="/products"
                    className="bg-gray-200 text-gray-800 px-6 py-2 font-medium hover:bg-gray-300 transition-colors"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Order Summary */}
          {items.length > 0 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 sticky top-8">
                <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Items ({totalItems}):</span>
                    <span>${(totalPrice / 100).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span className="text-green-600">FREE</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>Calculated at checkout</span>
                  </div>
                  
                  <hr />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${(totalPrice / 100).toFixed(2)}</span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="block w-full bg-black text-white py-4 font-medium hover:bg-gray-800 transition-colors mt-6 text-lg text-center"
                >
                  PROCEED TO CHECKOUT
                </Link>

                {/* Security badges */}
                <div className="mt-6 text-center text-sm text-gray-600">
                  <p>🔒 Secure checkout</p>
                  <p>✅ 30-day money back guarantee</p>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      
      <Footer />
      
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
          ? `Are you sure you want to remove "${items.find(item => item.variantId === itemToRemove)?.productName}" from your cart?`
          : "Are you sure you want to remove this item from your cart?"
        }
        confirmText="Remove"
        cancelText="Keep Item"
        icon={<Trash2 className="w-6 h-6 text-red-600" />}
      />
    </div>
  );
}
