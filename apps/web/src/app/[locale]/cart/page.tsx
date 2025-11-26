'use client';

import { useCart } from '@/lib/hooks/useCart';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';
import BundleCard from '@/components/BundleCard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { formatCurrency } from '@/lib/utils/locale-formatting';

export default function CartPage() {
  const t = useTranslations('cart');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  
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
            {t('continueShopping')}
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
            
            {items.length === 0 ? (
              // Empty Cart
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold mb-4">{t('empty')}</h2>
                <p className="text-gray-600 mb-8">{t('emptyDescriptionFull')}</p>
                <Link
                  href="/products"
                  className="inline-block bg-black text-white px-8 py-3 font-medium hover:bg-gray-800 transition-colors"
                >
                  {t('browseProducts')}
                </Link>
              </div>
            ) : (
              <>
                {/* Cart Header */}
                <div className="bg-white rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-100 text-sm font-medium text-gray-600 border-b">
                    <div className="col-span-6">{t('product')}</div>
                    <div className="col-span-2 text-center">{t('price')}</div>
                    <div className="col-span-2 text-center">{t('quantity')}</div>
                    <div className="col-span-2 text-center">{t('total')}</div>
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
                                {item.slug ? (
                                  <Link href={`/products/${item.slug}`}>
                                    <h3 className="font-semibold text-lg mb-1 line-clamp-2 hover:text-[var(--brand-primary)] transition-colors cursor-pointer">
                                      {item.productName}
                                    </h3>
                                  </Link>
                                ) : (
                                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                                    {item.productName}
                                  </h3>
                                )}
                                {item.variantName && (
                                  <p className="text-gray-600 text-sm mb-2">
                                    {t('variant')}: {item.variantName}
                                  </p>
                                )}
                                <button
                                  onClick={() => setItemToRemove(item.variantId)}
                                  className="text-red-500 hover:text-red-700 transition-colors text-sm flex items-center gap-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t('remove')}
                                </button>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="col-span-2 text-center">
                              <div className="font-semibold">
                                {formatCurrency(item.price / 100, locale)}
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
                                {formatCurrency((item.price * item.quantity) / 100, locale)}
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
                    {t('clearCart')}
                  </button>

                  <Link
                    href="/products"
                    className="bg-gray-200 text-gray-800 px-6 py-2 font-medium hover:bg-gray-300 transition-colors"
                  >
                    {t('continueShopping')}
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Order Summary */}
          {items.length > 0 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 sticky top-8">
                <h2 className="text-xl font-semibold mb-6">{t('orderSummary')}</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>{t('items')} ({totalItems}):</span>
                    <span>{formatCurrency(totalPrice / 100, locale)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>{t('shipping')}:</span>
                    <span className="text-green-600">{t('shippingFree')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>{t('tax')}:</span>
                    <span>{t('taxCalculated')}</span>
                  </div>
                  
                  <hr />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t('total')}:</span>
                    <span>{formatCurrency(totalPrice / 100, locale)}</span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="block w-full bg-black text-white py-4 font-medium hover:bg-gray-800 transition-colors mt-6 text-lg text-center"
                >
                  {t('proceedToCheckout')}
                </Link>

                {/* Security badges */}
                <div className="mt-6 text-center text-sm text-gray-600">
                  <p>{t('secureCheckout')}</p>
                  <p>{t('moneyBackGuarantee')}</p>
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
        title={t('modalClearTitle')}
        message={t('modalClearMessage', { count: totalItems })}
        confirmText={t('modalClearConfirm')}
        cancelText={t('modalClearCancel')}
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
        title={t('modalRemoveTitle')}
        message={itemToRemove 
          ? t('modalRemoveMessage', { name: items.find(item => item.variantId === itemToRemove)?.productName || '' })
          : t('modalRemoveMessageGeneric')
        }
        confirmText={t('modalRemoveConfirm')}
        cancelText={t('modalRemoveCancel')}
        icon={<Trash2 className="w-6 h-6 text-red-600" />}
      />
    </div>
  );
}
