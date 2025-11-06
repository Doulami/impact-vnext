'use client';

import { useEffect, useState } from 'react';
import { useCartWithPlugins } from '@/lib/hooks/useCartWithPlugins';
import { getPluginSystemStatus } from '@/lib/plugins/init-plugins';
import { bundleManager } from '@impact/bundle-plugin';
import {
  CartSummaryExtensions,
  ProductDetailsExtensions,
  CheckoutExtrasExtensions,
  BundleOpportunityBanner,
  BundleLineItemDisplay
} from '@/lib/plugins/ui-extensions';

export default function TestPluginsPage() {
  const cart = useCartWithPlugins('test-user-123');
  const [pluginStatus, setPluginStatus] = useState<any>(null);

  useEffect(() => {
    setPluginStatus(getPluginSystemStatus());
  }, []);

  const addTestItems = () => {
    // Add items that can form a bundle
    cart.addItem({
      id: 'whey-protein-isolate-2kg',
      variantId: 'whey-protein-isolate-2kg',
      productName: 'Whey Protein Isolate',
      variantName: '2kg Vanilla',
      price: 39.99,
      image: '/products/whey-protein.jpg',
      slug: 'whey-protein-isolate',
      inStock: true
    });

    cart.addItem({
      id: 'creatine-monohydrate-300g',
      variantId: 'creatine-monohydrate-300g',
      productName: 'Creatine Monohydrate',
      variantName: '300g Unflavored',
      price: 29.99,
      image: '/products/creatine.jpg',
      slug: 'creatine-monohydrate',
      inStock: true
    });

    cart.addItem({
      id: 'bcaa-complex-400g',
      variantId: 'bcaa-complex-400g',
      productName: 'BCAA Complex',
      variantName: '400g Fruit Punch',
      price: 24.99,
      image: '/products/bcaa.jpg',
      slug: 'bcaa-complex',
      inStock: true
    });
  };

  const clearCart = () => {
    cart.clearCart();
  };

  const availableBundles = bundleManager.getEnabledBundles();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Plugin System Test</h1>

      {/* Plugin Status */}
      <div className="bg-gray-100 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Plugin System Status</h2>
        {pluginStatus ? (
          <div className="space-y-2">
            <p><strong>Initialized:</strong> {pluginStatus.initialized ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Total Plugins:</strong> {pluginStatus.pluginCount}</p>
            <p><strong>Enabled Plugins:</strong> {pluginStatus.enabledCount}</p>
            <pre className="bg-gray-200 p-2 rounded text-sm">
              {JSON.stringify(pluginStatus.stats, null, 2)}
            </pre>
          </div>
        ) : (
          <p>Loading plugin status...</p>
        )}
      </div>

      {/* Available Bundles */}
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Bundles</h2>
        <div className="grid gap-4">
          {availableBundles.map(bundle => (
            <div key={bundle.id} className="bg-white p-4 rounded border">
              <h3 className="font-semibold">{bundle.name}</h3>
              <p className="text-gray-600 text-sm">{bundle.description}</p>
              <p className="font-bold text-green-600">${bundle.price}</p>
              <div className="mt-2">
                <p className="text-sm font-medium">Components:</p>
                <ul className="text-sm text-gray-600 ml-4">
                  {bundle.items.map(item => (
                    <li key={item.variantId}>
                      {item.productName} ({item.variantName}) × {item.quantity} - ${item.unitPrice}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Actions */}
      <div className="bg-white p-6 rounded-lg border mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
        <div className="space-x-4">
          <button
            onClick={addTestItems}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Bundle Components to Cart
          </button>
          <button
            onClick={clearCart}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Clear Cart
          </button>
        </div>
      </div>

      {/* Cart State with Plugin Data */}
      <div className="bg-green-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Enhanced Cart State</h2>
        <div className="space-y-4">
          <div>
            <p><strong>Items:</strong> {cart.totalItems}</p>
            <p><strong>Subtotal:</strong> ${cart.totalPrice.toFixed(2)}</p>
            <p><strong>Discounts:</strong> {cart.discounts.length}</p>
            <p><strong>Discount Total:</strong> ${cart.discountTotal.toFixed(2)}</p>
            <p><strong>Points to Earn:</strong> {cart.pointsToEarn || 0}</p>
            <p><strong>Plugins Enabled:</strong> {cart.pluginsEnabled ? '✅' : '❌'}</p>
          </div>

          {cart.pluginErrors.length > 0 && (
            <div className="bg-red-100 p-3 rounded">
              <p className="font-semibold text-red-700">Plugin Errors:</p>
              <ul className="text-sm text-red-600">
                {cart.pluginErrors.map((error, i) => <li key={i}>{error}</li>)}
              </ul>
            </div>
          )}

          {cart.pluginWarnings.length > 0 && (
            <div className="bg-yellow-100 p-3 rounded">
              <p className="font-semibold text-yellow-700">Plugin Warnings:</p>
              <ul className="text-sm text-yellow-600">
                {cart.pluginWarnings.map((warning, i) => <li key={i}>{warning}</li>)}
              </ul>
            </div>
          )}

          {cart.discounts.length > 0 && (
            <div className="bg-blue-100 p-3 rounded">
              <p className="font-semibold text-blue-700">Active Discounts:</p>
              <ul className="text-sm text-blue-600">
                {cart.discounts.map((discount, i) => (
                  <li key={i}>
                    {discount.name}: -{discount.type === 'fixed' ? '$' : ''}{discount.amount}{discount.type === 'percentage' ? '%' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bundle Opportunity Banner */}
      <BundleOpportunityBanner 
        cart={cart} 
        onAddBundle={(bundleId) => console.log('Add bundle:', bundleId)} 
      />

      {/* Cart Summary Extensions */}
      <div className="bg-white p-6 rounded-lg border mb-8">
        <h2 className="text-xl font-semibold mb-4">Cart Summary with Plugin Extensions</h2>
        <CartSummaryExtensions cart={cart} user={{ id: 'test-user-123' }} />
      </div>

      {/* Product Details Extensions */}
      <div className="bg-white p-6 rounded-lg border mb-8">
        <h2 className="text-xl font-semibold mb-4">Product Details Extensions</h2>
        <p className="text-sm text-gray-600 mb-4">Shows how bundle recommendations would appear on a product page:</p>
        <ProductDetailsExtensions 
          product={{ id: 'whey-protein-isolate-2kg', variantId: 'whey-protein-isolate-2kg' }} 
        />
      </div>

      {/* Checkout Extensions */}
      <div className="bg-white p-6 rounded-lg border mb-8">
        <h2 className="text-xl font-semibold mb-4">Checkout Extensions</h2>
        <CheckoutExtrasExtensions cart={cart} />
      </div>

      {/* Cart Items */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Cart Items</h2>
        {cart.items.length === 0 ? (
          <p className="text-gray-500">Cart is empty</p>
        ) : (
          <div className="space-y-4">
            {cart.items.map(item => (
              <div key={item.variantId} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <h3 className="font-medium">{item.productName}</h3>
                  <p className="text-sm text-gray-600">{item.variantName}</p>
                  <p className="text-sm">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                  <button
                    onClick={() => cart.removeItem(item.variantId)}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-8 bg-gray-100 p-4 rounded">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <div className="text-sm space-y-2">
          <p><strong>Plugin Stats:</strong> {JSON.stringify(cart.getPluginStats())}</p>
          <p><strong>Recent Events:</strong> {cart.getEventHistory().length} events</p>
        </div>
      </div>
    </div>
  );
}