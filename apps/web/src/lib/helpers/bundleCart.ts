/**
 * Unified bundle add-to-cart helper
 * Ensures consistent cart item structure across all pages (PDP, Featured, Bundles, etc.)
 */

import { ApolloClient } from '@apollo/client';
import { GET_PRODUCT_BY_SLUG, GET_BUNDLE, GET_BUNDLE_AVAILABILITY } from '../graphql/queries';

export interface AddBundleToCartParams {
  slug: string;
  productId: string;
  productName: string;
  image?: string;
  quantity?: number;
  apolloClient: any;
}

export async function addBundleToCart(params: AddBundleToCartParams) {
  const { slug, productId, productName, image, quantity = 1, apolloClient } = params;
  
  try {
    // 1. Fetch shell product to get bundleId
    const { data: productData } = await apolloClient.query({
      query: GET_PRODUCT_BY_SLUG,
      variables: { slug }
    });
    
    const product = productData?.product;
    const bundleId = product?.customFields?.bundleId;
    const shellVariant = product?.variants?.[0];
    const shellVariantId = shellVariant?.id || productId;
    const priceWithTax = shellVariant?.priceWithTax || 0; // Get price WITH tax from shell variant
    
    if (!bundleId) {
      throw new Error('Bundle ID not found');
    }
    
    // 2. Fetch Bundle entity for component details
    const { data: bundleData } = await apolloClient.query({
      query: GET_BUNDLE,
      variables: { id: bundleId }
    });
    
    const bundle = bundleData?.bundle;
    
    if (!bundle) {
      throw new Error('Bundle not found');
    }
    
    // 2.5. Check bundle availability (capacity enforcement)
    const { data: availabilityData } = await apolloClient.query({
      query: GET_BUNDLE_AVAILABILITY,
      variables: { bundleId }
    });
    
    const availability = availabilityData?.bundleAvailability;
    
    if (!availability?.isAvailable) {
      throw new Error(availability?.reason || 'Bundle is not available');
    }
    
    // Validate requested quantity against maxQuantity
    if (quantity > availability.maxQuantity) {
      throw new Error(
        `Only ${availability.maxQuantity} bundle${availability.maxQuantity !== 1 ? 's' : ''} available. Requested: ${quantity}`
      );
    }
    
    // 3. Calculate component total for savings
    const componentTotal = bundle.items.reduce(
      (sum: number, item: any) => sum + (item.productVariant?.priceWithTax || 0) * item.quantity,
      0
    );
    
    // 4. Return standardized cart item
    return {
      id: productId,
      variantId: shellVariantId, // CRITICAL: Use shell product's first variant ID
      productName: productName,
      price: priceWithTax, // CRITICAL: Use priceWithTax from shell variant
      originalPrice: componentTotal,
      image: image || '/product-placeholder.svg',
      slug: slug,
      inStock: (product?.customFields?.bundleAvailability || 0) > 0,
      quantity: quantity,
      isBundle: true,
      bundleId: bundleId,
      bundleComponents: bundle.items,
      maxQuantity: availability.maxQuantity, // NEW: Store for cart UI
      availabilityStatus: availability.status
    };
  } catch (error) {
    console.error('[addBundleToCart] Error:', error);
    throw error;
  }
}
