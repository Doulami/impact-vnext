import { gql } from '@apollo/client';

// Get bundle with shell product details for visual grouping
export const GET_BUNDLE_SHELL = gql`
  query GetBundleShell($id: ID!) {
    bundle(id: $id) {
      id
      name
      slug
      assets
      shellProduct {
        id
        name
        slug
        featuredAsset {
          id
          preview
        }
      }
    }
  }
`;

// Get multiple bundles with shell product slugs
export const GET_BUNDLES_SHELL_PRODUCTS = gql`
  query GetBundlesShellProducts($ids: [String!]!) {
    bundles(options: { filter: { id: { in: $ids } } }) {
      items {
        id
        shellProduct {
          id
          slug
          featuredAsset {
            id
            preview
          }
        }
      }
    }
  }
`;
