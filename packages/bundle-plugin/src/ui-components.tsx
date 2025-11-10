'use client';

import React, { useState } from 'react';
import { bundleManager } from './index';

/**
 * Bundle Plugin UI Components
 * 
 * Implements the UI components as specified in the Bundle Plugin documentation
 * - Cart summary with bundle opportunities and savings display
 * - Product details with bundle recommendations
 * - Checkout extras with bundle validation
 */

/**
 * Bundle Cart Summary Component
 * 
 * Displays in cart summary area - shows bundle opportunities and active bundle discounts
 */
export function BundleCartSummaryComponent({ cart, plugin }: { cart: any; plugin: any }) {
  // Get bundle opportunities from cart (added by plugin hooks)
  const opportunities = cart?.bundleOpportunities || [];
  const discounts = cart?.discounts?.filter((d: any) => d.id.startsWith('bundle-discount-')) || [];
  
  return (
    <div className="bundle-cart-summary">
      {/* Active Bundle Discounts */}
      {discounts.length > 0 && (
        <div className="bundle-savings bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center mb-2">
            <span className="text-green-600 font-medium text-sm">🎉 Bundle Savings Applied</span>
          </div>
          {discounts.map((discount: any) => (
            <div key={discount.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{discount.name}</span>
              <span className="text-green-600 font-medium">-${discount.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bundle Opportunities */}
      {opportunities.length > 0 && (
        <div className="bundle-opportunities bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center mb-2">
            <span className="text-blue-600 font-medium text-sm">💡 Bundle Opportunities</span>
          </div>
          
          {opportunities.slice(0, 1).map((opportunity: any) => (
            <div key={opportunity.bundle.id} className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-700">{opportunity.bundle.name}</span>
                <span className="text-green-600 font-medium">Save ${opportunity.potentialSavings.toFixed(2)}</span>
              </div>
              
              <div className="text-xs text-gray-600 mb-2">
                {opportunity.matches.length} of {opportunity.bundle.items.length} items in cart
              </div>
              
              {opportunity.canComplete ? (
                <div className="text-xs text-blue-600">
                  ✨ Ready to create bundle!
                </div>
              ) : (
                <div className="text-xs text-orange-600">
                  Add {opportunity.missing.length} more items to unlock savings
                </div>
              )}
            </div>
          ))}
          
          {opportunities.length > 1 && (
            <div className="text-xs text-blue-600 mt-2">
              +{opportunities.length - 1} more bundle opportunities
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Bundle Product Details Component
 * 
 * Displays on product pages - shows bundles this product is part of
 */
export function BundleProductDetailsComponent({ product, plugin }: { product: any; plugin: any }) {
  const [showAllBundles, setShowAllBundles] = useState(false);
  
  // Find bundles that include this product
  const availableBundles = bundleManager.getEnabledBundles().filter(bundle =>
    bundle.items.some(item => 
      item.variantId === product?.variantId || 
      item.variantId === product?.id
    )
  );

  if (availableBundles.length === 0) return null;

  const displayBundles = showAllBundles ? availableBundles : availableBundles.slice(0, 2);

  return (
    <div className="bundle-product-recommendations bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
        <span className="text-xl mr-2">📦</span>
        Complete Your Stack
      </h3>
      
      <p className="text-sm text-gray-600 mb-4">
        This product is part of these high-performance bundles. Save money by getting the complete stack!
      </p>

      <div className="space-y-3">
        {displayBundles.map((bundle) => {
          const componentTotal = bundle.items.reduce((sum, item) => sum + item.unitPrice, 0);
          const savings = componentTotal - bundle.price;
          
          return (
            <div key={bundle.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{bundle.name}</h4>
                  <p className="text-sm text-gray-600">{bundle.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">${bundle.price}</div>
                  <div className="text-sm text-green-600">Save ${savings.toFixed(2)}</div>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Includes:</div>
                <div className="flex flex-wrap gap-1">
                  {bundle.items.map((item, index) => (
                    <span 
                      key={index}
                      className={`px-2 py-1 rounded text-xs ${
                        item.variantId === product?.variantId || item.variantId === product?.id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.variantId === product?.variantId || item.variantId === product?.id ? '✓ ' : ''}
                      {item.productName}
                    </span>
                  ))}
                </div>
              </div>

              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 transition-colors text-sm">
                Get Complete Bundle - Save ${savings.toFixed(2)}
              </button>
            </div>
          );
        })}
      </div>

      {availableBundles.length > 2 && (
        <button
          onClick={() => setShowAllBundles(!showAllBundles)}
          className="text-blue-600 text-sm hover:text-blue-800 mt-3 underline"
        >
          {showAllBundles 
            ? 'Show Less' 
            : `View ${availableBundles.length - 2} More Bundles`
          }
        </button>
      )}
    </div>
  );
}

/**
 * Bundle Checkout Extras Component
 * 
 * Displays during checkout - validation messages and last-chance bundle offers
 */
export function BundleCheckoutExtrasComponent({ cart, order, plugin }: { cart?: any; order?: any; plugin: any }) {
  // Bundle validation messages
  const bundleLines = cart?.items?.filter((item: any) => item.bundleParent) || [];
  const bundleOpportunities = cart?.bundleOpportunities || [];
  
  // Check if there are any stock issues with bundles
  const bundleStockIssues: any[] = [];
  
  bundleLines.forEach((bundleLine: any) => {
    if (bundleLine.bundleId) {
      const validation = bundleManager.validateBundleStock(bundleLine.bundleId, bundleLine.quantity);
      if (!validation.isAvailable) {
        bundleStockIssues.push({
          bundleLine,
          validation
        });
      }
    }
  });

  return (
    <div className="bundle-checkout-extras">
      {/* Bundle Stock Validation Issues */}
      {bundleStockIssues.length > 0 && (
        <div className="bundle-stock-warning bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <span className="text-red-600 font-medium">⚠️ Bundle Stock Issues</span>
          </div>
          
          {bundleStockIssues.map(({ bundleLine, validation }) => (
            <div key={bundleLine.id} className="mb-3 last:mb-0">
              <div className="text-sm font-medium text-red-800">{bundleLine.productName}</div>
              {validation.insufficientItems.map((item: any) => (
                <div key={item.variantId} className="text-sm text-red-700 ml-2">
                  • {item.productName}: Need {item.required}, only {item.available} available
                </div>
              ))}
              <div className="text-xs text-red-600 mt-1">
                Maximum available quantity: {validation.maxAvailableQuantity}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Last Chance Bundle Opportunities */}
      {bundleOpportunities.length > 0 && bundleStockIssues.length === 0 && (
        <div className="bundle-last-chance bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <span className="text-yellow-700 font-medium">💡 Last Chance to Save</span>
          </div>
          
          <p className="text-sm text-gray-700 mb-3">
            Complete a bundle before checkout to maximize your savings!
          </p>
          
          {bundleOpportunities.slice(0, 1).map((opportunity: any) => (
            <div key={opportunity.bundle.id} className="bg-white rounded border border-yellow-100 p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium text-gray-900">{opportunity.bundle.name}</div>
                <div className="text-green-600 font-bold">Save ${opportunity.potentialSavings.toFixed(2)}</div>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                You have {opportunity.matches.length} of {opportunity.bundle.items.length} items needed
              </div>
              
              {opportunity.canComplete ? (
                <button className="w-full bg-green-600 text-white py-1.5 px-4 rounded text-sm font-medium hover:bg-green-700">
                  Create Bundle Now
                </button>
              ) : (
                <div className="text-sm text-orange-600">
                  Add {opportunity.missing.length} more items to complete bundle
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bundle Success Messages */}
      {bundleLines.length > 0 && bundleStockIssues.length === 0 && (
        <div className="bundle-checkout-success bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center text-green-700">
            <span className="mr-2">✅</span>
            <span className="text-sm font-medium">
              Bundle{bundleLines.length > 1 ? 's' : ''} ready for checkout
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Bundle User Profile Component
 * 
 * Displays in user profile/account - bundle purchase history and recommendations
 */
export function BundleUserProfileComponent({ user, plugin }: { user: any; plugin: any }) {
  const availableBundles = bundleManager.getEnabledBundles();
  
  return (
    <div className="bundle-user-profile">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <span className="text-xl mr-2">📦</span>
        Your Bundle Opportunities
      </h3>

      {/* Personalized Bundle Recommendations */}
      <div className="space-y-4">
        {availableBundles.slice(0, 3).map((bundle) => (
          <div key={bundle.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{bundle.name}</h4>
                <p className="text-sm text-gray-600">{bundle.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">${bundle.price}</div>
                <div className="text-sm text-green-600">
                  Save ${(bundle.items.reduce((sum, item) => sum + item.unitPrice, 0) - bundle.price).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-sm text-gray-700 mb-1">Perfect for your goals:</div>
              <div className="flex flex-wrap gap-1">
                {bundle.tags?.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button className="w-full bg-white border border-blue-300 text-blue-700 py-2 px-4 rounded font-medium hover:bg-blue-50 transition-colors text-sm">
              View Bundle Details
            </button>
          </div>
        ))}
      </div>

      {/* Bundle Purchase History (placeholder) */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Bundle Purchase History</h4>
        <p className="text-sm text-gray-600">
          Your bundle purchases will appear here to help us recommend better combinations for you.
        </p>
      </div>
    </div>
  );
}

// Components are exported above as named exports
// This explicit export block is removed to avoid conflicts
