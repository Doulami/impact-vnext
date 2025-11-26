import { gql } from '@apollo/client';

// ============================================================================
// REWARD POINTS QUERIES & MUTATIONS
// ============================================================================

// Get customer's reward points balance and settings
export const GET_CUSTOMER_REWARD_POINTS = gql`
  query GetCustomerRewardPoints {
    customerRewardPoints {
      id
      balance
      availablePoints
      lifetimeEarned
      lifetimeRedeemed
      createdAt
      updatedAt
    }
    rewardPointSettings {
      enabled
      minRedeemAmount
      maxRedeemPerOrder
    }
  }
`;

// Get customer's reward transaction history
export const GET_REWARD_TRANSACTION_HISTORY = gql`
  query GetRewardTransactionHistory($options: RewardTransactionListOptions) {
    rewardTransactionHistory(options: $options) {
      items {
        id
        type
        points
        orderTotal
        description
        createdAt
        order {
          id
          code
        }
      }
      totalItems
    }
  }
`;

// Redeem points mutation
export const REDEEM_POINTS = gql`
  mutation RedeemPoints($points: Int!) {
    redeemPoints(points: $points) {
      success
      message
      pointsRedeemed
      discountValue
    }
  }
`;

// Get reward points settings (public info only)
export const GET_REWARD_POINTS_SETTINGS = gql`
  query GetRewardPointSettings {
    rewardPointSettings {
      enabled
      minRedeemAmount
      maxRedeemPerOrder
    }
  }
`;

// Nutrition Batch fragment for Shop API
export const NUTRITION_BATCH_FRAGMENT = gql`
  fragment NutritionBatchFields on NutritionBatch {
    id
    batchCode
    productionDate
    expiryDate
    servingSizeValue
    servingSizeUnit
    servingLabel
    servingsPerContainer
    shortLabelDescription
    ingredientsText
    allergyAdviceText
    recommendedUseText
    storageAdviceText
    warningsText
    referenceIntakeFootnoteText
    rows {
      id
      name
      group
      unit
      valuePerServing
      valuePer100g
      referenceIntakePercentPerServing
      displayOrder
    }
  }
`;

// Product fragment for PDP
export const PRODUCT_FRAGMENT = gql`
  fragment ProductFields on Product {
    id
    name
    slug
    description
    featuredAsset {
      id
      preview
      source
    }
    variants {
      id
      name
      sku
      price
      priceWithTax
      stockLevel
      featuredAsset {
        id
        preview
      }
    }
  }
`;

// Search result fragment
export const SEARCH_RESULT_FRAGMENT = gql`
  fragment SearchResultFields on SearchResult {
    productId
    productName
    slug
    description
    productAsset {
      id
      preview
    }
    price {
      ... on SinglePrice {
        value
      }
      ... on PriceRange {
        min
        max
      }
    }
    priceWithTax {
      ... on SinglePrice {
        value
      }
      ... on PriceRange {
        min
        max
      }
    }
    facetIds
    facetValueIds
    inStock
  }
`;

// Search products with full server-side filtering and sorting
export const SEARCH_PRODUCTS = gql`
  ${SEARCH_RESULT_FRAGMENT}
  query SearchProducts($input: SearchInput!) {
    search(input: $input) {
      items {
        ...SearchResultFields
      }
      totalItems
      facetValues {
        count
        facetValue {
          id
          name
          code
          facet {
            id
            name
            code
          }
        }
      }
    }
  }
`;

// Get single product by slug (supports both products and bundle shells)
export const GET_PRODUCT_BY_SLUG = gql`
  ${NUTRITION_BATCH_FRAGMENT}
  query GetProductBySlug($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
        source
      }
      assets {
        id
        preview
        source
      }
      collections {
        id
        name
        slug
      }
      customFields {
        isBundle
        bundleId
        bundlePrice
        bundleAvailability
        bundleComponents
      }
      optionGroups {
        id
        name
        code
        options {
          id
          name
          code
        }
      }
      variants {
        id
        name
        sku
        price
        priceWithTax
        stockLevel
        featuredAsset {
          id
          preview
        }
        options {
          id
          name
          code
          groupId
        }
        currentNutritionBatch {
          ...NutritionBatchFields
        }
      }
    }
  }
`;

// Get featured products from Featured collection
export const GET_FEATURED_PRODUCTS = gql`
  query GetFeaturedProducts {
    collection(slug: "featured") {
      id
      name
      productVariants(options: { take: 20 }) {
        items {
          id
          name
          sku
          price
          priceWithTax
          featuredAsset {
            id
            preview
          }
          product {
            id
            name
            slug
            description
            facetValues {
              id
              name
              code
              facet {
                id
                name
                code
              }
            }
            featuredAsset {
              id
              preview
            }
          }
        }
      }
    }
  }
`;

// Get related products from same collection
export const GET_RELATED_PRODUCTS = gql`
  query GetRelatedProducts($collectionSlug: String!) {
    collection(slug: $collectionSlug) {
      id
      name
      productVariants(options: { take: 12 }) {
        items {
          id
          name
          sku
          price
          priceWithTax
          stockLevel
          featuredAsset {
            id
            preview
          }
          product {
            id
            name
            slug
            description
            facetValues {
              id
              name
              code
              facet {
                id
                name
                code
              }
            }
            featuredAsset {
              id
              preview
            }
          }
        }
      }
    }
  }
`;


// Get product collections (categories)
export const GET_COLLECTIONS = gql`
  query GetCollections {
    collections {
      items {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
        }
        parent {
          id
          name
        }
      }
    }
  }
`;

// Get facets for filtering
export const GET_FACETS = gql`
  query GetFacets {
    facets {
      items {
        id
        name
        code
        values {
          id
          name
          code
        }
      }
    }
  }
`;

// Bundle queries
export const BUNDLE_FRAGMENT = gql`
  ${NUTRITION_BATCH_FRAGMENT}
  fragment BundleFields on Bundle {
    id
    status
    discountType
    fixedPrice
    percentOff
    version
    effectivePrice
    totalSavings
    validFrom
    validTo
    shellProductId
    shellProduct {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
    }
    items {
      id
      productVariant {
        id
        name
        sku
        price
        priceWithTax
        featuredAsset {
          id
          preview
        }
        product {
          id
          name
          slug
          featuredAsset {
            id
            preview
          }
        }
        currentNutritionBatch {
          ...NutritionBatchFields
        }
      }
      quantity
      unitPrice
      displayOrder
    }
  }
`;

// Get all bundles for shop frontend
export const GET_BUNDLES = gql`
  ${BUNDLE_FRAGMENT}
  query GetBundles($options: BundleListOptions) {
    bundles(options: $options) {
      items {
        ...BundleFields
      }
      totalItems
    }
  }
`;

// Get single bundle by ID
export const GET_BUNDLE = gql`
  ${BUNDLE_FRAGMENT}
  query GetBundle($id: ID!) {
    bundle(id: $id) {
      ...BundleFields
    }
  }
`;

// Combined search for products and bundles
export const SEARCH_PRODUCTS_AND_BUNDLES = gql`
  ${SEARCH_RESULT_FRAGMENT}
  ${BUNDLE_FRAGMENT}
  query SearchProductsAndBundles($input: SearchInput!, $bundleOptions: BundleListOptions) {
    search(input: $input) {
      items {
        ...SearchResultFields
      }
      totalItems
      facetValues {
        count
        facetValue {
          id
          name
          code
          facet {
            id
            name
            code
          }
        }
      }
    }
    bundles(options: $bundleOptions) {
      items {
        ...BundleFields
      }
      totalItems
    }
  }
`;

// Get single collection
export const GET_COLLECTION = gql`
  ${PRODUCT_FRAGMENT}
  query GetCollection($slug: String!, $options: ProductListOptions) {
    collection(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
      productVariants(options: $options) {
        items {
          id
          product {
            ...ProductFields
          }
        }
        totalItems
      }
    }
  }
`;

// Get products with Bundle facet (for related products on bundle pages)
export const GET_BUNDLE_PRODUCTS = gql`
  query GetBundleProducts($facetValueIds: [String!]!, $take: Int) {
    search(input: {
      facetValueIds: $facetValueIds,
      take: $take,
      groupByProduct: true
    }) {
      items {
        productId
        productName
        slug
        description
        priceWithTax {
          ... on SinglePrice {
            value
          }
          ... on PriceRange {
            min
            max
          }
        }
        productAsset {
          id
          preview
        }
        inStock
      }
    }
  }
`;

// Get bundle availability for capacity enforcement
export const GET_BUNDLE_AVAILABILITY = gql`
  query GetBundleAvailability($bundleId: ID!) {
    bundleAvailability(bundleId: $bundleId) {
      isAvailable
      maxQuantity
      status
      reason
    }
  }
`;

// Get available languages from active channel
export const GET_AVAILABLE_LANGUAGES = gql`
  query GetAvailableLanguages {
    activeChannel {
      id
      code
      availableLanguageCodes
      defaultLanguageCode
    }
  }
`;

// Language metadata type
export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

// Static language metadata mapping
export const LANGUAGE_METADATA: Record<string, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr'
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr'
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl'
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr'
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr'
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    dir: 'ltr'
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    dir: 'ltr'
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    dir: 'ltr'
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr'
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    dir: 'ltr'
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    dir: 'ltr'
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    dir: 'ltr'
  }
};
