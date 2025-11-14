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
        featuredAsset {
          id
          preview
        }
      }
    }
  }
`;
