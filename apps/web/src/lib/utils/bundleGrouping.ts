import { CartItem, BundleComponent } from '@/lib/hooks/useCart';

/**
 * Groups order lines by bundleKey to display bundles correctly
 * 
 * Order lines from Vendure have bundle metadata in customFields:
 * - bundleKey: UUID grouping all lines from same bundle instance
 * - bundleId: Bundle entity ID
 * - bundleName: Bundle name
 * - bundleComponentQty: Quantity of this component per bundle
 * 
 * Returns array of items ready for BundleCard or regular display
 */
export function groupOrderLinesByBundle(orderLines: any[]): CartItem[] {
  const bundleGroups = new Map<string, any[]>();
  const regularItems: CartItem[] = [];

  // Group lines by bundleKey
  for (const line of orderLines) {
    const bundleKey = line.customFields?.bundleKey;
    
    if (bundleKey) {
      // This is a bundle line
      if (!bundleGroups.has(bundleKey)) {
        bundleGroups.set(bundleKey, []);
      }
      bundleGroups.get(bundleKey)!.push(line);
    } else {
      // Regular product line
      regularItems.push({
        variantId: line.productVariant.id,
        productName: line.productVariant.name,
        variantName: line.productVariant.sku,
        price: line.linePriceWithTax / line.quantity, // Unit price
        quantity: line.quantity,
        image: line.featuredAsset?.preview || null,
        inStock: true,
        isBundle: false,
      });
    }
  }

  // Convert bundle groups to CartItem format
  const bundleItems: CartItem[] = [];
  
  for (const [bundleKey, lines] of bundleGroups.entries()) {
    if (lines.length === 0) continue;

    // Get bundle metadata from first line (all lines in group have same bundle metadata)
    const firstLine = lines[0];
    const bundleMetadata = firstLine.customFields;

    // Calculate total bundle price (sum of all component lines)
    const totalBundlePrice = lines.reduce((sum, line) => sum + line.linePriceWithTax, 0);
    
    // Calculate bundle quantity (how many bundles were ordered)
    // Use the first line's quantity divided by its component quantity per bundle
    const bundleQuantity = Math.floor(firstLine.quantity / (bundleMetadata?.bundleComponentQty || 1));

    // Build bundle components array
    const components: BundleComponent[] = lines
      .filter(line => !line.customFields?.isBundleHeader) // Skip header line
      .map((line, index) => ({
        id: `${bundleKey}-component-${index}`, // Unique key per component
        productVariantId: line.productVariant.id,
        quantity: line.quantity / bundleQuantity, // Actual quantity per single bundle
        displayOrder: index,
        name: line.productVariant.name,
        productVariant: {
          id: line.productVariant.id,
          name: line.productVariant.name,
          sku: line.productVariant.sku,
          price: line.linePriceWithTax / line.quantity,
        },
        unitPrice: (line.linePriceWithTax / line.quantity) / 100, // Convert to dollars
      }));

    // Create bundle CartItem
    bundleItems.push({
      variantId: `bundle-${bundleKey}`,
      productName: bundleMetadata?.bundleName || 'Bundle',
      variantName: null,
      price: totalBundlePrice / bundleQuantity, // Unit bundle price
      quantity: bundleQuantity,
      image: lines[0].featuredAsset?.preview || null,
      inStock: true,
      isBundle: true,
      bundleId: bundleMetadata?.bundleId,
      bundleComponents: components,
    });
  }

  // Return bundles first, then regular items
  return [...bundleItems, ...regularItems];
}

/**
 * Check if an order contains any bundles
 */
export function orderHasBundles(orderLines: any[]): boolean {
  return orderLines.some(line => line.customFields?.bundleKey);
}
