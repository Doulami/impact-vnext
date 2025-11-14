import { gql } from '@apollo/client';

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
  fragment BundleFields on Bundle {
    id
    name
    slug
    description
    status
    discountType
    fixedPrice
    percentOff
    version
    effectivePrice
    totalSavings
    validFrom
    validTo
    featuredAsset {
      id
      preview
    }
    assets {
      id
      preview
    }
    shellProductId
    shellProduct {
      id
      name
      slug
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
