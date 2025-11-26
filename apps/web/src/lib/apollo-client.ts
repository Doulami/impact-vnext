import { ApolloClient, InMemoryCache, HttpLink, from, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';

// Error handling link
const errorLink = onError((error: any) => {
  if (error.graphQLErrors) {
    error.graphQLErrors.forEach((err: any) =>
      console.error(
        `[GraphQL error]: Message: ${err.message}, Location: ${err.locations}, Path: ${err.path}`
      )
    );
  }
  if (error.networkError) {
    console.error(`[Network error]:`, error.networkError);
  }
});

// HTTP link to Vendure Shop API
const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api',
  credentials: 'include', // Important for session cookies
});

// Language context link - adds languageCode header
let currentLanguage = 'en'; // Default language

export function setApolloLanguage(lang: string) {
  console.log('[Apollo] Setting language to:', lang);
  currentLanguage = lang;
}

const languageLink = setContext((_, { headers }) => {
  console.log('[Apollo] Language link - sending headers:', {
    currentLanguage,
    'Accept-Language': currentLanguage
  });
  
  return {
    headers: {
      ...headers,
      // Try Accept-Language header which is more standard
      'Accept-Language': currentLanguage,
      // Also try the vendure-language-code header as backup
      'vendure-language-code': currentLanguage,
    }
  };
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, languageLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Pagination handling for product lists
          products: {
            keyArgs: false,
            merge(existing = { items: [] }, incoming) {
              return {
                ...incoming,
                items: [...existing.items, ...incoming.items],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

// Server-side Apollo Client (no caching for SSR)
export function getServerApolloClient() {
  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache(),
    ssrMode: true,
  });
}
