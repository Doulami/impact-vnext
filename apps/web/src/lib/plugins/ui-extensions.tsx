'use client';

import React from 'react';
import { pluginRegistry } from '@impact/plugin-system';

/**
 * Plugin UI Extension System
 * 
 * Provides injection points for plugins to render UI components
 * at specific locations in the cart, checkout, and product pages
 */

export interface UIExtensionProps {
  cart?: any;
  user?: any;
  order?: any;
  product?: any;
  [key: string]: any;
}

/**
 * Render plugin UI components for a specific extension point
 */
function renderPluginUIComponents(
  extensionPoint: keyof import('@impact/plugin-system').PluginUIComponents,
  props: UIExtensionProps
): React.ReactElement[] {
  const enabledPlugins = pluginRegistry.getEnabled();
  const components: React.ReactElement[] = [];

  enabledPlugins.forEach((plugin, index) => {
    if (plugin.ui && plugin.ui[extensionPoint]) {
      const PluginComponent = plugin.ui[extensionPoint];
      if (PluginComponent) {
        components.push(
          <div key={`${plugin.name}-${extensionPoint}-${index}`} className="plugin-ui-extension">
            <PluginComponent {...props} plugin={plugin} />
          </div>
        );
      }
    }
  });

  return components;
}

/**
 * Cart Summary Extension Point
 * 
 * Renders plugin components in the cart summary area
 * Use case: Bundle suggestions, discount displays, loyalty points
 */
export function CartSummaryExtensions(props: UIExtensionProps) {
  const components = renderPluginUIComponents('cartSummary', props);
  
  if (components.length === 0) return null;

  return (
    <div className="cart-summary-extensions space-y-4">
      {components}
    </div>
  );
}

/**
 * Product Details Extension Point
 * 
 * Renders plugin components on product detail pages
 * Use case: Bundle recommendations, reviews, wishlist buttons
 */
export function ProductDetailsExtensions(props: UIExtensionProps) {
  const components = renderPluginUIComponents('productDetails', props);
  
  if (components.length === 0) return null;

  return (
    <div className="product-details-extensions space-y-4">
      {components}
    </div>
  );
}

/**
 * Checkout Extras Extension Point
 * 
 * Renders plugin components in checkout flow
 * Use case: Bundle validation, special offers, shipping options
 */
export function CheckoutExtrasExtensions(props: UIExtensionProps) {
  const components = renderPluginUIComponents('checkoutExtras', props);
  
  if (components.length === 0) return null;

  return (
    <div className="checkout-extras-extensions space-y-4">
      {components}
    </div>
  );
}

/**
 * User Profile Extension Point
 * 
 * Renders plugin components in user profile/account pages
 * Use case: Loyalty dashboard, bundle history, preferences
 */
export function UserProfileExtensions(props: UIExtensionProps) {
  const components = renderPluginUIComponents('userProfile', props);
  
  if (components.length === 0) return null;

  return (
    <div className="user-profile-extensions space-y-4">
      {components}
    </div>
  );
}

/**
 * Bundle Opportunity Banner
 * 
 * Special component to display bundle opportunities from plugin data
 */
export function BundleOpportunityBanner({ cart, onAddBundle }: {
  cart: any;
  onAddBundle?: (bundleId: string) => void;
}) {
  // Get bundle opportunities from plugin-enhanced cart data
  const opportunities = (cart as any)?.bundleOpportunities || [];
  
  if (opportunities.length === 0) return null;

  return (
    <div className="bundle-opportunities bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200 mb-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
        <span className="text-xl mr-2">🎯</span>
        Complete Your Stack & Save
      </h3>
      
      <div className="space-y-3">
        {opportunities.slice(0, 2).map((opportunity: any, index: number) => (
          <div 
            key={opportunity.bundle.id} 
            className="bg-white p-3 rounded border border-blue-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{opportunity.bundle.name}</h4>
                <p className="text-sm text-gray-600">{opportunity.bundle.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  Save ${opportunity.potentialSavings.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  vs ${(opportunity.bundle.items.reduce((sum: number, item: any) => sum + item.unitPrice, 0)).toFixed(2)} individual
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <span className="text-green-500 mr-1">✓</span>
                You have: {opportunity.matches.length} of {opportunity.bundle.items.length} items
              </div>
              
              {opportunity.missing.length > 0 && (
                <div className="text-sm text-orange-600">
                  <span className="mr-1">⚡</span>
                  Add {opportunity.missing.length} more items to complete this bundle
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {opportunity.bundle.items.map((item: any, itemIndex: number) => {
                const hasItem = opportunity.matches.some((match: any) => match.variantId === item.variantId);
                return (
                  <span 
                    key={itemIndex}
                    className={`px-2 py-1 rounded text-xs ${
                      hasItem 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {hasItem ? '✓' : '+'} {item.productName}
                  </span>
                );
              })}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Bundle Price: <span className="font-medium">${opportunity.bundle.price}</span>
              </div>
              
              {opportunity.canComplete ? (
                <button
                  onClick={() => onAddBundle?.(opportunity.bundle.id)}
                  className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Create Bundle
                </button>
              ) : (
                <button 
                  disabled
                  className="bg-gray-300 text-gray-500 px-4 py-1.5 rounded text-sm font-medium cursor-not-allowed"
                >
                  Add Missing Items
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {opportunities.length > 2 && (
        <div className="text-center mt-3">
          <button className="text-blue-600 text-sm hover:text-blue-800 underline">
            View {opportunities.length - 2} More Bundle Opportunities
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Bundle Line Item Display
 * 
 * Displays bundle with expandable/collapsible components per documentation spec
 */
export function BundleLineItemDisplay({ 
  groupedLine, 
  onUpdateQuantity, 
  onRemoveBundle,
  isExpanded = true,
  onToggleExpansion,
  isMobile = false 
}: {
  groupedLine: any;
  onUpdateQuantity: (lineId: string, quantity: number) => void;
  onRemoveBundle: (lineId: string) => void;
  isExpanded?: boolean;
  onToggleExpansion?: () => void;
  isMobile?: boolean;
}) {
  const { parent, children } = groupedLine;

  return (
    <div className="bundle-line-item bg-white border rounded-lg p-4 mb-3">
      {/* Parent Bundle Line */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="text-blue-600 font-medium mr-2">📦 Bundle:</span>
            <h3 className="font-semibold text-gray-900">{parent.productName}</h3>
          </div>
          
          {/* Component Toggle */}
          <button
            onClick={onToggleExpansion}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center mb-2"
          >
            {isExpanded ? '▼' : '▶'} 
            <span className="ml-1">
              {children.length} components {isExpanded ? '(hide)' : '(show)'}
            </span>
          </button>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            ${(parent.unitPrice * parent.quantity).toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            ${parent.unitPrice} each
          </div>
        </div>
      </div>

      {/* Expandable Components */}
      {isExpanded && (
        <div className="bundle-components mt-3 pl-4 border-l-2 border-blue-100">
          {children.map((child: any, index: number) => (
            <div 
              key={child.id} 
              className="flex items-center justify-between py-2 text-sm border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">
                  {index === children.length - 1 ? '└─' : '├─'}
                </span>
                <span className="text-gray-700">
                  {child.productName} {child.variantName && `(${child.variantName})`} × {child.quantity}
                </span>
              </div>
              
              {(child as any).originalPrice && (
                <span className="text-gray-500 text-xs">
                  ${((child as any).originalPrice * child.quantity).toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quantity Controls and Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">Quantity:</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onUpdateQuantity(parent.id, Math.max(0, parent.quantity - 1))}
              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-600"
              disabled={parent.quantity <= 1}
            >
              −
            </button>
            <span className="w-12 text-center font-medium">{parent.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(parent.id, parent.quantity + 1)}
              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-600"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={() => onRemoveBundle(parent.id)}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Remove Bundle
        </button>
      </div>
    </div>
  );
}