/**
 * Product Language Validation Utilities
 * 
 * These functions help filter products based on language-specific data availability.
 * Products without names/descriptions in the selected language will be filtered out.
 */

export interface ProductLanguageValidation {
  hasValidName: boolean;
  hasValidDescription: boolean;
  isValidForLanguage: boolean;
}

/**
 * Check if a product has valid language-specific data
 */
export function validateProductLanguage(
  product: any,
  selectedLanguage: string
): ProductLanguageValidation {
  // Check if product name exists and is not empty
  const hasValidName = Boolean(
    product?.name && 
    typeof product.name === 'string' && 
    product.name.trim().length > 0
  );

  // Check if product description exists and is not empty (optional but preferred)
  const hasValidDescription = Boolean(
    product?.description && 
    typeof product.description === 'string' && 
    product.description.trim().length > 0
  );

  // A product is valid if it at least has a name
  // Description is optional but preferred
  const isValidForLanguage = hasValidName;

  return {
    hasValidName,
    hasValidDescription,
    isValidForLanguage
  };
}

/**
 * Filter array of products to only include those with valid language data
 */
export function filterProductsByLanguage<T extends any>(
  products: T[],
  selectedLanguage: string
): T[] {
  const filteredProducts = products.filter(product => {
    const validation = validateProductLanguage(product, selectedLanguage);
    
    // Log products that are being filtered out (for debugging)
    if (!validation.isValidForLanguage) {
      console.log(`[ProductLanguageFilter] Filtering out product without valid ${selectedLanguage} data:`, {
        productId: product?.id,
        productName: product?.name,
        hasValidName: validation.hasValidName,
        hasValidDescription: validation.hasValidDescription
      });
    }

    return validation.isValidForLanguage;
  });

  console.log(`[ProductLanguageFilter] Language: ${selectedLanguage}, Input: ${products.length}, Output: ${filteredProducts.length}`);
  
  return filteredProducts;
}

/**
 * Check if a search result has valid language data
 * Search results might have slightly different structure
 */
export function validateSearchResultLanguage(
  searchResult: any,
  selectedLanguage: string
): ProductLanguageValidation {
  // Check productName for search results
  const hasValidName = Boolean(
    searchResult?.productName && 
    typeof searchResult.productName === 'string' && 
    searchResult.productName.trim().length > 0
  );

  // Check description for search results
  const hasValidDescription = Boolean(
    searchResult?.description && 
    typeof searchResult.description === 'string' && 
    searchResult.description.trim().length > 0
  );

  const isValidForLanguage = hasValidName;

  return {
    hasValidName,
    hasValidDescription,
    isValidForLanguage
  };
}

/**
 * Filter search results by language availability
 */
export function filterSearchResultsByLanguage<T extends any>(
  searchResults: T[],
  selectedLanguage: string
): T[] {
  const filteredResults = searchResults.filter(result => {
    const validation = validateSearchResultLanguage(result, selectedLanguage);
    
    if (!validation.isValidForLanguage) {
      console.log(`[SearchResultLanguageFilter] Filtering out result without valid ${selectedLanguage} data:`, {
        productId: result?.productId,
        productName: result?.productName,
        hasValidName: validation.hasValidName,
        hasValidDescription: validation.hasValidDescription
      });
    }

    return validation.isValidForLanguage;
  });

  console.log(`[SearchResultLanguageFilter] Language: ${selectedLanguage}, Input: ${searchResults.length}, Output: ${filteredResults.length}`);
  
  return filteredResults;
}

/**
 * Check if a collection variant has valid language data
 * Collection variants have nested product structure
 */
export function validateCollectionVariantLanguage(
  variant: any,
  selectedLanguage: string
): ProductLanguageValidation {
  // Check variant name first, then product name
  const variantName = variant?.name;
  const productName = variant?.product?.name;
  
  const hasValidName = Boolean(
    (variantName && typeof variantName === 'string' && variantName.trim().length > 0) ||
    (productName && typeof productName === 'string' && productName.trim().length > 0)
  );

  // Check product description
  const hasValidDescription = Boolean(
    variant?.product?.description && 
    typeof variant.product.description === 'string' && 
    variant.product.description.trim().length > 0
  );

  const isValidForLanguage = hasValidName;

  return {
    hasValidName,
    hasValidDescription,
    isValidForLanguage
  };
}

/**
 * Filter collection variants by language availability
 */
export function filterCollectionVariantsByLanguage<T extends any>(
  variants: T[],
  selectedLanguage: string
): T[] {
  const filteredVariants = variants.filter(variant => {
    const validation = validateCollectionVariantLanguage(variant, selectedLanguage);
    
    if (!validation.isValidForLanguage) {
      console.log(`[CollectionVariantLanguageFilter] Filtering out variant without valid ${selectedLanguage} data:`, {
        variantId: variant?.id,
        variantName: variant?.name,
        productName: variant?.product?.name,
        hasValidName: validation.hasValidName,
        hasValidDescription: validation.hasValidDescription
      });
    }

    return validation.isValidForLanguage;
  });

  console.log(`[CollectionVariantLanguageFilter] Language: ${selectedLanguage}, Input: ${variants.length}, Output: ${filteredVariants.length}`);
  
  return filteredVariants;
}